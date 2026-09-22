import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@gnd/db";
import { newSalesFormSeedV2Schema } from "@gnd/sales/sales-form-core";
import { createAssistantSalesRequestPreviewDependencies } from "../src/assistant/order-drafts";
import { verifySalesRequestCorpusSeedCompatibility } from "../src/services/request-generation/evaluation/corpus";
import { projectSalesRequestPartialNativeSeed } from "../src/services/request-generation/native-compatibility";
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
	routes?: Array<{ rootStepId: number; itemTypeUid: string; stepUids: string[] }>;
	steps: Array<{ id: number; title?: string; selectionMode?: string; components?: Array<[string, string]> }>;
};
const multipleStepIds = new Set(configuration.steps
	.filter((step) => step.selectionMode === "multiple").map((step) => step.id));
const heightStep = configuration.steps.find((step) =>
	step.title?.trim().toLowerCase() === "height");
const eightyInchUid = heightStep?.components?.find(
	([, title]) => title.trim() === "6-8")?.[0];

// This is an occurrence ledger, not a product oracle. Keep source/provider wording
// and catalog identifiers inside this process; only ordinal counts leave it.
function carraraDoorLedger(
	sourceText: string,
	seed: ReturnType<typeof validateNewSalesFormSeedConfiguration>,
) {
	const rows = sourceText.split(/\r?\n/).map((row) => row.trim()).filter((row) =>
		/^(?:(?:bifold|pocket)\s+)?(?:[1-9][-/](?:1[01]|\d)|\d{2})\s+[1-9][-/](?:1[01]|\d)\b/i.test(row));
	const size = (value: string) => {
		const match = value.match(/\b([1-9])[-/](1[01]|\d)\s*(?:x|×|\s)\s*([1-9])[-/](1[01]|\d)\b/i);
		return match ? `${Number(match[1]) * 12 + Number(match[2])}:${Number(match[3]) * 12 + Number(match[4])}` : null;
	};
	const ordinal = (uid: string) => {
		const match = uid.match(/^line-(?:[a-z]+-)?(\d+)(?:-[a-z]+)?$/i);
		return match ? Number(match[1]) : null;
	};
	const usedReviews = new Set<number>();
	const allocatedLines = new Set<string>();
	const ledger = rows.map((row, index) => {
		const sourceOrdinal = index + 1;
		const sourceSize = /^\d{2,3}\s+[1-9][-/]/.test(row) ? null : size(row);
		const lines = seed.lineItems.filter((line) => ordinal(line.uid) === sourceOrdinal &&
			(line.housePackageTool?.doors.length ?? 0) > 0);
		const units = lines.flatMap((line) => (line.housePackageTool?.doors ?? [])
			.map((door) => ({ lineUid: line.uid, size: size(door.dimension),
				qty: "totalQty" in door ? door.totalQty : door.lhQty + door.rhQty })));
		const exactUnit = sourceSize !== null && units.length === 1 &&
			units[0]?.size === sourceSize && units[0]?.qty === 1 &&
			!allocatedLines.has(units[0].lineUid);
		if (exactUnit && units[0]) allocatedLines.add(units[0].lineUid);
		// Reviews with identical quoted rows are consumed in source order, once each.
		// Other reviews remain unallocated instead of being used for several rows.
		const reviewIndex = seed.unresolved.findIndex((review, candidate) =>
			!usedReviews.has(candidate) &&
			review.reason.toLowerCase().includes(row.toLowerCase()));
		if (reviewIndex >= 0) usedReviews.add(reviewIndex);
		const configuredNativeUnits = exactUnit ? 1 : 0;
		const distinctReviewNotes = reviewIndex >= 0 ? 1 : 0;
		const nativeConflict = units.length === 1 && !exactUnit;
		const nativeProvenanceAmbiguous = units.length > 1;
		return {
			ordinal: sourceOrdinal, configuredNativeUnits, distinctReviewNotes,
			nativeConflict, nativeProvenanceAmbiguous, productIdentityAudited: false,
			status: nativeConflict ? "conflict" : nativeProvenanceAmbiguous
				? "provenance-ambiguous" : configuredNativeUnits && distinctReviewNotes
				? "mixed-needs-audit" : configuredNativeUnits ? "native-needs-audit"
					: distinctReviewNotes ? "review-only" : "unmapped",
		};
	});
	const allocatedNativeUnits = ledger.reduce((sum, row) => sum + row.configuredNativeUnits, 0);
	const totalNativeUnits = seed.lineItems.reduce((sum, line) => sum +
		(line.housePackageTool?.doors ?? []).reduce((doorSum, door) => doorSum +
			("totalQty" in door ? door.totalQty : door.lhQty + door.rhQty), 0), 0);
	return {
		rows: ledger,
		allocatedNativeUnits,
		unallocatedNativeUnits: totalNativeUnits - allocatedNativeUnits,
		unallocatedReviewNotes: seed.unresolved.length - usedReviews.size,
		unmappedOrdinals: ledger.filter((row) => row.status === "unmapped").map((row) => row.ordinal),
		conflictOrdinals: ledger.filter((row) => row.nativeConflict).map((row) => row.ordinal),
	};
}
for (const [index, response] of capture.captures.entries()) {
	let result: unknown;
	let rawShape: Record<string, number> = {};
	let mouldingEvidence: Record<string, number> | undefined;
	let linePositionByUid = new Map<string, number>();
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
		linePositionByUid = new Map(parsed.data.lineItems.map((line, position) =>
			[line.uid, position + 1]));
		if (caseName.startsWith("duplex-")) {
			const normalized = (value: string) => value.normalize("NFKC").trim().toLowerCase()
				.replace(/\s+/g, " ");
			const originalRows = session.sourceText.split(/\r?\n/).map(normalized);
			const counts = { selectedRows: 0, interpretedRows: 0,
				uniqueExactRows: 0, repeatedExactRows: 0, unmatchedExactRows: 0,
				mouldingRootLines: 0, baseboardTitleRows: 0, boardTitleRows: 0,
				otherTitleRows: 0, statedTitleRows: 0,
				leftHeadingCount: originalRows.filter((row) => /^left\s+side$/.test(row)).length,
				rightHeadingCount: originalRows.filter((row) => /^right\s+side$/.test(row)).length,
				baseboardSourceRows: originalRows.filter((row) => /^\d+\s*(?:lf|linear\s+feet)\s+(?:for\s+)?baseboard\s*$/.test(row)).length,
				boardSourceRows: originalRows.filter((row) => /^\d+\s*=\s*12\s*(?:["”]|inches?\b|in\b)\s*boards?\s*$/.test(row)).length };
			for (const line of parsed.data.lineItems) {
				const route = configuration.routes?.find((candidate) => line.formSteps.some((selection) =>
					"prodUid" in selection && selection.stepId === candidate.rootStepId &&
					selection.prodUid === candidate.itemTypeUid));
				const rootTitle = configuration.steps.find((step) => step.id === route?.rootStepId)
					?.components?.find(([uid]) => uid === route?.itemTypeUid)?.[1] ?? "";
				if (/^(?:MOULDING|MOLDING)S?$/i.test(rootTitle.trim()) && line.meta?.mouldingRows?.length)
					counts.mouldingRootLines++;
				for (const row of line.meta?.mouldingRows ?? []) {
					counts.selectedRows++;
					const title = configuration.steps.flatMap((step) => step.components ?? [])
						.find(([uid]) => uid === row.uid)?.[1] ?? "";
					if (/\bbaseboard\b/i.test(title)) counts.baseboardTitleRows++;
					else if (/\bboards?\b/i.test(title)) counts.boardTitleRows++;
					else counts.otherTitleRows++;
					if (session.sourceText.toLowerCase().includes(title.toLowerCase())) counts.statedTitleRows++;
					const quoted = parsed.data.interpretations?.filter((item) =>
						item.lineUid === line.uid && item.selectedProdUid === row.uid) ?? [];
					if (!quoted.length) continue;
					counts.interpretedRows++;
					const matches = quoted.flatMap((item) => originalRows.filter((original) =>
						original === normalized(item.sourceText))).length;
					if (matches === 1) counts.uniqueExactRows++;
					else if (matches > 1) counts.repeatedExactRows++;
					else counts.unmatchedExactRows++;
				}
			}
			mouldingEvidence = counts;
		}
		const validated = validateNewSalesFormSeedConfiguration(
			parsed.data, snapshot.configurationJson, session.sourceText,
		);
		const nativeSeed = projectSalesRequestPartialNativeSeed(
			validated, session.sourceText, snapshot.configurationJson);
		const nativeCompatibility = /^(?:townhouse|carrara|fire-rated|exterior-impact)-/.test(caseName)
			? await verifySalesRequestCorpusSeedCompatibility(nativeSeed, snapshot.configurationJson)
			: null;
		const roomCoverage = caseName.startsWith("townhouse-")
			? session.sourceText.split(/\r?\n/).map((row) => row.trim())
				.filter((row) => /^[^:\n]{3,80}\s+-\s*(?:\d{2,3}\s*["”']?\s*[x×]|$)/i.test(row))
				.map((row, ordinal) => {
					const room = row.split(/\s+-\s*/)[0]?.trim() ?? "";
					const size = row.match(/\b(\d{2,3})\s*["”']?\s*[x×]\s*(\d{2,3})/i);
					const key = size ? `${Number(size[1])}:${Number(size[2])}` : null;
					const nativeMatched = key !== null && nativeSeed.lineItems.some((line) =>
						(line.uid.toLowerCase().replace(/[^a-z0-9]/g, "") === room.toLowerCase().replace(/[^a-z0-9]/g, "") ||
							nativeSeed.interpretations?.some((entry) => entry.lineUid === line.uid &&
								entry.sourceText.toLowerCase().includes(room.toLowerCase()))) &&
						line.housePackageTool?.doors.some((door) => {
							const parts = door.dimension.split(/\s*[x×]\s*/);
							const inches = parts.map((part) => {
								const architectural = part?.match(/^(\d+)[-/](\d+)$/);
							return architectural ? Number(architectural[1]) * 12 + Number(architectural[2]) : Number(part);
							});
							return `${inches[0]}:${inches[1]}` === key;
						}));
					const reviewMatched = nativeSeed.unresolved.some((entry) =>
						entry.reason.toLowerCase().includes(room.toLowerCase()));
					return { ordinal: ordinal + 1, hasStatedSize: !!size,
						ambiguousUnit: /\b\d{2,3}'\s*[x×]/.test(row),
						nativeMatched, reviewMatched };
				}) : undefined;
		const exteriorLedger = caseName.startsWith("exterior-impact-") ? {
			lines: nativeSeed.lineItems.map((line) => {
				const selections = line.formSteps.flatMap((selection) => {
					const step = configuration.steps.find((candidate) => candidate.id === selection.stepId);
					if (!step) return [];
					const uids = "prodUid" in selection ? [selection.prodUid]
						: "meta" in selection ? selection.meta.selectedProdUids : [];
					return uids.map((uid) => ({ step: step.title ?? "unknown",
						title: step.components?.find(([candidate]) => candidate === uid)?.[1] ?? "" }));
				});
				return { qty: line.qty, route: selections.find((entry) =>
					/^(?:exterior|mouldings?|services)$/i.test(entry.title.trim()))?.title ?? "other",
					selectedDoorCount: selections.filter((entry) => /^(?:door|doors)$/i.test(entry.step)).length,
					selectedDoorTitles: selections.filter((entry) => /^(?:door|doors)$/i.test(entry.step))
						.map((entry) => entry.title.slice(0, 120)),
					selectedHeightCount: selections.filter((entry) => /^height$/i.test(entry.step)).length,
					selectedImpactPanel: selections.some((entry) =>
						/6PNL|SIX PANEL/i.test(entry.title) && /IMPACT/i.test(entry.title)),
					lineReviewCount: nativeSeed.unresolved.filter((item) => item.lineUid === line.uid).length };
			}),
			reviewCoverage: Object.fromEntries([
				["sidelite", /sideli(?:te|ght)/i], ["pvc-frame", /PVC.{0,45}(?:frame|jamb)|(?:frame|jamb).{0,45}PVC/i],
				["brick-moulding", /brick\s*mould|brick\s*mold/i], ["overall-size", /69\s*[-/]\s*5\/8|overall.{0,40}80/i],
				["panel-width", /36\s*(?:["”]|inch)/i], ["rh-outswing", /right.{0,30}out|RH.{0,30}out/i],
			].map(([fact, pattern]) => [fact, nativeSeed.unresolved.filter((item) =>
				(pattern as RegExp).test(item.reason)).length])),
		} : undefined;
		console.log(JSON.stringify({ attempt: index + 1, stage: "valid",
			...rawShape,
			...(mouldingEvidence ? { mouldingEvidence } : {}),
			...(nativeCompatibility ? { nativeCompatibility: {
				initializer: nativeCompatibility.initializer,
				saveReopen: nativeCompatibility.saveReopen,
				issueCount: nativeCompatibility.issues.length,
				issueKinds: nativeCompatibility.issues.map((issue) => issue.split(":")[0]),
			} } : {}),
			generatedLineCount: validated.lineItems.length,
			nativeLineCount: nativeSeed.lineItems.length,
			omittedLineCount: validated.lineItems.length - nativeSeed.lineItems.length,
			nativeHptLineCount: nativeSeed.lineItems.filter((line) =>
				(line.housePackageTool?.doors.length ?? 0) > 0).length,
			nativeNonHptQty: nativeSeed.lineItems.filter((line) =>
				!(line.housePackageTool?.doors.length ?? 0)).reduce((sum, line) => sum + line.qty, 0),
			generatedDoorQty: validated.lineItems.reduce((count, line) =>
				count + (line.housePackageTool?.doors ?? []).reduce((total, door) =>
					total + ("totalQty" in door ? door.totalQty : door.lhQty + door.rhQty), 0), 0),
			configuredDoorRowCount: nativeSeed.lineItems.reduce((count, line) =>
				count + (line.housePackageTool?.doors.length ?? 0), 0),
			configuredDoorQty: nativeSeed.lineItems.reduce((count, line) =>
				count + (line.housePackageTool?.doors ?? []).reduce((total, door) =>
					total + ("totalQty" in door ? door.totalQty : door.lhQty + door.rhQty), 0), 0),
			generatedReviewCount: validated.unresolved.length,
			reviewCount: nativeSeed.unresolved.length,
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
			...(exteriorLedger ? { exteriorLedger } : {}),
			...(caseName.startsWith("carrara-") ? {
				generatedDoorLedger: carraraDoorLedger(session.sourceText, validated),
				doorLedger: carraraDoorLedger(session.sourceText, nativeSeed),
			} : {}),
			...(caseName.startsWith("carrara-") ? { countedAccessories: Object.fromEntries(
				["doorstop", "baseboard", "casing", "crown"].map((kind) => [kind,
					nativeSeed.lineItems.filter((line) => line.uid.toLowerCase().includes(kind))
						.reduce((count, line) => count + line.qty, 0)]),
			) } : {}),
			...(caseName.startsWith("carrara-") ? { accessorySelections:
				nativeSeed.lineItems.filter((line) => /doorstop|baseboard|casing|crown/i.test(line.uid))
					.map((line) => ({ kind: /doorstop|baseboard|casing|crown/i.exec(line.uid)?.[0] ?? "other",
						qty: line.qty,
						products: line.formSteps.flatMap((selection) => {
							const step = configuration.steps.find((candidate) => candidate.id === selection.stepId);
							if (step?.title?.trim().toLowerCase() !== "moulding") return [];
							const uids = "prodUid" in selection ? [selection.prodUid]
								: "meta" in selection ? selection.meta.selectedProdUids : [];
							return uids.map((uid) => step.components?.find(([candidate]) => candidate === uid)?.[1] ?? "unknown");
						}),
						sourceQuoteCount: nativeSeed.interpretations?.filter((entry) => entry.lineUid === line.uid).length ?? 0,
						lineReviewCount: nativeSeed.unresolved.filter((entry) => entry.lineUid === line.uid).length,
					})) } : {}),
			...(caseName.startsWith("carrara-") ? { unclassifiedNativeLineShapes:
				nativeSeed.lineItems.filter((line) => !/doorstop|baseboard|casing|crown/i.test(line.uid) &&
					!(line.housePackageTool?.doors.length ?? 0)).map((line) => ({
					qty: line.qty, selectionCount: line.formSteps.length,
					ordinal: Number(line.uid.match(/^line-(?:[a-z]+-)?(\d+)/i)?.[1]) || null,
					stepTitles: line.formSteps.map((selection) =>
						configuration.steps.find((step) => step.id === selection.stepId)?.title ?? "unknown"),
					sourceEvidenceCount: nativeSeed.interpretations?.filter((entry) =>
						entry.lineUid === line.uid).length ?? 0,
					lineReviewCount: nativeSeed.unresolved.filter((entry) =>
						entry.lineUid === line.uid).length,
				})) } : {}),
			bareWidthReviewCount: nativeSeed.unresolved.filter((item) =>
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
		const heightSelection = message.match(/^Line ([a-z0-9-]+) selects Height (\d+[-/]\d+), which (?:contradicts the dimensions stated in|is not stated in) the customer request\.$/i);
		const routeFailureKind = safeRouteFailureKind(message);
		const site = error instanceof Error
			? error.stack?.match(/\/apps\/api\/src\/([a-z0-9/.-]+\.ts):(\d+):\d+/i)
			: null;
		console.log(JSON.stringify({
			attempt: index + 1,
			stage: "configuration",
			...rawShape,
			...(mouldingEvidence ? { mouldingEvidence } : {}),
			category: safeConfigurationIssue(message),
			...(hptShapeOrdinal ? { hptShapeOrdinal: Number(hptShapeOrdinal) } : {}),
			...(componentOrdinal ? { componentOrdinal: Number(componentOrdinal) } : {}),
			...(componentLineKind ? { componentLineKind } : {}),
			...(mouldingQuantity ? { mouldingQuantity: Number(mouldingQuantity) } : {}),
			...(heightSelection ? { heightSelection: {
				linePosition: linePositionByUid.get(heightSelection[1] ?? "") ?? null,
				catalogHeight: heightSelection[2],
			} } : {}),
			...(routeFailureKind ? { routeFailureKind } : {}),
			...(site ? { site: `${site[1]}:${site[2]}` } : {}),
		}));
	}
}
await db.$disconnect();
