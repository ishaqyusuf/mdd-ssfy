import { describe, expect, test } from "bun:test";

import {
	getSalesBackorderQueue,
	getSalesBackorderQueueSummary,
	getSalesPartialShipmentQueue,
	getSalesPartialShipmentQueueSummary,
} from "./sales-fulfillment-plan";

function queueLine(id: number, status = "processing") {
	return {
		id,
		uid: `line-${id}`,
		title: `Line ${id}`,
		qty: 1,
		meta: null,
		saleId: id,
		sale: {
			id,
			orderId: `ORDER-${id}`,
			status,
			inventoryStatus: null,
			prodStatus: null,
			customer: null,
		},
		salesItem: {
			id,
			description: null,
			qty: 1,
			itemDeliveries: [],
		},
		components: [
			{
				id,
				required: true,
				qty: 1,
				qtyAllocated: 0,
				qtyInbound: 0,
				qtyReceived: 0,
				status: "pending",
				inventoryId: null,
				inventoryVariantId: id,
				inventoryCategoryId: null,
				subComponentId: null,
				inventory: null,
				inventoryVariant: null,
				inventoryCategory: null,
				subComponent: null,
				stockAllocations: [],
				inboundDemands: [],
			},
		],
	};
}

function makeQueueDb() {
	const matchIds = new Set([50, 350, 420, 430]);
	const rows = Array.from({ length: 450 }, (_, index) => {
		const id = index + 1;
		if (matchIds.has(id)) {
			return queueLine(id, id === 430 ? "cancelled" : "processing");
		}
		return {
			...queueLine(id),
			components: [],
		};
	});

	return {
		lineItem: {
			findMany: async (args: {
				where?: { id?: { gt?: number } };
				take?: number;
			}) => {
				const cursor = args.where?.id?.gt ?? 0;
				return rows.filter((row) => row.id > cursor).slice(0, args.take);
			},
		},
	} as any;
}

describe("sales fulfillment queues", () => {
	test("scans beyond the former 300-candidate ceiling without skipping sparse matches", async () => {
		const db = makeQueueDb();
		const first = await getSalesBackorderQueue(db, { limit: 2 });
		expect(first.items.map((item) => item.lineItemId)).toEqual([50, 350]);
		expect(first.nextCursorId).toBe(350);

		const second = await getSalesBackorderQueue(db, {
			limit: 2,
			cursor: first.nextCursorId,
		});
		expect(second.items.map((item) => item.lineItemId)).toEqual([420]);
		expect(second.nextCursorId).toBeNull();
	});

	test("returns complete filtered summaries instead of page-only totals", async () => {
		const db = makeQueueDb();
		const backorders = await getSalesBackorderQueueSummary(db);
		const partials = await getSalesPartialShipmentQueueSummary(db);

		expect(backorders.totalCount).toBe(3);
		expect(backorders.backorderedQty).toBe(3);
		expect(partials.totalCount).toBe(3);
		expect(partials.remainingQty).toBe(3);
	});

	test("partial shipment pagination uses the same stable cursor contract", async () => {
		const page = await getSalesPartialShipmentQueue(makeQueueDb(), { limit: 2 });
		expect(page.items.map((item) => item.lineItemId)).toEqual([50, 350]);
		expect(page.nextCursorId).toBe(350);
	});
});
