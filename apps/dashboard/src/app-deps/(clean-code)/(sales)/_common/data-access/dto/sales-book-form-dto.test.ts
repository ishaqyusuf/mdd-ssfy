import { describe, expect, it } from "bun:test";
import { transformSalesBookForm as transformCurrentSalesBookForm } from "@/app/(clean-code)/(sales)/_common/data-access/dto/sales-book-form-dto";
import { Prisma } from "@gnd/db";
import { projectApprovedAdjustmentLegacyOrder } from "@gnd/sales/sales-form/application/approved-adjustment-projection";
import { transformSalesBookForm as transformLegacySalesBookForm } from "./sales-book-form-dto";

const transformers = [
	["current", transformCurrentSalesBookForm],
	["legacy dependency", transformLegacySalesBookForm],
] as const;

function createShelfSalesFormData() {
	const createdAt = new Date("2026-07-18T00:00:00.000Z");
	const shelfItem = {
		id: 366,
		salesOrderItemId: 166_050,
		description: "Shelf line",
		productId: 99,
		categoryId: 20,
		qty: 1,
		unitPrice: new Prisma.Decimal("380.38"),
		totalPrice: new Prisma.Decimal("380.38"),
		meta: {
			itemIndex: 0,
			lineUid: "shelf-line-1",
			categoryUid: "10-20",
			basePrice: 247,
			customPrice: false,
		},
		createdAt,
		updatedAt: createdAt,
		deletedAt: null,
	};

	return {
		order: {
			id: 1,
			orderId: "00003DPP",
			createdAt,
			items: [
				{
					id: 166_050,
					description: "Shelf item",
					dykeDescription: "Shelf Items",
					meta: { lineIndex: 0, tax: false },
					formSteps: [],
					shelfItems: [shelfItem],
					housePackageTool: null,
					multiDykeUid: null,
					multiDyke: false,
					qty: 1,
					rate: 380.38,
					total: 380.38,
					dykeProduction: false,
				},
			],
			payments: [],
		},
		stepComponents: [],
	};
}

function createAdjustedDoorSalesFormData() {
	const source = {
		id: 91_187,
		orderId: "09187PC",
		createdAt: new Date("2026-08-05T00:00:00.000Z"),
		subTotal: 952.65,
		tax: 66.69,
		grandTotal: 1019.34,
		meta: {
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
		payments: [],
		items: [
			{
				id: 101,
				description: "Interior pre-hung",
				dykeDescription: "Interior pre-hung",
				meta: { uid: "sales-item-101", lineIndex: 0 },
				formSteps: [],
				shelfItems: [],
				multiDykeUid: null,
				multiDyke: false,
				qty: 5,
				rate: 118.272,
				total: 591.36,
				dykeProduction: false,
				housePackageTool: {
					id: 201,
					moldingId: null,
					totalDoors: 5,
					totalPrice: 591.36,
					meta: {},
					stepProduct: null,
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
							deletedAt: null,
							priceId: 1,
							stepProduct: { id: 501, uid: "door-501" },
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
							deletedAt: null,
							priceId: 2,
							stepProduct: { id: 501, uid: "door-501" },
						},
					],
				},
			},
		],
	};
	const projected = projectApprovedAdjustmentLegacyOrder(source);
	return {
		order: projected.order,
		stepComponents: [],
		adjustmentSnapshotAuthority: projected.adjustmentSnapshotAuthority,
		approvedSnapshotTotalWithCcc: projected.totalWithCcc,
	};
}

describe("sales book form shelf-price serialization", () => {
	for (const [name, transform] of transformers) {
		it(`${name} transformer returns plain numbers in every client-facing order branch`, () => {
			const output = transform(createShelfSalesFormData() as never);

			for (const order of [output.order, output._rawData]) {
				const shelfItem = order.items[0]?.shelfItems[0];
				expect(typeof shelfItem?.unitPrice).toBe("number");
				expect(typeof shelfItem?.totalPrice).toBe("number");
				expect(shelfItem?.unitPrice).toBe(380.38);
				expect(shelfItem?.totalPrice).toBe(380.38);
				expect(order.createdAt instanceof Date).toBe(true);
			}
		});
	}
});

describe("sales book form approved adjustment projection", () => {
	for (const [name, transform] of transformers) {
		it(`${name} transformer does not restore a removed approved door row`, () => {
			const output = transform(createAdjustedDoorSalesFormData() as never);

			expect(output.adjustmentSnapshotAuthority).toBe(true);
			expect(output.approvedSnapshotTotalWithCcc).toBe(650.38);
			expect(output.deleteDoors).toEqual([]);
			expect(output.order.subTotal).toBe(590.13);
			expect(output.order.items[0]?.total).toBe(228.84);
			expect(output.order.items[0]?.housePackageTool?.doors?.length).toBe(1);
			const retainedDoor =
				output.itemArray[0]?.item?.housePackageTool?._doorForm?.[
					"door-501-2-0 x 6-8"
				];
			expect(retainedDoor?.id).toBe(1001);
			expect(retainedDoor?.dimension).toBe("2-0 x 6-8");
		});
	}
});
