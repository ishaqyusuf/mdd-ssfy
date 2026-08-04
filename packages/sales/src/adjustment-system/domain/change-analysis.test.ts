import { describe, expect, it } from "bun:test";
import {
	analyzeSalesFormChange,
	calculateSalesAdjustmentSettlement,
	resolveSalesAdjustmentApplyClaim,
	resolveSalesAdjustmentStaleReason,
} from "./change-analysis";

describe("analyzeSalesFormChange", () => {
	it("classifies a paid quantity reduction and preserves the before/after snapshot", () => {
		const result = analyzeSalesFormChange({
			before: {
				lineItems: [
					{ uid: "door-1", title: "Entry door", qty: 5, lineTotal: 500 },
				],
				summary: { grandTotal: 550 },
			},
			after: {
				lineItems: [
					{ uid: "door-1", title: "Entry door", qty: 3, lineTotal: 300 },
				],
				summary: { grandTotal: 330 },
			},
			commitments: { paymentTotal: 550 },
		});

		expect(result.direction).toBe("REDUCTION");
		expect(result.requiresApproval).toBe(true);
		expect(result.lines).toEqual([
			expect.objectContaining({
				uid: "door-1",
				beforeQty: 5,
				afterQty: 3,
				quantityDelta: -2,
				beforeLineTotal: 500,
				afterLineTotal: 300,
			}),
		]);
		expect(result.totalDelta).toBe(-220);
	});

	it("classifies mixed line changes and flags operational commitments", () => {
		const result = analyzeSalesFormChange({
			before: {
				lineItems: [
					{ uid: "a", title: "A", qty: 5, lineTotal: 500 },
					{ uid: "b", title: "B", qty: 2, lineTotal: 100 },
				],
				summary: { grandTotal: 600 },
			},
			after: {
				lineItems: [
					{ uid: "a", title: "A", qty: 4, lineTotal: 400 },
					{ uid: "b", title: "B", qty: 3, lineTotal: 150 },
				],
				summary: { grandTotal: 550 },
			},
			commitments: { productionQty: 2, inboundQty: 1 },
		});

		expect(result.direction).toBe("MIXED");
		expect(result.commitmentKinds).toEqual(["INBOUND", "PRODUCTION"]);
		expect(result.requiresApproval).toBe(true);
	});

	it("does not require approval for an uncommitted draft quantity edit", () => {
		const result = analyzeSalesFormChange({
			before: {
				lineItems: [{ uid: "a", title: "A", qty: 1, lineTotal: 100 }],
				summary: { grandTotal: 100 },
			},
			after: {
				lineItems: [{ uid: "a", title: "A", qty: 2, lineTotal: 200 }],
				summary: { grandTotal: 200 },
			},
			commitments: {},
		});

		expect(result.direction).toBe("INCREASE");
		expect(result.requiresApproval).toBe(false);
	});
});

describe("resolveSalesAdjustmentStaleReason", () => {
	it("prioritizes a newly irreversible quantity floor", () => {
		expect(
			resolveSalesAdjustmentStaleReason({
				sourceVersion: "v1",
				liveVersion: "v2",
				approvedPaymentTotal: 100,
				livePaymentTotal: 120,
				quantityFloorChanged: true,
			}),
		).toBe("IRREVERSIBLE_QUANTITY_CHANGED");
	});

	it("detects payment projection drift using currency rounding", () => {
		expect(
			resolveSalesAdjustmentStaleReason({
				sourceVersion: "v1",
				liveVersion: "v1",
				approvedPaymentTotal: 100,
				livePaymentTotal: 100.01,
				quantityFloorChanged: false,
			}),
		).toBe("PAYMENT_PROJECTION_CHANGED");
	});

	it("accepts an unchanged approved source", () => {
		expect(
			resolveSalesAdjustmentStaleReason({
				sourceVersion: "v1",
				liveVersion: "v1",
				approvedPaymentTotal: 100,
				livePaymentTotal: 100,
				quantityFloorChanged: false,
			}),
		).toBeNull();
	});
});

describe("resolveSalesAdjustmentApplyClaim", () => {
	it("acquires the first approved application attempt", () => {
		expect(
			resolveSalesAdjustmentApplyClaim({
				claimCount: 1,
				currentStatus: "APPLYING",
			}),
		).toBe("ACQUIRED");
	});

	it("treats an already-applied retry as an idempotent success", () => {
		expect(
			resolveSalesAdjustmentApplyClaim({
				claimCount: 0,
				currentStatus: "APPLIED",
			}),
		).toBe("ALREADY_APPLIED");
		expect(
			resolveSalesAdjustmentApplyClaim({
				claimCount: 0,
				currentStatus: "APPLIED_WITH_REVIEW",
			}),
		).toBe("ALREADY_APPLIED");
	});

	it("rejects a claim when the adjustment is not in an applicable state", () => {
		expect(
			resolveSalesAdjustmentApplyClaim({
				claimCount: 0,
				currentStatus: "REJECTED",
			}),
		).toBe("NOT_READY");
	});
});

describe("calculateSalesAdjustmentSettlement", () => {
	it("refunds only the overpayment to wallet after a reduction", () => {
		expect(
			calculateSalesAdjustmentSettlement({
				beforeGrandTotal: 550,
				afterGrandTotal: 330,
				paymentTotal: 550,
			}),
		).toEqual({
			amountDelta: -220,
			amountDue: 0,
			walletCredit: 220,
			paymentAppliedAfter: 330,
		});
	});

	it("reduces the outstanding due before creating any wallet credit", () => {
		expect(
			calculateSalesAdjustmentSettlement({
				beforeGrandTotal: 1_000,
				afterGrandTotal: 800,
				paymentTotal: 600,
			}),
		).toEqual({
			amountDelta: -200,
			amountDue: 200,
			walletCredit: 0,
			paymentAppliedAfter: 600,
		});
	});

	it("creates amount due for an increase and never auto-charges", () => {
		expect(
			calculateSalesAdjustmentSettlement({
				beforeGrandTotal: 500,
				afterGrandTotal: 650,
				paymentTotal: 500,
			}),
		).toEqual({
			amountDelta: 150,
			amountDue: 150,
			walletCredit: 0,
			paymentAppliedAfter: 500,
		});
	});
});
