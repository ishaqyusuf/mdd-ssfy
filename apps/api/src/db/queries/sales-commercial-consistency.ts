import {
	getSalesDoorActiveIdentity,
	normalizeSalesDoorDimension,
} from "@gnd/sales/sales-form";
const safeRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
import { roundMoney as roundCurrency } from "@gnd/sales/payment-system";

export function hasUnprojectedApprovedCommercialSnapshot(
	meta: {
		newSalesForm?: { approvedAdjustmentId?: unknown; lineItems?: unknown[] };
	},
	canonicalLines: unknown[],
) {
	const persisted = meta.newSalesForm;
	if (!persisted?.approvedAdjustmentId || !persisted.lineItems?.length) {
		return false;
	}
	return (
		JSON.stringify(
			commercialProjection(
				resolveAssignedDoorIds(persisted.lineItems, canonicalLines),
			),
		) !== JSON.stringify(commercialProjection(canonicalLines))
	);
}

function commercialProjection(lines: unknown[]) {
	return lines
		.map((value) => {
			const line = safeRecord(value);
			const hpt = safeRecord(line.housePackageTool);
			const doors = Array.isArray(hpt.doors) ? hpt.doors : [];
			const shelves = Array.isArray(line.shelfItems) ? line.shelfItems : [];
			return {
				key:
					Number(line.id || 0) > 0
						? `id:${Number(line.id)}`
						: `uid:${String(line.uid || "")}`,
				qty: Number(line.qty || 0),
				lineTotal: roundCurrency(Number(line.lineTotal || 0)),
				doors: doors
					.map((doorValue) => {
						const door = safeRecord(doorValue);
						return {
							key:
								Number(door.id || 0) > 0
									? `id:${Number(door.id)}`
									: [
											normalizeSalesDoorDimension(String(door.dimension || "")),
											Number(door.stepProductId || 0),
										].join("|"),
							dimension: normalizeSalesDoorDimension(
								String(door.dimension || ""),
							),
							lhQty: Number(door.lhQty || 0),
							rhQty: Number(door.rhQty || 0),
							totalQty: Number(door.totalQty || 0),
							lineTotal: roundCurrency(Number(door.lineTotal || 0)),
						};
					})
					.sort((left, right) => left.key.localeCompare(right.key)),
				shelves: shelves
					.map((shelfValue) => {
						const shelf = safeRecord(shelfValue);
						return {
							key:
								Number(shelf.id || 0) > 0
									? `id:${Number(shelf.id)}`
									: [
											Number(shelf.categoryId || 0),
											Number(shelf.productId || 0),
											String(shelf.description || ""),
										].join("|"),
							qty: Number(shelf.qty || 0),
							totalPrice: roundCurrency(Number(shelf.totalPrice || 0)),
						};
					})
					.sort((left, right) => left.key.localeCompare(right.key)),
			};
		})
		.sort((left, right) => left.key.localeCompare(right.key));
}

// Resolve only missing IDs within one unique parent line. Existing IDs and all
// commercial values remain authoritative; ambiguous identities stay blocked.
function resolveAssignedDoorIds(lines: unknown[], canonicalLines: unknown[]) {
	return lines.map((value) => {
		const line = safeRecord(value);
		const matches = canonicalLines
			.map(safeRecord)
			.filter(
				(candidate) =>
					Number(line.id) > 0 && Number(candidate.id) === Number(line.id),
			);
		const canonical = matches.length === 1 ? matches[0] : undefined;
		if (!canonical) return value;
		const hpt = safeRecord(line.housePackageTool);
		const canonicalHpt = safeRecord(canonical.housePackageTool);
		return {
			...line,
			...(Array.isArray(hpt.doors) && Array.isArray(canonicalHpt.doors)
				? {
						housePackageTool: {
							...hpt,
							doors: resolveMissingIds(
								hpt.doors,
								canonicalHpt.doors,
								getSalesDoorActiveIdentity,
							),
						},
					}
				: {}),
			...(Array.isArray(line.shelfItems) && Array.isArray(canonical.shelfItems)
				? {
						shelfItems: resolveMissingIds(
							line.shelfItems,
							canonical.shelfItems,
							shelfIdentity,
						),
					}
				: {}),
		};
	});
}
function shelfIdentity(row: Record<string, unknown>) {
	return JSON.stringify([
		Number(row.categoryId || 0),
		Number(row.productId || 0),
		String(row.description || ""),
	]);
}
function resolveMissingIds(
	proposed: unknown[],
	saved: unknown[],
	identityOf: (row: Record<string, unknown>) => string,
) {
	const proposedRows = proposed.map(safeRecord);
	const savedRows = saved.map(safeRecord);
	const claimed = new Set(
		proposedRows.map((row) => Number(row.id)).filter((id) => id > 0),
	);
	return proposedRows.map((row) => {
		if (Number(row.id) > 0) return row;
		const identity = identityOf(row);
		if (
			proposedRows.filter((candidate) => identityOf(candidate) === identity)
				.length !== 1
		)
			return row;
		const candidates = savedRows.filter(
			(candidate) => identityOf(candidate) === identity,
		);
		const candidate = candidates.length === 1 ? candidates[0] : undefined;
		if (
			!candidate ||
			!(Number(candidate.id) > 0) ||
			claimed.has(Number(candidate.id))
		)
			return row;
		claimed.add(Number(candidate.id));
		return { ...row, id: candidate.id };
	});
}
