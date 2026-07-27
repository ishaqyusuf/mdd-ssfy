import { describe, expect, it } from "bun:test";
import { getSalesOrderStatusMenuActions } from "../../sales-status-menu-actions";

describe("sales order status menu actions", () => {
	it("keeps completion and fulfillment as the first two actions", () => {
		expect(
			getSalesOrderStatusMenuActions({
				status: "awaiting_production",
				productionStatus: "pending",
			}),
		).toEqual([
			{ action: "production_completed", label: "Mark as Completed" },
			{ action: "fulfilled", label: "Mark as Fulfilled" },
		]);
	});

	it("offers production rollback only after production is completed", () => {
		expect(
			getSalesOrderStatusMenuActions({
				status: "ready_to_fulfill",
				productionStatus: "completed",
			}),
		).toEqual([
			{
				action: "production_completed",
				disabled: true,
				label: "Mark as Completed",
			},
			{ action: "fulfilled", label: "Mark as Fulfilled" },
			{ action: "cancel_production", label: "Cancel Production" },
		]);
	});

	it("offers fulfillment rollback after fulfillment begins", () => {
		expect(
			getSalesOrderStatusMenuActions({
				status: "fulfilled",
				productionStatus: "completed",
			}),
		).toEqual([
			{
				action: "production_completed",
				disabled: true,
				label: "Mark as Completed",
			},
			{
				action: "fulfilled",
				disabled: true,
				label: "Mark as Fulfilled",
			},
			{ action: "cancel_fulfillment", label: "Cancel Fulfillment" },
		]);
	});
});
