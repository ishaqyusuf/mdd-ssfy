import { describe, expect, test } from "bun:test";

import { packingInfo } from "./packing";

describe("packingInfo", () => {
	test("excludes unpacked audit rows from a dispatch packing slip", () => {
		const sale = {
			deliveries: [
				{
					id: 4602,
					items: [
						{
							orderItemId: 171898,
							orderDeliveryId: 4602,
							qty: 1,
							lhQty: 0,
							rhQty: 1,
							packingStatus: "packed",
							submission: { assignment: { salesDoorId: 66434 } },
						},
						{
							orderItemId: 171898,
							orderDeliveryId: 4602,
							qty: 1,
							lhQty: 0,
							rhQty: 1,
							packingStatus: "unpacked",
							submission: { assignment: { salesDoorId: 66434 } },
						},
					],
				},
			],
		};

		expect(packingInfo(sale as never, 171898, 66434, 4602)).toBe("1 RH");
	});
});
