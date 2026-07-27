import { describe, expect, it } from "bun:test";
import { transformSalesBookForm as transformCurrentSalesBookForm } from "@/app/(clean-code)/(sales)/_common/data-access/dto/sales-book-form-dto";
import { Prisma } from "@gnd/db";
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
