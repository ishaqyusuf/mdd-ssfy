import { describe, expect, it } from "bun:test";

import { salesDispatchApprovalPendingReleased } from "../src/types/sales-dispatch-approval-pending-released";

describe("sales dispatch approval pending released notification", () => {
	it("tells the assigned driver that packing approval no longer blocks the trip", () => {
		const activity = salesDispatchApprovalPendingReleased.createActivity(
			{
				orderNo: "09100PC",
				dispatchId: 41,
				deliveryMode: "delivery",
				driverId: 7,
			},
			{ id: 3, name: "Admin" },
			{ id: 7, name: "Driver" },
		);

		expect(activity).toMatchObject({
			type: "sales_dispatch_approval_pending_released",
			subject: "Dispatch can continue",
			authorId: 3,
			tags: {
				dispatchId: 41,
				driverId: 7,
			},
		});
		expect(activity.headline).toContain("no longer blocks");
	});
});
