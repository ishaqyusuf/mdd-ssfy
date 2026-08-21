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

	it("queues payment activity even when the sale has no notification recipient", async () => {
		const triggered: Array<{ taskId: string; payload: unknown }> = [];
		const tasks = {
			trigger: async (taskId: string, payload: unknown) => {
				triggered.push({ taskId, payload });
				return {};
			},
		};

		await sendPaymentSystemNotifications(
			tasks,
			{ db: {} as never, userId: 9 },
			[
				{
					type: "sales_payment_recorded",
					recipientEmployeeId: null,
					author: { id: 9, role: "employee" },
					payload: {
						salesId: 10,
						orderNo: "ORD-10",
						amount: 100,
						paymentMethod: "terminal",
					},
				},
			],
		);

		expect(triggered).toEqual([
			{
				taskId: "notification",
				payload: {
					channel: "sales_payment_recorded",
					recipients: null,
					author: { id: 9, role: "employee" },
					payload: {
						salesId: 10,
						orderNo: "ORD-10",
						amount: 100,
						paymentMethod: "terminal",
					},
				},
			},
		]);
	});
});
