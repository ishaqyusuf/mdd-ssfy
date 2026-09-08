import { expect, it } from "bun:test";
import { placeDispatchOrderDate } from "./order-date-layout";

it("places Order Date after Schedule or Completed in saved layouts", () => {
	for (const schedule of ["dueDate", "completedAt"]) {
		const ids = [
			"select",
			schedule,
			"orderDate",
			"orderId",
			"driver",
			"actions",
		];
		expect(
			placeDispatchOrderDate(
				["select", schedule, "driver", "orderId", "orderDate", "actions"],
				ids,
			),
		).toEqual([
			"select",
			schedule,
			"orderDate",
			"driver",
			"orderId",
			"actions",
		]);
		expect(placeDispatchOrderDate([], ids)).toEqual(ids);
	}
});
