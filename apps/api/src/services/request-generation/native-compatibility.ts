import { isDeepStrictEqual } from "node:util";
import {
	type NewSalesFormSeed,
	type WorkflowComponentRecord,
	type WorkflowRouteData,
	hydrateSalesFormRecord,
	initializeNewSalesFormSeed,
	newSalesFormSeedSchema,
	toSalesFormSaveDraftPayload,
} from "@gnd/sales/sales-form-core";

type CompatibilityConfiguration = {
	routes: Array<{ itemTypeUid: string; rootStepId: number; stepUids: string[];
		config?: Record<string, unknown> }>;
	steps: Array<{ id: number; uid: string; title?: string; doorSizeVariation?: unknown[];
		components: Array<[string, string]> }>;
	visibilityByComponentUid: Record<string, unknown>;
};

type SourceDoorRow = {
	row: string;
	quantity: number;
	side: "Left" | "Right" | null;
	ordinal: number;
};

function cleanSourceRow(raw: string) {
	return raw.trim().replace(/^\*\*/, "").replace(/\*\*\\?$/, "").trim();
}

function sourceAtticSides(sourceText: string) {
	const sides = new Set<"Left" | "Right">();
	let side: "Left" | "Right" | null = null;
	for (const raw of sourceText.split(/\r?\n/)) {
		const row = cleanSourceRow(raw);
		if (/^left\s+side$/i.test(row)) side = "Left";
		else if (/^right\s+side$/i.test(row)) side = "Right";
		else if (side && /^1\s+ATTIC ACCESS$/i.test(row)) sides.add(side);
	}
	return sides;
}

function atticPlaceholderSide(uid: string): "Left" | "Right" | null {
	const tokens = new Set(uid.toLowerCase().split(/[-_ ]+/).filter(Boolean));
	if (!tokens.has("attic")) return null;
	if (tokens.has("left") && !tokens.has("right")) return "Left";
	if (tokens.has("right") && !tokens.has("left")) return "Right";
	return null;
}

