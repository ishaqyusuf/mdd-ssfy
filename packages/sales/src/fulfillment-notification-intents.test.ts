import { expect, test } from "bun:test";
import { buildFulfillmentNotificationIntents } from "./fulfillment-notification-intents";

const input = {
	requestId: "command-1",
	salesId: 1,
	fulfillmentId: 2,
	actorId: 3,
	driverId: 4,
	changed: true,
	kind: "created" as const,
	dueDate: "2026-09-11",
	deliveryMode: "delivery" as const,
};

test("completion snapshots the current driver and administrator attribution", () => {
	const notices = buildFulfillmentNotificationIntents({ ...input, kind: "completed", previousDriverId: 5, completedByAdmin: true });
	expect(notices).toHaveLength(1);
	expect(notices[0]).toMatchObject({ channel: "sales_dispatch_completed", eventKey: "command-1:sales_dispatch_completed:4", recipientId: 4, completedByAdmin: true });
	expect(buildFulfillmentNotificationIntents({ ...input, kind: "completed", driverId: null })).toEqual([]);
});

test("creation persists a stable notice identity for the assigned driver", () => {
	const notices = buildFulfillmentNotificationIntents(input);
	expect(notices).toEqual([
		{
			version: 1,
			eventKey: "command-1:sales_dispatch_assigned:4",
			channel: "sales_dispatch_assigned",
			recipientId: 4,
			actorId: 3,
			salesId: 1,
			fulfillmentId: 2,
			dueDate: "2026-09-11",
			deliveryMode: "delivery" as const,
		},
	]);
	expect(buildFulfillmentNotificationIntents(input)).toEqual(notices);
});

test("reassignment records removal and new assignment without a duplicate update notice", () => {
	const notices = buildFulfillmentNotificationIntents({
		...input,
		kind: "updated",
		previousDriverId: 5,
	});
	expect(
		notices.map(({ channel, recipientId }) => ({ channel, recipientId })),
	).toEqual([
		{ channel: "sales_dispatch_unassigned", recipientId: 5 },
		{ channel: "sales_dispatch_assigned", recipientId: 4 },
	]);
});

test("same-driver changes create one update; no-op and unassigned creation create none", () => {
	expect(
		buildFulfillmentNotificationIntents({
			...input,
			kind: "updated",
			previousDriverId: 4,
		}).map((notice) => notice.channel),
	).toEqual(["sales_dispatch_updated"]);
	expect(
		buildFulfillmentNotificationIntents({ ...input, changed: false }),
	).toEqual([]);
	expect(
		buildFulfillmentNotificationIntents({ ...input, driverId: null }),
	).toEqual([]);
	expect(
		buildFulfillmentNotificationIntents({
			...input,
			kind: "updated",
			previousDriverId: 4,
			driverId: null,
		}).map((notice) => notice.channel),
	).toEqual(["sales_dispatch_unassigned"]);
});
