import { describe, expect, it } from "bun:test";
import { sendPaymentSystemNotifications } from "../src/payment-system";

describe("payment system notifications", () => {
	it("queues a sales checkout notification when the payment has no linked customer author", async () => {
		const triggered: Array<{ taskId: string; payload: unknown }> = [];
		const tasks = {
			trigger: async (taskId: string, payload: unknown) => {
				triggered.push({ taskId, payload });
				return {};
			},
		};

		await sendPaymentSystemNotifications(
			tasks,
			{ db: {} as never, systemAuthorId: 1 },
			[
				{
					type: "sales_checkout_success",
					recipientEmployeeId: 42,
					author: {
						id: null,
						role: "customer",
					},
					payload: {
						orderNos: ["ORD-100"],
						customerName: "Walk-in Customer",
						totalAmount: 125,
					},
				},
			],
		);

		expect(triggered).toHaveLength(1);
		expect(triggered[0]).toEqual({
			taskId: "notification",
			payload: {
				channel: "sales_checkout_success",
				recipients: [{ ids: [42], role: "employee" }],
				author: { id: 1, role: "employee" },
				payload: {
					orderNos: ["ORD-100"],
					customerName: "Walk-in Customer",
					totalAmount: 125,
				},
			},
		});
	});
});
