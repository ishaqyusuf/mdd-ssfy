import { describe, expect, it } from "bun:test";
import type { TransactionClient } from "@gnd/db";
import { projectApprovedGroupedSalesLine } from "./sales-adjustment-grouped-projection";

type UpdateCall = {
	where: { id: number };
	data: Record<string, unknown>;
};

function createTransactionMock() {
	const salesItemUpdates: UpdateCall[] = [];
	const hptUpdates: UpdateCall[] = [];
	const tx = {
		salesOrderItems: {
			update: async (args: UpdateCall) => {
				salesItemUpdates.push(args);
				return { id: args.where.id };
			},
		},
		housePackageTools: {
			findUnique: async (args: { where: { orderItemId: number } }) => ({
				id: args.where.orderItemId + 1000,
				meta: { keep: true, priceTags: { keep: true } },
			}),
			update: async (args: UpdateCall) => {
				hptUpdates.push(args);
				return { id: args.where.id };
			},
		},
	};
	return { tx, salesItemUpdates, hptUpdates };
}

describe("approved grouped sales adjustment projection", () => {
	it("writes each moulding row quantity instead of the aggregate group quantity", async () => {
		const { tx, salesItemUpdates, hptUpdates } = createTransactionMock();
		const handled = await projectApprovedGroupedSalesLine({
			tx: tx as unknown as TransactionClient,
			salesOrderId: 26493,
			persistedItemIds: new Set([172182, 172183]),
			line: {
				id: 172182,
				uid: "line-3",
				title: "Mouldings",
				qty: 46,
				lineTotal: 452.15,
				formSteps: [{ step: { title: "Item Type" }, value: "Mouldings" }],
				meta: {
					groupUid: "line-3",
					mouldingRows: [
						{
							uid: "casing",
							salesItemId: 172182,
							primaryGroupItem: true,
							title: "Casing",
							description: "Casing",
							qty: 25,
							customPrice: 9.35,
							salesPrice: 10.53,
							basePrice: 7.9,
							lineTotal: 233.75,
							stepProductId: 888,
						},
						{
							uid: "baseboard",
							salesItemId: 172183,
							title: "Baseboard",
							description: "Baseboard",
							qty: 21,
							customPrice: 10.4,
							salesPrice: 12.8,
							basePrice: 9.6,
							lineTotal: 218.4,
							stepProductId: 888,
						},
					],
				},
			},
		});

		expect(handled).toBe(true);
		expect(salesItemUpdates.map((update) => update.data.qty)).toEqual([25, 21]);
		expect(salesItemUpdates.at(0)?.data.qty).not.toBe(46);
		expect(salesItemUpdates.map((update) => update.data.total)).toEqual([
			233.75, 218.4,
		]);
		expect(salesItemUpdates.map((update) => update.data.multiDyke)).toEqual([
			true,
			false,
		]);
		expect(hptUpdates.map((update) => update.data.totalPrice)).toEqual([
			233.75, 218.4,
		]);
	});

	it("leaves ordinary lines for the existing single-line projector", async () => {
		const { tx, salesItemUpdates, hptUpdates } = createTransactionMock();
		const handled = await projectApprovedGroupedSalesLine({
			tx: tx as unknown as TransactionClient,
			salesOrderId: 1,
			persistedItemIds: new Set([10]),
			line: { id: 10, uid: "door", title: "Door", qty: 2 },
		});

		expect(handled).toBe(false);
		expect(salesItemUpdates).toHaveLength(0);
		expect(hptUpdates).toHaveLength(0);
	});

	it("fails closed when an approved grouped row lost its persisted identity", async () => {
		const { tx } = createTransactionMock();
		expect(
			projectApprovedGroupedSalesLine({
				tx: tx as unknown as TransactionClient,
				salesOrderId: 1,
				persistedItemIds: new Set([10]),
				line: {
					uid: "services",
					title: "Services",
					meta: {
						serviceRows: [
							{ uid: "install", salesItemId: 99, service: "Install", qty: 1 },
						],
					},
				},
			}),
		).rejects.toThrow("missing its persisted sales-item identity");
	});
});
