import { describe, expect, it } from "bun:test";
import {
	canAutoCancelInboundDemand,
	canAutoReleaseStockAllocation,
	requiresInventoryRepairReview,
} from "./sales-inventory-repair-policy";

describe("sales inventory repair policy", () => {
	it("only auto-cancels unreceived, unlinked mutable demand", () => {
		expect(canAutoCancelInboundDemand({ status: "pending" })).toBe(true);
		expect(canAutoCancelInboundDemand({ status: "ordered" })).toBe(true);
		expect(
			canAutoCancelInboundDemand({
				status: "ordered",
				inboundShipmentItemId: 22,
			}),
		).toBe(false);
		expect(
			canAutoCancelInboundDemand({ status: "ordered", qtyReceived: 1 }),
		).toBe(false);
		expect(canAutoCancelInboundDemand({ status: "received" })).toBe(false);
	});

	it("keeps picked and consumed allocations in review", () => {
		expect(canAutoReleaseStockAllocation("pending_review")).toBe(true);
		expect(canAutoReleaseStockAllocation("approved")).toBe(true);
		expect(canAutoReleaseStockAllocation("reserved")).toBe(true);
		expect(canAutoReleaseStockAllocation("picked")).toBe(false);
		expect(canAutoReleaseStockAllocation("consumed")).toBe(false);
	});

	it("flags linked, received, and terminal allocation residue for review", () => {
		expect(
			requiresInventoryRepairReview({
				demand: { status: "ordered", inboundShipmentItemId: 22 },
			}),
		).toBe(true);
		expect(
			requiresInventoryRepairReview({
				demand: { status: "ordered", qtyReceived: 2 },
			}),
		).toBe(true);
		expect(
			requiresInventoryRepairReview({ allocationStatus: "consumed" }),
		).toBe(true);
		expect(
			requiresInventoryRepairReview({
				demand: { status: "ordered" },
				allocationStatus: "reserved",
			}),
		).toBe(false);
	});
});
