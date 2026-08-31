import { describe, expect, test } from "bun:test";
import { getSalesOrderStatusMenuActions } from "./sales-status-menu-actions";

describe("queued dispatch cancellation regression", () => {
	test("offers cancellation when a dispatch exists before packing starts", () => {
		const actions = getSalesOrderStatusMenuActions({
			status: "ready_to_fulfill",
			hasFulfillmentDispatch: true,
		});

		expect(actions).toContainEqual({
			action: "cancel_fulfillment",
			label: "Cancel Fulfillment",
		});
	});
});
