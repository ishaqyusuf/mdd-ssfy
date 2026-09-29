import { describe, expect, test } from "bun:test";
import { buildDealerDoorProjection } from "./dealer-door-projection";

describe("dealer door office projection", () => {
	test("stores office-priced door rows and workflow selections", () => {
		const result = buildDealerDoorProjection({
			uid: "dealer-door",
			title: "Interior pre-hung",
			customerLineTotal: 157.56,
			internalLineTotal: 126.05,
			itemIndex: 0,
			formSteps: [
				{
					stepId: 1,
					componentId: 1,
					prodUid: "root",
					value: "Interior pre-hung",
				},
				{
					stepId: 51,
					componentId: 978,
					prodUid: "door",
					price: 100.96,
					meta: {
						selectedComponents: [{ id: 978, uid: "door", salesPrice: 100.96 }],
					},
				},
				{
					stepId: 61,
					meta: {
						selectedComponents: [{ id: 1656, salesPrice: 56.6 }],
					},
				},
			],
			housePackageTool: {
				doors: [
					{
						dimension: "2-6 x 6-8",
						lhQty: 1,
						totalQty: 1,
						lineTotal: 157.56,
						unitPrice: 157.56,
						stepProductId: 978,
						meta: {
							doorSalesUnitPrice: 100.96,
							sharedDoorSurcharge: 56.6,
							baseUnitPrice: 0,
						},
					},
				],
			},
		});
		expect(result?.item).toMatchObject({ qty: 1, total: 126.05 });
		expect(result?.housePackageTool).toMatchObject({
			totalDoors: 1,
			totalPrice: 126.05,
			doors: [
				{
					unitPrice: 126.05,
					lineTotal: 126.05,
					jambSizePrice: 80.77,
					meta: { sharedDoorSurcharge: 45.28 },
				},
			],
		});
		expect(result?.formSteps[1]?.price).toBe(80.77);
		const selected = result?.formSteps[2]?.meta.selectedComponents as
			| Array<{ salesPrice: number }>
			| undefined;
		expect(selected?.[0]?.salesPrice).toBe(45.28);
	});

	test("allocates cents across door sizes without losing the office total", () => {
		const result = buildDealerDoorProjection({
			uid: "two-sizes",
			customerLineTotal: 0.06,
			internalLineTotal: 0.05,
			itemIndex: 1,
			housePackageTool: {
				doors: ["2-6 x 6-8", "2-8 x 6-8", "3-0 x 6-8"].map((dimension) => ({
					dimension,
					lhQty: 1,
					totalQty: 1,
					unitPrice: 0.02,
					lineTotal: 0.02,
				})),
			},
		});
		expect(
			result?.housePackageTool.doors.map((door) => door.lineTotal),
		).toEqual([0.02, 0.02, 0.01]);
		expect(result?.item.total).toBe(0.05);
	});
});
