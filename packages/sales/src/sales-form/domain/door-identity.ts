import { readSalesFormObjectMetadata } from "./metadata";

export type SalesDoorIdentityRow = {
	id?: number | null;
	dimension?: string | null;
	stepProductId?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	jambSizePrice?: number | null;
	meta?: unknown;
	[key: string]: unknown;
};

export function normalizeSalesDoorDimension(value: unknown) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[×✕]/g, "x")
		.replace(/\s*x\s*/g, " x ")
		.replace(/\s+/g, " ");
}

export function getSalesDoorActiveIdentity(row: SalesDoorIdentityRow) {
	const meta = readSalesFormObjectMetadata(row?.meta) || {};
	const componentIdentity =
		Number(row?.stepProductId || 0) > 0
			? `product:${Number(row.stepProductId)}`
			: String(meta.componentUid || "").trim()
				? `uid:${String(meta.componentUid).trim().toLowerCase()}`
				: "product:0";
	return `${componentIdentity}|${normalizeSalesDoorDimension(row?.dimension)}`;
}

function pricingCompleteness(row: SalesDoorIdentityRow) {
	const meta = readSalesFormObjectMetadata(row?.meta) || {};
	return [
		Number(meta.baseUnitPrice || 0) > 0,
		Number(meta.doorSalesUnitPrice || 0) > 0,
		Number(row.jambSizePrice || 0) > 0,
		Number(row.unitPrice || 0) > 0,
		Number(row.lineTotal || 0) > 0,
	].filter(Boolean).length;
}

/**
 * Defensive read-side normalization for historical corrupt rows. It never adds
 * quantities. The lowest persisted id remains the durable identity while the
 * most complete pricing payload supplies the commercial values.
 */
export function collapseDuplicateSalesDoorRows<
	TRow extends SalesDoorIdentityRow,
>(rows: TRow[]) {
	const byIdentity = new Map<
		string,
		{ stable: TRow; pricing: TRow; index: number }
	>();
	for (const [index, row] of (rows || []).entries()) {
		const identity = getSalesDoorActiveIdentity(row);
		const current = byIdentity.get(identity);
		if (!current) {
			byIdentity.set(identity, { stable: row, pricing: row, index });
			continue;
		}
		const currentId = Number(current.stable.id || Number.MAX_SAFE_INTEGER);
		const rowId = Number(row.id || Number.MAX_SAFE_INTEGER);
		const stable = rowId < currentId ? row : current.stable;
		const rowScore = pricingCompleteness(row);
		const currentScore = pricingCompleteness(current.pricing);
		const pricing =
			rowScore > currentScore ||
			(rowScore === currentScore && rowId > Number(current.pricing.id || 0))
				? row
				: current.pricing;
		byIdentity.set(identity, { stable, pricing, index: current.index });
	}
	return Array.from(byIdentity.values())
		.sort((a, b) => a.index - b.index)
		.map(({ stable, pricing }) => ({
			...stable,
			...pricing,
			id: stable.id ?? pricing.id ?? null,
			dimension: normalizeSalesDoorDimension(
				pricing.dimension ?? stable.dimension,
			),
		})) as TRow[];
}

export function findDuplicateSalesDoorIdentities(rows: SalesDoorIdentityRow[]) {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const row of rows || []) {
		const identity = getSalesDoorActiveIdentity(row);
		if (seen.has(identity)) duplicates.add(identity);
		seen.add(identity);
	}
	return Array.from(duplicates);
}
