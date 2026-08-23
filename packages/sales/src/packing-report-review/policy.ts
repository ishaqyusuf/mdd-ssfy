import { buildDispatchManifestRevision } from "../dispatch-manifest/revision";

export type PackingQty = {
	qty: number;
	lhQty: number;
	rhQty: number;
};

export class PackingReportError extends Error {
	constructor(
		public readonly code:
			| "IDEMPOTENCY_CONFLICT"
			| "FORBIDDEN"
			| "INVALID_QUANTITY"
			| "NOT_REPORTABLE"
			| "OVER_REPORT"
			| "PHYSICAL_SHORTAGE"
			| "STALE_EVIDENCE"
			| "STALE_SCOPE",
		message: string,
	) {
		super(message);
		this.name = "PackingReportError";
	}
}

export function packingQty(input: Partial<PackingQty>): PackingQty {
	return {
		qty: Number(input.qty || 0),
		lhQty: Number(input.lhQty || 0),
		rhQty: Number(input.rhQty || 0),
	};
}

export function packingQtyTotal(input: Partial<PackingQty>) {
	const value = packingQty(input);
	return value.qty > 0 ? value.qty : value.lhQty + value.rhQty;
}

export function addPackingQty(...values: Array<Partial<PackingQty>>) {
	return values.reduce<PackingQty>(
		(total, value) => {
			const next = packingQty(value);
			return {
				qty: total.qty + next.qty,
				lhQty: total.lhQty + next.lhQty,
				rhQty: total.rhQty + next.rhQty,
			};
		},
		{ qty: 0, lhQty: 0, rhQty: 0 },
	);
}

export function remainingPackingQty(
	available: Partial<PackingQty>,
	...reported: Array<Partial<PackingQty>>
) {
	const used = addPackingQty(...reported);
	const limit = packingQty(available);
	return {
		qty: Math.max(0, limit.qty - used.qty),
		lhQty: Math.max(0, limit.lhQty - used.lhQty),
		rhQty: Math.max(0, limit.rhQty - used.rhQty),
	};
}

export function assertPackingQtyWithinRemaining(
	requestedInput: Partial<PackingQty>,
	remainingInput: Partial<PackingQty>,
) {
	const requested = packingQty(requestedInput);
	const remaining = packingQty(remainingInput);
	if (
		!Number.isInteger(requested.qty) ||
		!Number.isInteger(requested.lhQty) ||
		!Number.isInteger(requested.rhQty) ||
		requested.qty < 0 ||
		requested.lhQty < 0 ||
		requested.rhQty < 0 ||
		packingQtyTotal(requested) <= 0 ||
		(requested.qty > 0 && (requested.lhQty > 0 || requested.rhQty > 0))
	) {
		throw new PackingReportError(
			"INVALID_QUANTITY",
			"Physically verified packing quantity must be a positive whole quantity.",
		);
	}
	if (
		requested.qty > remaining.qty ||
		requested.lhQty > remaining.lhQty ||
		requested.rhQty > remaining.rhQty
	) {
		throw new PackingReportError(
			"OVER_REPORT",
			"Reported packed quantity exceeds the current remaining dispatch allocation. Use a Dispatch Exception for a physical shortage.",
		);
	}
}

export function buildPackingReportOpenKey(input: {
	dispatchId: number;
	dispatchAllocationKey: string;
}) {
	return `dispatch:${input.dispatchId}:allocation:${input.dispatchAllocationKey}`;
}

export function buildPackingDispatchAllocationKey(value: unknown) {
	return buildDispatchManifestRevision(value).replace(
		"manifest_",
		"packing_allocation_",
	);
}

export function buildPackingEvidenceRevision(value: unknown) {
	return buildDispatchManifestRevision(value).replace("manifest_", "packing_");
}

export function isPackingReportDownstreamBlocking(status: string | null) {
	return status === "PENDING";
}
