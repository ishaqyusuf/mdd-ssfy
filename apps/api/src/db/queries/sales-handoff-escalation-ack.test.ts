import { describe, expect, test } from "bun:test";
import {
	acknowledgeAllSalesHandoffEscalationNotifications,
	acknowledgeSalesHandoffEscalationNotification,
	updateAllNotificationStatusesWithSalesHandoffAcknowledgement,
	updateNotificationStatusWithSalesHandoffAcknowledgement,
} from "./sales-handoff-escalation-ack";

describe("Sales Handoff escalation acknowledgement", () => {
	test("binds acknowledgement to the authenticated recipient and stays separate from resolution", async () => {
		const queries: unknown[] = [];
		const db = {
			salesHandoffActionEscalationRecipient: {
				updateMany: async (input: unknown) => {
					queries.push(input);
					return { count: 1 };
				},
			},
		};
		const now = new Date("2026-08-24T14:02:00.000Z");
		await acknowledgeSalesHandoffEscalationNotification(db as never, {
			actorUserId: 7,
			notificationActivityId: 501,
			now,
		});
		await acknowledgeAllSalesHandoffEscalationNotifications(db as never, {
			actorUserId: 7,
			notificationActivityIds: [501, 502],
			now,
		});
		expect(queries).toEqual([
			{
				where: {
					recipientUserId: 7,
					notificationActivityId: 501,
					acknowledgedAt: null,
				},
				data: { acknowledgedAt: now },
			},
			{
				where: {
					recipientUserId: 7,
					notificationActivityId: { in: [501, 502] },
					acknowledgedAt: null,
				},
				data: { acknowledgedAt: now },
			},
		]);
		expect(JSON.stringify(queries)).not.toContain("resolvedAt");
	});

	test("updates notification status and acknowledgement in one transaction", async () => {
		let transactionActive = false;
		let transactions = 0;
		const operations: string[] = [];
		const db = {
			noteRecipients: {
				findMany: async () => {
					expect(transactionActive).toBe(true);
					operations.push("select-all");
					return [{ notePadId: 501 }, { notePadId: 502 }];
				},
				updateMany: async () => {
					expect(transactionActive).toBe(true);
					operations.push("status");
					return { count: 2 };
				},
			},
			salesHandoffActionEscalationRecipient: {
				updateMany: async () => {
					expect(transactionActive).toBe(true);
					operations.push("acknowledgement");
					return { count: 2 };
				},
			},
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
				transactions += 1;
				transactionActive = true;
				try {
					return await callback(db);
				} finally {
					transactionActive = false;
				}
			},
		};

		await updateNotificationStatusWithSalesHandoffAcknowledgement(db as never, {
			actorUserId: 7,
			notePadContactId: 70,
			notificationActivityId: 501,
			status: "read",
		});
		await updateAllNotificationStatusesWithSalesHandoffAcknowledgement(
			db as never,
			{
				actorUserId: 7,
				notePadContactId: 70,
				status: "archived",
				fromStatus: ["read"],
			},
		);

		expect(transactions).toBe(2);
		expect(operations).toEqual([
			"status",
			"acknowledgement",
			"select-all",
			"status",
			"acknowledgement",
		]);
	});
});
