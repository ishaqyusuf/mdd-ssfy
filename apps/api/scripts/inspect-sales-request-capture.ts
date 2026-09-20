import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@gnd/db";
import { newSalesFormSeedV2Schema } from "@gnd/sales/sales-form-core";
import { createAssistantSalesRequestPreviewDependencies } from "../src/assistant/order-drafts";
import { validateNewSalesFormSeedConfiguration } from "../src/services/sales-request-generation";
import { normalizeSalesRequestProviderEnvelope } from "../src/services/sales-request-provider-envelope";
import { safeConfigurationIssue, safeRouteFailureKind } from "../src/services/sales-request-provider";

const [caseName, conversationId] = process.argv.slice(2);
if (!caseName || !/^[a-z0-9-]{3,60}$/.test(caseName) ||
	!conversationId || !/^cm[a-z0-9]{10,}$/i.test(conversationId))
	throw new Error("Usage: inspect-sales-request-capture <case-name> <conversation-id>");

const session = await db.assistantSalesRequestSession.findUnique({
	where: { conversationId },
	select: { ownerUserId: true, scopeType: true, scopeId: true, saleType: true, sourceText: true },
});
if (!session || !["order", "quote"].includes(session.saleType))
	throw new Error("Sales Request chat unavailable.");
const dependencies = createAssistantSalesRequestPreviewDependencies({
	userId: session.ownerUserId,
	scopeType: session.scopeType,
	scopeId: session.scopeId,
	grants: {},
}, { type: session.saleType as "order" | "quote" });
await dependencies.authorize();
const snapshot = await dependencies.readSnapshot();
const capture = JSON.parse(await readFile(join(
	process.cwd(), "../../.brain/evaluations/sales-request-generation/captures",
	`${caseName}-local.json`,
), "utf8")) as { configurationRevision: string; captures: Array<{ text: string | null }> };
if (capture.configurationRevision !== snapshot.revision)
	throw new Error("Published configuration changed since the capture.");
const configuration = JSON.parse(snapshot.configurationJson) as {
	routes?: Array<{ rootStepId: number }>;
	steps: Array<{ id: number; title?: string; selectionMode?: string; components?: Array<[string, string]> }>;
};
const multipleStepIds = new Set(configuration.steps
	.filter((step) => step.selectionMode === "multiple").map((step) => step.id));
const heightStep = configuration.steps.find((step) =>
	step.title?.trim().toLowerCase() === "height");
const eightyInchUid = heightStep?.components?.find(
	([, title]) => title.trim() === "6-8")?.[0];
