import { describe, expect, it } from "bun:test";

import {
	PackingReportError,
	assertPackingQtyWithinRemaining,
	buildPackingEvidenceRevision,
	buildPackingReportOpenKey,
	remainingPackingQty,
} from "./policy";

describe("packing report review policy", () => {
	it("computes remaining quantity across canonical and pending reports", () => {
		expect(
			remainingPackingQty(
				{ qty: 6, lhQty: 0, rhQty: 0 },
				{ qty: 2 },
				{ qty: 1 },
			),
		).toEqual({ qty: 3, lhQty: 0, rhQty: 0 });
	});

	it("rejects zero, mixed, and over-reported quantities", () => {
		for (const requested of [
			{ qty: 0, lhQty: 0, rhQty: 0 },
			{ qty: 1, lhQty: 1, rhQty: 0 },
			{ qty: 4, lhQty: 0, rhQty: 0 },
		]) {
			expect(() =>
				assertPackingQtyWithinRemaining(requested, {
					qty: 3,
					lhQty: 0,
					rhQty: 0,
				}),
			).toThrow(PackingReportError);
		}
	});

	it("uses stable evidence revisions and one open key per allocation", () => {
		expect(buildPackingEvidenceRevision({ b: 2, a: 1 })).toBe(
			buildPackingEvidenceRevision({ a: 1, b: 2 }),
		);
		expect(
			buildPackingReportOpenKey({
				dispatchId: 41,
				dispatchAllocationKey: "packing_allocation_72",
			}),
		).toBe("dispatch:41:allocation:packing_allocation_72");
	});
});
