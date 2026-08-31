import { describe, expect, test } from "bun:test";

import { transformNotifications } from "../src/notification-center";

function notification(reviewStatus: "PENDING" | "APPROVED" | "REJECTED") {
	return transformNotifications([
		{
			id: 1,
			subject: "Guarded packing",
			headline: "Packing status changed.",
			tags: {
				type: "dispatch_packing_delay",
				source: "user",
				priority: 2,
				orderNo: "09176PC",
				dispatchId: 4403,
				reviewStatus,
				itemUid: "door-1",
				itemName: "Door",
				pendingQty: { qty: 1 },
			},
		},
	])[0];
}

describe("dispatch packing notification actions", () => {
	test("labels pending reviews separately from driver status updates", () => {
		expect(notification("PENDING")?.action?.label).toBe("Review");
		expect(notification("APPROVED")?.action?.label).toBe("View dispatch");
		expect(notification("REJECTED")?.action?.label).toBe("View dispatch");
	});

	test("turns current dispatch lifecycle events into typed stop actions", () => {
		const channels = [
			"sales_dispatch_created",
			"sales_dispatch_approval_pending_released",
			"sales_dispatch_unassigned",
			"sales_dispatch_queued",
			"sales_dispatch_packed",
			"sales_dispatch_packing_reset",
			"sales_dispatch_in_progress",
			"sales_dispatch_trip_canceled",
			"sales_dispatch_date_updated",
			"sales_dispatch_completed",
		];
		for (const channel of channels) {
			const item = transformNotifications([
				{
					id: channel,
					tags: {
						type: channel,
						source: "user",
						priority: 3,
						dispatchId: 4403,
					},
				},
			])[0];
			expect(item?.action?.type).toBe(channel);
			expect(item?.action?.label).toBe("Open Dispatch");
		}
	});
});
