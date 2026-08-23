import { describe, expect, test } from "bun:test";
import { transformNotifications } from "../src/notification-center";

describe("Sales Handoff escalation notification", () => {
	test("parses the protected Material/Production deep-link snapshot", () => {
		const [notification] = transformNotifications([
			{
				id: 501,
				subject: "Paid sales need action",
				headline: "#09388PC — Production has been open for one business day.",
				tags: {
					type: "sales_handoff_action_escalation",
					source: "system",
					priority: 8,
					actionEpochId: "epoch-1",
					salesOrderId: 91,
					orderId: "09388PC",
					actionType: "PRODUCTION",
					responsibleRepId: 17,
					responsibleRepName: "Pablo",
					openedAt: "2026-08-21T14:00:00.000Z",
					targetControlUid: "door-10",
				},
			},
		]);
		expect(notification).toMatchObject({
			isClickable: true,
			action: {
				type: "sales_handoff_action_escalation",
				label: "Open Action",
				data: {
					orderId: "09388PC",
					actionType: "PRODUCTION",
					targetControlUid: "door-10",
				},
			},
		});
	});
});
