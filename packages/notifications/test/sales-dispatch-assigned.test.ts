import { describe, expect, it } from "bun:test";

import { transformNotifications } from "../src/notification-center";
import { salesDispatchAssigned } from "../src/types/sales-dispatch-assigned";
import { salesDispatchDateUpdated } from "../src/types/sales-dispatch-date-updated";
import { salesDispatchUnassigned } from "../src/types/sales-dispatch-unassigned";

describe("dispatch assignment notification", () => {
	it("is visible and actionable in the driver's notification center", () => {
		const activity = salesDispatchAssigned.createActivity(
			{
				orderNo: "09439PC",
				dispatchId: 4602,
				deliveryMode: "delivery",
				driverId: 55,
			},
			{ id: 1 } as never,
			{} as never,
		);
		expect(activity).toMatchObject({
			subject: "Dispatch assigned",
			tags: { priority: 2, dispatchId: 4602, driverId: 55 },
		});

		const notification = transformNotifications([{ id: 1, ...activity }])[0];
		expect(notification?.action).toMatchObject({
			type: "sales_dispatch_assigned",
			label: "Open Dispatch",
		});

		const storedNotification = transformNotifications([
			{
				id: 2,
				...activity,
				tags: {
					...activity.tags,
					dueDate: "2026-09-04T00:00:00.000Z",
				},
			},
		])[0];
		expect(storedNotification?.action).toMatchObject({
			type: "sales_dispatch_assigned",
			label: "Open Dispatch",
		});
	});

	it("surfaces unassignment and date-change lifecycle events", () => {
		const handlers = [
			{
				type: "sales_dispatch_unassigned",
				handler: salesDispatchUnassigned,
			},
			{
				type: "sales_dispatch_date_updated",
				handler: salesDispatchDateUpdated,
			},
		] as const;

		for (const { handler, type } of handlers) {
			const activity = handler.createActivity(
				{
					orderNo: "09439PC",
					dispatchId: 4602,
					deliveryMode: "delivery",
					driverId: 55,
				},
				{ id: 1 } as never,
				{} as never,
			);
			expect(activity.tags).toMatchObject({ priority: 2 });
			const notification = transformNotifications([
				{
					id: type,
					...activity,
					tags: {
						...activity.tags,
						dueDate: "2026-09-04T00:00:00.000Z",
					},
				},
			])[0];
			expect(notification?.action).toMatchObject({
				type,
				label: "Open Dispatch",
			});
		}
	});
});
