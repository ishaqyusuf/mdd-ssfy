import type { NewSalesFormSaveDraftInput } from "./schema";

type SavedSalesFormIdentity = {
	salesId?: number | null;
	slug?: string | null;
	version?: string | null;
	lineItems?: NewSalesFormSaveDraftInput["lineItems"];
	extraCosts?: NewSalesFormSaveDraftInput["extraCosts"];
};

function doorIdentity(row: any) {
	const component =
		Number(row?.stepProductId || 0) > 0
			? `product:${Number(row.stepProductId)}`
			: String(row?.meta?.componentUid || "").trim()
				? `uid:${String(row.meta.componentUid).trim().toLowerCase()}`
				: "product:0";
	return `${component}|${String(row?.dimension || "")
		.trim()
		.toLowerCase()
		.replace(/[×✕]/g, "x")
		.replace(/\s*x\s*/g, " x ")
		.replace(/\s+/g, " ")}`;
}

function rowUid(row: any) {
	return String(row?.uid || row?.meta?.uid || "").trim();
}

function shelfIdentity(row: any) {
	const uid = rowUid(row);
	return uid
		? `uid:${uid}`
		: [
				"shelf",
				Number(row?.categoryId || 0),
				Number(row?.productId || 0),
				String(row?.description || "").trim(),
			].join("|");
}

function costIdentity(row: any) {
	return [row?.type || "", String(row?.label || "").trim()].join("|");
}

function findUnambiguousSavedRow(
	row: any,
	rows: any[],
	savedRows: any[],
	identity: (value: any) => string,
	usedIds: Set<number>,
) {
	const requestedId = Number(row?.id || 0);
	if (requestedId > 0) {
		const exact = savedRows.find(
			(candidate) => Number(candidate?.id || 0) === requestedId,
		);
		if (exact && !usedIds.has(requestedId)) {
			usedIds.add(requestedId);
			return exact;
		}
	}
	const key = identity(row);
	const sourceMatches = rows.filter((candidate) => identity(candidate) === key);
	const savedMatches = savedRows.filter(
		(candidate) =>
			identity(candidate) === key && !usedIds.has(Number(candidate?.id || 0)),
	);
	if (sourceMatches.length !== 1 || savedMatches.length !== 1) return null;
	const match = savedMatches[0];
	const matchId = Number(match?.id || 0);
	if (matchId > 0) usedIds.add(matchId);
	return match;
}

function stepIdentity(row: any) {
	return [
		Number(row?.stepId || row?.step?.id || 0),
		Number(row?.componentId || 0),
		String(row?.prodUid || "").trim(),
	].join("|");
}

export function mergeCanonicalSalesFormIds(
	lines: NewSalesFormSaveDraftInput["lineItems"],
	savedLines: NewSalesFormSaveDraftInput["lineItems"] = [],
) {
	return lines.map((line) => {
		const saved = savedLines.find((candidate) => candidate.uid === line.uid);
		if (!saved) return line;
		const savedSteps = saved.formSteps || [];
		const savedShelves = saved.shelfItems || [];
		const savedDoors = saved.housePackageTool?.doors || [];
		const usedStepIds = new Set<number>();
		const usedShelfIds = new Set<number>();
		const usedDoorIds = new Set<number>();
		return {
			...line,
			id: saved.id ?? line.id,
			formSteps: (line.formSteps || []).map((step) => {
				const match = findUnambiguousSavedRow(
					step,
					line.formSteps || [],
					savedSteps,
					stepIdentity,
					usedStepIds,
				);
				return { ...step, id: match?.id ?? step.id };
			}),
			shelfItems: (line.shelfItems || []).map((row) => {
				const match = findUnambiguousSavedRow(
					row,
					line.shelfItems || [],
					savedShelves,
					shelfIdentity,
					usedShelfIds,
				);
				return { ...row, id: match?.id ?? row.id };
			}),
			housePackageTool: line.housePackageTool
				? {
						...line.housePackageTool,
						id: saved.housePackageTool?.id ?? line.housePackageTool.id ?? null,
						doors: (line.housePackageTool.doors || []).map((door) => {
							const match = findUnambiguousSavedRow(
								door,
								line.housePackageTool?.doors || [],
								savedDoors,
								doorIdentity,
								usedDoorIds,
							);
							return { ...door, id: match?.id ?? door.id };
						}),
					}
				: line.housePackageTool,
		};
	});
}

export function rebaseQueuedSalesFormPayload(
	payload: NewSalesFormSaveDraftInput | null,
	response: SavedSalesFormIdentity | null | undefined,
): NewSalesFormSaveDraftInput | null {
	if (!payload || !response) return payload;
	const usedCostIds = new Set<number>();
	return {
		...payload,
		salesId: response.salesId ?? payload.salesId,
		slug: response.slug ?? payload.slug,
		version: response.version ?? payload.version,
		lineItems: mergeCanonicalSalesFormIds(
			payload.lineItems,
			response.lineItems || [],
		),
		extraCosts: payload.extraCosts.map((cost) => {
			const savedCost = findUnambiguousSavedRow(
				cost,
				payload.extraCosts,
				response.extraCosts || [],
				costIdentity,
				usedCostIds,
			);
			return { ...cost, id: savedCost?.id ?? cost.id };
		}),
	};
}

function comparablePayload(payload: NewSalesFormSaveDraftInput | null) {
	if (!payload) return null;
	return {
		type: payload.type,
		inventoryStatus: payload.inventoryStatus,
		meta: payload.meta,
		lineItems: payload.lineItems,
		extraCosts: payload.extraCosts,
		summary: payload.summary,
	};
}

export function hasNewerSalesFormPayload(
	latest: NewSalesFormSaveDraftInput | null,
	saved: NewSalesFormSaveDraftInput,
) {
	return (
		JSON.stringify(comparablePayload(latest)) !==
		JSON.stringify(comparablePayload(saved))
	);
}