function unresolvedCatalogIdentity(
	item: NewSalesFormSeed["unresolved"][number],
) {
	if (item.status !== "unsupported" || !item.lineUid) return false;
	const text = `${item.field} ${item.reason}`;
	const namesProduct = /\b(?:catalog|product|component|item|hardware)\b/i.test(text);
	const lacksIdentity = /\bno\b.{0,100}\b(?:match(?:es|ed|ing)?|compatible|identified)\b/i.test(text) ||
		/\b(?:not|cannot|can't|could\s+not)\b.{0,100}\b(?:match(?:es|ed|ing)?|identify|resolve)\b/i.test(text) ||
		/\b(?:unavailable|missing|not\s+available|not\s+identified)\b/i.test(text);
	return namesProduct && lacksIdentity;
}

function sourceDoorRows(sourceText: string): SourceDoorRow[] {
	const rows: SourceDoorRow[] = [];
	let side: SourceDoorRow["side"] = null;
	let inDoorSchedule = false;
	const sideOrdinals = { Left: 0, Right: 0 };
	for (const raw of sourceText.split(/\r?\n/)) {
		const row = cleanSourceRow(raw);
		if (/^left\s+side$/i.test(row)) {
			side = "Left";
			inDoorSchedule = false;
			continue;
		}
		if (/^right\s+side$/i.test(row)) {
			side = "Right";
			inDoorSchedule = false;
			continue;
		}
		if (/^doors?$/i.test(row)) {
			inDoorSchedule = side !== null;
			continue;
		}
		if (!side || !inDoorSchedule) continue;
		const match = row.match(/^(?:(\d+)\s*x\s*)?\d{2,3}\s*["”']\s*(?:LT|RT)?\s*=\s*\S/i);
		if (!match) continue;
		const ordinal = ++sideOrdinals[side];
		rows.push({ row, quantity: match[1] ? Number(match[1]) : 1, side, ordinal });
	}
	if (rows.length) return rows;

	const named = sourceText.split(/\r?\n/).map((row) => row.trim()).filter((row) =>
		/^[^:\n]{2,80}\s+-\s+\d{2,3}\s*["”']?\s*[x×]\s*\d{2,3}\s*["”']?/i.test(row));
	const fallback = named.length ? named : sourceText.split(/\r?\n/).map((row) => row.trim()).filter((row) =>
		/^(?:(?:bifold|pocket)\s+)?(?:[1-9][-/](?:1[01]|\d)|\d{2})\s+[1-9][-/](?:1[01]|\d)\b/i.test(row));
	return fallback.map((row, index) => ({ row, quantity: 1, side: null, ordinal: index + 1 }));
}

export type SalesRequestNativeSeedCompatibility = {
	initializer: "passed" | "blocked";
	saveReopen: "passed" | "blocked";
	unresolvedCount: number;
	issues: string[];
};

/** Prepare only the native handoff; the generation seed retains its source facts for clarification. */
export function projectSalesRequestPartialNativeSeed(
	seed: NewSalesFormSeed,
	sourceText: string,
	configurationJson: string,
): NewSalesFormSeed {
	const configuration = JSON.parse(configurationJson) as CompatibilityConfiguration;
	const doorStepIds = new Set(configuration.steps.filter((step) =>
		step.title?.trim().toLowerCase() === "door").map((step) => step.id));
	const rootStepIds = new Set(configuration.routes.map((route) => route.rootStepId));
	const doorRouteUids = new Set(configuration.routes.filter((route) =>
		route.stepUids.some((uid) => configuration.steps.some((step) =>
			step.uid === uid && doorStepIds.has(step.id)))).map((route) => route.itemTypeUid));
	const incompleteDoorLines = seed.lineItems.filter((line) => {
		const rootSelection = line.formSteps.find((step) => rootStepIds.has(step.stepId) && "prodUid" in step);
		const needsDoor = Boolean(line.housePackageTool?.doors.length) ||
			Boolean(rootSelection && doorRouteUids.has(rootSelection.prodUid));
		return needsDoor && !line.formSteps.some((step) => doorStepIds.has(step.stepId) &&
			("prodUid" in step || ("meta" in step && step.meta.selectedProdUids.length === 1)));
	});
	const reviewableShells = incompleteDoorLines.filter((line) =>
		line.formSteps.filter((step) => !rootStepIds.has(step.stepId) &&
			!doorStepIds.has(step.stepId) &&
			("prodUid" in step || ("meta" in step && step.meta.selectedProdUids.length > 0)))
			.length >= 2 &&
		seed.unresolved.some((item) => item.lineUid === line.uid &&
			(item.stepId == null || doorStepIds.has(item.stepId)) &&
			/door|product|configuration/i.test(`${item.field} ${item.reason}`)),
	);
	const reviewableShellUids = new Set(reviewableShells.map((line) => line.uid));
	const omitted = incompleteDoorLines.filter((line) => !reviewableShellUids.has(line.uid));
	const mouldingRouteUids = new Set(configuration.routes.flatMap((route) => {
		const title = configuration.steps.find((step) => step.id === route.rootStepId)
			?.components.find(([uid]) => uid === route.itemTypeUid)?.[1] ?? "";
		return /^(?:moulding|molding)s?$/i.test(title.trim()) ? [route.itemTypeUid] : [];
	}));
	const atticSides = sourceAtticSides(sourceText);
	const emptyAtticPlaceholders = seed.lineItems.filter((line) => {
		const side = atticPlaceholderSide(line.uid);
		if (!side || !atticSides.has(side) || line.meta?.mouldingRows?.length) return false;
		const rootSelection = line.formSteps.find((step) => rootStepIds.has(step.stepId) && "prodUid" in step);
		if (!rootSelection || !mouldingRouteUids.has(rootSelection.prodUid)) return false;
		return !line.formSteps.some((step) => !rootStepIds.has(step.stepId) &&
			("prodUid" in step || ("meta" in step && step.meta.selectedProdUids.length > 0)));
	});
	const unsupportedCatalogLineUids = new Set(seed.unresolved
		.filter(unresolvedCatalogIdentity)
		.map((item) => item.lineUid as string));
	const unsupportedCatalogLines = seed.lineItems.filter((line) => {
		if (
			!unsupportedCatalogLineUids.has(line.uid) ||
			incompleteDoorLines.includes(line) ||
			emptyAtticPlaceholders.includes(line) ||
			line.housePackageTool?.doors.length ||
			line.meta?.serviceRows?.length ||
			line.meta?.mouldingRows?.length
		)
			return false;
		const rootSelection = line.formSteps.find((step) =>
			rootStepIds.has(step.stepId) && "prodUid" in step);
		if (!rootSelection) return false;
		const route = configuration.routes.find((candidate) =>
			candidate.rootStepId === rootSelection.stepId &&
			candidate.itemTypeUid === rootSelection.prodUid);
		if (!route?.stepUids.length) return false;
		return !line.formSteps.some((step) =>
			step.stepId !== rootSelection.stepId &&
			("value" in step || "prodUid" in step ||
				("meta" in step && step.meta.selectedProdUids.length > 0)));
	});
	const unsupportedCatalogUids = new Set(unsupportedCatalogLines.map((line) => line.uid));
	const omittedUids = new Set([
		...omitted,
		...emptyAtticPlaceholders,
		...unsupportedCatalogLines,
	].map((line) => line.uid));
	const missingAtticSides = [...atticSides].filter((side) => !seed.lineItems.some((line) =>
		atticPlaceholderSide(line.uid) === side && !omittedUids.has(line.uid)));
	if (!omitted.length && !reviewableShells.length && !emptyAtticPlaceholders.length &&
		!unsupportedCatalogLines.length &&
		!missingAtticSides.length) return seed;
	const rows = sourceDoorRows(sourceText);
	const hasSectionDoorRows = rows.some((row) => row.side !== null);
	const reviews: NewSalesFormSeed["unresolved"] = [];
	for (const line of reviewableShells)
		for (const door of line.housePackageTool?.doors ?? []) {
			const count = "totalQty" in door ? door.totalQty : door.lhQty + door.rhQty;
			const handing = "totalQty" in door ? "handing unassigned"
				: `${door.lhQty} left, ${door.rhQty} right${door.swing ? `, ${door.swing} swing` : ""}`;
			reviews.push({ lineUid: line.uid, stepId: null, field: "doorSchedule",
				status: "unsupported",
				reason: `Draft shell retained for Sales review, but ${count} door${count === 1 ? "" : "s"} at ${door.dimension} (${handing}) were not applied because a compatible Door product is missing.` });
		}
	if (!rows.length) {
		for (const line of omitted)
			for (const door of line.housePackageTool?.doors ?? []) {
				const count = "totalQty" in door ? door.totalQty : door.lhQty + door.rhQty;
				const handing = "totalQty" in door ? "handing unassigned"
					: `${door.lhQty} left, ${door.rhQty} right${door.swing ? `, ${door.swing} swing` : ""}`;
				reviews.push({ lineUid: null, stepId: null, field: "doorSchedule",
					status: "unsupported",
					reason: `Not created from customer request: ${line.uid}, ${count} door${count === 1 ? "" : "s"} at ${door.dimension} (${handing}). A compatible Door product is missing; compare this row with the original request and add it in Sales.` });
			}
		for (const line of omitted)
			if (!line.housePackageTool?.doors.length)
				reviews.push({ lineUid: null, stepId: null, field: "doorSchedule",
					status: "unsupported",
					reason: `Not created from customer request: ${line.uid}, quantity ${line.qty}. The Door product and schedule are incomplete; compare this row with the original request and add it in Sales.` });
		for (const interpretation of seed.interpretations ?? [])
			if (omittedUids.has(interpretation.lineUid))
				reviews.push({ lineUid: null, stepId: null, field: "doorSchedule",
					status: "unsupported",
					reason: `Omitted ${interpretation.lineUid} source evidence: ${interpretation.sourceText.slice(0, 1000)}. Check this selection against the original request before adding it in Sales.` });
	}
	if (omitted.length && rows.length)
		for (const row of rows)
			reviews.push({ lineUid: null, stepId: null, field: "doorSchedule",
				status: "unsupported",
				reason: row.side
					? `${row.side} Side door row ${row.ordinal} (${row.quantity} unit${row.quantity === 1 ? "" : "s"}): ${row.row.slice(0, 160)}. A Door line was omitted from the native draft; compare this exact source occurrence with the draft before adding or changing anything.`
					: `Source door row ${row.ordinal}: ${row.row.slice(0, 160)}. A Door line was omitted from the native draft; compare this source row with the draft before adding or changing anything.` });
	for (const side of missingAtticSides) {
		reviews.push({ lineUid: null, stepId: null, field: "moulding", status: "unsupported",
			reason: `${side} Side: 1 ATTIC ACCESS. No compatible Mouldings product was configured; add this exact source item in Sales after selecting its catalog product.` });
	}
	if (omitted.length && !rows.length &&
		!seed.interpretations?.some((item) => omittedUids.has(item.lineUid)))
		reviews.push({ lineUid: null, stepId: null, field: "doorSchedule",
			status: "unsupported",
			reason: `An incomplete Door line was omitted. Compare the original request with the native draft before adding a door. Original request excerpt: ${sourceText.trim().slice(0, 1000)}` });
	const retainedUnresolved = seed.unresolved.flatMap((item) => {
		if (!item.lineUid || !omittedUids.has(item.lineUid)) return [item];
		if (unsupportedCatalogUids.has(item.lineUid)) return [{
			...item,
			lineUid: null,
			stepId: null,
		}];
		if (hasSectionDoorRows || rows.length) return [];
		return [{ ...item, lineUid: null, stepId: null,
			reason: `${item.lineUid}: ${item.reason}`.slice(0, 2000) }];
	});
	const uniqueUnresolved = [...retainedUnresolved, ...reviews].filter((item, index, all) =>
		all.findIndex((candidate) => candidate.lineUid === item.lineUid &&
			candidate.stepId === item.stepId && candidate.field === item.field &&
			candidate.status === item.status && candidate.reason === item.reason) === index);
	return newSalesFormSeedSchema.parse({
		...seed,
		lineItems: seed.lineItems.filter((line) => !omittedUids.has(line.uid)).map((line) => {
			if (!reviewableShellUids.has(line.uid)) return line;
			const { housePackageTool: _housePackageTool, ...shell } = line;
			return shell;
		}),
		interpretations: seed.interpretations?.filter((item) => !omittedUids.has(item.lineUid)),
		unresolved: uniqueUnresolved,
	});
}

/** Price-neutral native form initialization and draft save/reopen structural gate. */
export async function verifySalesRequestNativeSeedCompatibility(
	seed: NewSalesFormSeed,
	configurationJson: string,
	allowReviewOnly = false,
): Promise<SalesRequestNativeSeedCompatibility> {
	const configuration = JSON.parse(configurationJson) as CompatibilityConfiguration;
	const rootStepId = configuration.routes[0]?.rootStepId;
	const rootStep = configuration.steps.find((step) => step.id === rootStepId);
	const routeData: WorkflowRouteData = {
		rootStepUid: rootStep?.uid || null,
		stepsById: Object.fromEntries(configuration.steps.map((step) => [step.id, step.uid])),
		stepsByUid: Object.fromEntries(configuration.steps.map((step) => [step.uid, {
			id: step.id, uid: step.uid, title: step.title || "",
			...(step.doorSizeVariation?.length
				? { meta: { doorSizeVariation: step.doorSizeVariation } } : {}),
		}])),
		composedRouter: Object.fromEntries(configuration.routes.map((route) => [
			route.itemTypeUid,
			{ routeSequence: route.stepUids.map((uid) => ({ uid })), config: route.config || {} },
		])),
	};
	const componentsByStepId = new Map<number, WorkflowComponentRecord[]>();
	let componentId = 1;
	for (const step of configuration.steps) {
		componentsByStepId.set(step.id, step.components.map(([uid, title]) => {
			const visibility = configuration.visibilityByComponentUid[uid];
			const projectedVisibility = visibility && typeof visibility === "object" &&
				!Array.isArray(visibility) ? visibility as Record<string, unknown> : {};
			return { id: componentId++, uid, title, basePrice: 1, salesPrice: 1,
				...projectedVisibility };
		}));
	}
	const initialized = await initializeNewSalesFormSeed({
		seed,
		baseRecord: { type: "quote", salesId: null, form: { customerProfileId: 1 },
			lineItems: [], extraCosts: [], summary: { taxRate: 0 } },
		routeData,
		pricing: { profileCoefficient: 1 },
		resolveComponents: ({ step }) => componentsByStepId.get(Number(step.id)) || [],
	});
	const issues = initialized.issues.map((issue) =>
		[issue.reason, issue.lineUid, issue.stepId ?? "", issue.componentUid ?? ""]
			.filter((value) => value !== "").join(":"),
	);
	const emptyWithoutReview = seed.lineItems.length === 0 &&
		(!allowReviewOnly || initialized.unresolved.length === 0);
	if (issues.length || emptyWithoutReview) return {
		initializer: "blocked", saveReopen: "blocked",
		unresolvedCount: initialized.unresolved.length,
		issues: emptyWithoutReview ? [...issues, "empty-native-draft"] : issues,
	};
	const payload = toSalesFormSaveDraftPayload(initialized.record, true);
	const reopened = hydrateSalesFormRecord({
		...initialized.record,
		form: payload.meta, lineItems: payload.lineItems,
		extraCosts: payload.extraCosts, summary: payload.summary,
	});
	const reopenedPayload = toSalesFormSaveDraftPayload(reopened, true);
	if (!isDeepStrictEqual(payload, reopenedPayload)) {
		throw new Error("Seed changed during the native save/reopen round-trip.");
	}
	return { initializer: "passed", saveReopen: "passed",
		unresolvedCount: initialized.unresolved.length, issues: [] };
}
