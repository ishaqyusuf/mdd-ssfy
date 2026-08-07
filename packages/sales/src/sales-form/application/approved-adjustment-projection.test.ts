import { describe, expect, it } from "bun:test";
import {
	LEGACY_ADJUSTMENT_SAVE_BLOCKED,
	assertLegacySalesFormWritable,
	hasApprovedAdjustmentSnapshot,
	projectApprovedAdjustmentLegacyOrder,
} from "./approved-adjustment-projection";

function adjustedOrderFixture() {
	return {
		id: 91_187,
		orderId: "09187PC",
		subTotal: 952.65,
		tax: 66.69,
		grandTotal: 1019.34,
		meta: {
			ccc: 30.58,
			newSalesForm: {
				approvedAdjustmentId: "adjustment-09187PC",
				lineItems: [
					{
						id: 101,
						uid: "sales-item-101",
						qty: 2,
						unitPrice: 114.42,
						lineTotal: 228.84,
						housePackageTool: {
							totalDoors: 2,
							totalPrice: 228.84,
							doors: [
								{
									id: 1001,
									dimension: "2-0 x 6-8",
									stepProductId: 501,
									lhQty: 1,
									rhQty: 1,
									totalQty: 2,
									unitPrice: 114.42,
									lineTotal: 228.84,
									meta: { approved: true },
								},
							],
						},
					},
				],
				summary: {
					subTotal: 590.13,
					taxTotal: 41.31,
					grandTotal: 631.44,
					ccc: 18.94,
					totalWithCcc: 650.38,
				},
			},
		},
		items: [
			{
				id: 101,
				qty: 5,
				rate: 118.272,
				total: 591.36,
				meta: { uid: "sales-item-101" },
				housePackageTool: {
					id: 201,
					totalDoors: 5,
					totalPrice: 591.36,
					doors: [
						{
							id: 1001,
							dimension: "2-0 x 6-8",
							stepProductId: 501,
							lhQty: 9,
							rhQty: 9,
							totalQty: 18,
							unitPrice: 999,
							lineTotal: 999,
							meta: { legacyPresentation: "keep" },
							stepProduct: { id: 501, title: "CARRARA" },
						},
						{
							id: 1002,
							dimension: "2-6 x 6-8",
							stepProductId: 501,
							lhQty: 2,
							rhQty: 1,
							totalQty: 3,
							unitPrice: 120.84,
							lineTotal: 362.52,
						},
					],
				},
			},
		],
	};
}

describe("approved adjustment legacy projection", () => {
	it("uses the approved one-row snapshot without deleting relational enrichment", () => {
		const source = adjustedOrderFixture();
		const result = projectApprovedAdjustmentLegacyOrder(source);
		const item = result.order.items[0];
		const door = item?.housePackageTool?.doors[0];

		expect(result.adjustmentSnapshotAuthority).toBe(true);
		expect(item?.housePackageTool?.doors).toHaveLength(1);
		expect(door).toMatchObject({
			id: 1001,
			dimension: "2-0 x 6-8",
			lhQty: 1,
			rhQty: 1,
			totalQty: 2,
			unitPrice: 114.42,
			lineTotal: 228.84,
			stepProduct: { id: 501, title: "CARRARA" },
			meta: { legacyPresentation: "keep", approved: true },
		});
		expect(item).toMatchObject({ qty: 2, rate: 114.42, total: 228.84 });
		expect(item?.housePackageTool).toMatchObject({
			totalDoors: 2,
			totalPrice: 228.84,
		});
		expect(result.order).toMatchObject({
			subTotal: 590.13,
			tax: 41.31,
			grandTotal: 631.44,
			meta: { ccc: 18.94 },
		});
		expect(result.totalWithCcc).toBe(650.38);

		// The projection must stay pure; the retained audit row still exists in
		// the source object and can be used by audit/compatibility paths.
		expect(source.items[0]?.housePackageTool?.doors).toHaveLength(2);
	});

	it("keeps ordinary unadjusted orders on relational authority", () => {
		const source = adjustedOrderFixture();
		source.meta.newSalesForm.approvedAdjustmentId = "";

		const result = projectApprovedAdjustmentLegacyOrder(source);

		expect(hasApprovedAdjustmentSnapshot(source.meta)).toBe(false);
		expect(result.adjustmentSnapshotAuthority).toBe(false);
		expect(result.order).toBe(source);
		expect(result.order.items[0]?.housePackageTool?.doors).toHaveLength(2);
	});

	it("preserves an explicitly empty approved door snapshot", () => {
		const source = adjustedOrderFixture();
		const line = source.meta.newSalesForm.lineItems[0];
		if (!line?.housePackageTool) throw new Error("Expected HPT fixture line");
		line.housePackageTool.doors = [];
		line.qty = 0;
		line.lineTotal = 0;

		const result = projectApprovedAdjustmentLegacyOrder(source);

		expect(result.order.items[0]?.housePackageTool?.doors).toEqual([]);
		expect(result.order.items[0]).toMatchObject({ qty: 0, total: 0 });
	});

	it("blocks unguarded legacy saves for adjustment-owned orders", () => {
		const source = adjustedOrderFixture();

		expect(() => assertLegacySalesFormWritable(source.meta)).toThrow(
			LEGACY_ADJUSTMENT_SAVE_BLOCKED,
		);
		expect(() => assertLegacySalesFormWritable({})).not.toThrow();
	});
});
