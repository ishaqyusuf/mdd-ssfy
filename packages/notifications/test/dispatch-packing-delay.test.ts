import { describe, expect, it } from "bun:test";

import { dispatchPackingDelay } from "../src/types/dispatch-packing-delay";

describe("dispatch packing delay notification", () => {
	it("is actionable in the notification center and reports handled quantity", () => {
		const activity = dispatchPackingDelay.createActivity(
			{
				orderNo: "09176PC",
				dispatchId: 4403,
				reviewId: 2,
				reviewStatus: "APPROVED",
				itemUid: "door-1",
				itemName: "Garage door",
				pendingQty: { qty: 0, lh: 1, rh: 0 },
			},
			{ id: 1 } as never,
			{} as never,
		);

		expect(activity).toMatchObject({
			subject: "Guarded packing approved",
			headline: "Garage door (1) is approved and now counts as packed.",
			tags: { priority: 2 },
		});
	});
});
