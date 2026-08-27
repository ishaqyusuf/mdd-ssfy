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
			{ action: "production_completed", label: "Production completed" },
			{ action: "fulfilled", label: "Fulfilled" },
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
				label: "Production completed",
			},
			{ action: "fulfilled", label: "Fulfilled" },
			{ action: "cancel_production", label: "Cancel Production" },
		]);
	});

	it("does not offer fulfillment cancellation before fulfillment starts", () => {
		const actions = getSalesOrderStatusMenuActions({
			status: "ready_to_fulfill",
			productionStatus: "completed",
		});

		expect(actions.map(({ action }) => action)).not.toContain(
			"cancel_fulfillment",
		);
	});

	it("lets the server review automatic production when legacy production metadata lags", () => {
		const actions = getSalesOrderStatusMenuActions({
			status: "ready_to_fulfill",
			productionStatus: "unknown",
		});

		expect(actions.map(({ action }) => action)).toContain("cancel_production");
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
				label: "Production completed",
			},
			{
				action: "fulfilled",
				disabled: true,
				label: "Fulfilled",
			},
			{ action: "cancel_fulfillment", label: "Cancel Fulfillment" },
		]);
	});
});