for (const [index, response] of capture.captures.entries()) {
	let result: unknown;
	let rawShape: Record<string, number> = {};
	try {
		result = JSON.parse(response.text ?? "");
		const rawLines = result && typeof result === "object" && "lineItems" in result &&
			Array.isArray(result.lineItems) ? result.lineItems : [];
		const zeroLineShape = rawLines.filter((line): line is Record<string, unknown> =>
			line !== null && typeof line === "object" && !Array.isArray(line) && line.qty === 0)
			.map((line) => ({
				hpt: line.housePackageTool !== null && typeof line.housePackageTool === "object" &&
					"doors" in line.housePackageTool && Array.isArray(line.housePackageTool.doors) &&
					line.housePackageTool.doors.length > 0,
				hasSelection: Array.isArray(line.formSteps) && line.formSteps.length > 0,
				hasLineReview: typeof line.uid === "string" && result && typeof result === "object" &&
					"unresolved" in result && Array.isArray(result.unresolved) &&
					result.unresolved.some((entry: unknown) => entry !== null &&
						typeof entry === "object" && "lineUid" in entry && entry.lineUid === line.uid),
			}));
		rawShape = {
			zeroQtyCount: zeroLineShape.length,
			zeroQtyWithHpt: zeroLineShape.filter((line) => line.hpt).length,
			zeroQtyWithSelection: zeroLineShape.filter((line) => line.hasSelection).length,
			zeroQtyWithLineReview: zeroLineShape.filter((line) => line.hasLineReview).length,
		};
		const parsed = newSalesFormSeedV2Schema.safeParse(
			normalizeSalesRequestProviderEnvelope(result, multipleStepIds,
				heightStep && eightyInchUid
					? { sourceText: session.sourceText, heightStepId: heightStep.id, eightyInchUid }
					: undefined,
				new Set(configuration.routes?.map((route) => route.rootStepId)),
			),
		);
		if (!parsed.success) {
			console.log(JSON.stringify({
				attempt: index + 1,
				stage: "schema",
				issueCount: parsed.error.issues.length,
				...rawShape,
			}));
			continue;
		}
		const validated = validateNewSalesFormSeedConfiguration(
			parsed.data, snapshot.configurationJson, session.sourceText,
		);
		const roomCoverage = caseName.startsWith("townhouse-")
			? session.sourceText.split(/\r?\n/).map((row) => row.trim())
				.filter((row) => /^[^:\n]{3,80}\s+-\s*(?:\d{2,3}\s*["”']?\s*[x×]|$)/i.test(row))
				.map((row, ordinal) => {
					const room = row.split(/\s+-\s*/)[0]?.trim() ?? "";
					const size = row.match(/\b(\d{2,3})\s*["”']?\s*[x×]\s*(\d{2,3})/i);
					const key = size ? `${Number(size[1])}:${Number(size[2])}` : null;
					const nativeMatched = key !== null && validated.lineItems.some((line) =>
						(line.uid.toLowerCase().replace(/[^a-z0-9]/g, "") === room.toLowerCase().replace(/[^a-z0-9]/g, "") ||
							validated.interpretations?.some((entry) => entry.lineUid === line.uid &&
								entry.sourceText.toLowerCase().includes(room.toLowerCase()))) &&
						line.housePackageTool?.doors.some((door) => {
							const parts = door.dimension.split(/\s*[x×]\s*/);
							const inches = parts.map((part) => {
								const architectural = part?.match(/^(\d+)[-/](\d+)$/);
							return architectural ? Number(architectural[1]) * 12 + Number(architectural[2]) : Number(part);
							});
							return `${inches[0]}:${inches[1]}` === key;
						}));
					const reviewMatched = validated.unresolved.some((entry) =>
						entry.reason.toLowerCase().includes(room.toLowerCase()));
					return { ordinal: ordinal + 1, hasStatedSize: !!size,
						ambiguousUnit: /\b\d{2,3}'\s*[x×]/.test(row),
						nativeMatched, reviewMatched };
				}) : undefined;
		console.log(JSON.stringify({ attempt: index + 1, stage: "valid",
			...rawShape,
			nativeLineCount: validated.lineItems.length,
			configuredDoorRowCount: validated.lineItems.reduce((count, line) =>
				count + (line.housePackageTool?.doors.length ?? 0), 0),
			configuredDoorQty: validated.lineItems.reduce((count, line) =>
				count + (line.housePackageTool?.doors ?? []).reduce((total, door) =>
					total + ("totalQty" in door ? door.totalQty : door.lhQty + door.rhQty), 0), 0),
			reviewCount: validated.unresolved.length,
			...(roomCoverage ? { roomLedger: {
				rowCount: roomCoverage.length,
				statedSizeCount: roomCoverage.filter((row) => row.hasStatedSize).length,
				nativeOrdinals: roomCoverage.filter((row) => row.nativeMatched).map((row) => row.ordinal),
				reviewOnlyOrdinals: roomCoverage.filter((row) => !row.nativeMatched && row.reviewMatched)
					.map((row) => row.ordinal),
				unmappedOrdinals: roomCoverage.filter((row) => !row.nativeMatched && !row.reviewMatched)
					.map((row) => row.ordinal),
				ambiguousUnitOrdinals: roomCoverage.filter((row) => row.ambiguousUnit)
					.map((row) => row.ordinal),
			} } : {}),
			...(caseName.startsWith("carrara-") ? { countedAccessories: Object.fromEntries(
				["doorstop", "baseboard", "casing", "crown"].map((kind) => [kind,
					validated.lineItems.filter((line) => line.uid.toLowerCase().includes(kind))
						.reduce((count, line) => count + line.qty, 0)]),
			) } : {}),
			bareWidthReviewCount: validated.unresolved.filter((item) =>
				item.status === "ambiguous" &&
				/^(?:door)?(?:width|size|dimension)$/.test(item.field.toLowerCase().replace(/[^a-z]/g, "")) &&
				item.reason.includes("28 8/0")).length,
		}));
	} catch (error) {
		const message = error instanceof Error ? error.message : "";
		const hptShapeOrdinal = message.match(/^Line line-(?:[a-z]+-)?(\d+)(?:-[a-z]+)? uses the wrong HPT quantity shape for its configured route\.$/i)?.[1];
		const componentOrdinal = message.match(/^Line line-(?:[a-z]+-)?(\d+)(?:-[a-z]+)? references an unavailable component for step \d+\.$/i)?.[1];
		const componentLineKind = message.match(/^Line line-(baseboard|casing|crown|doorstop|hardware-pocket) references an unavailable component for step \d+\.$/i)?.[1];
		const mouldingQuantity = message.match(/^Moulding quantity (\d+) must be stated in the customer request\.$/i)?.[1];
		const routeFailureKind = safeRouteFailureKind(message);
		const site = error instanceof Error
			? error.stack?.match(/\/apps\/api\/src\/([a-z0-9/.-]+\.ts):(\d+):\d+/i)
			: null;
		console.log(JSON.stringify({
			attempt: index + 1,
			stage: "configuration",
			...rawShape,
			category: safeConfigurationIssue(message),
			...(hptShapeOrdinal ? { hptShapeOrdinal: Number(hptShapeOrdinal) } : {}),
			...(componentOrdinal ? { componentOrdinal: Number(componentOrdinal) } : {}),
			...(componentLineKind ? { componentLineKind } : {}),
			...(mouldingQuantity ? { mouldingQuantity: Number(mouldingQuantity) } : {}),
			...(routeFailureKind ? { routeFailureKind } : {}),
			...(site ? { site: `${site[1]}:${site[2]}` } : {}),
		}));
	}
}
await db.$disconnect();
