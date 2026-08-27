import { describe, expect, it } from "bun:test";
import type { TransactionClient } from "@gnd/db";
import { projectApprovedGroupedSalesLine } from "./sales-adjustment-grouped-projection";

type UpdateCall = {
	where: { id: number };
	data: Record<string, unknown>;
};

type UpdateManyCall = {
	where: Record<string, unknown>;
	data: Record<string, unknown>;
};

function createTransactionMock() {
	const salesItemUpdates: UpdateCall[] = [];
	const hptUpdates: UpdateCall[] = [];
	const salesItemRetirements: UpdateManyCall[] = [];
	const hptRetirements: UpdateManyCall[] = [];
	const doorRetirements: UpdateManyCall[] = [];
	const tx = {
		salesOrderItems: {
			update: async (args: UpdateCall) => {
				salesItemUpdates.push(args);
				return { id: args.where.id };
			},
			updateMany: async (args: UpdateManyCall) => {
				salesItemRetirements.push(args);
				return { count: 0 };
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
			updateMany: async (args: UpdateManyCall) => {
				hptRetirements.push(args);
				return { count: 0 };
			},
		},
		dykeSalesDoors: {
			updateMany: async (args: UpdateManyCall) => {
				doorRetirements.push(args);
				return { count: 0 };
			},
		},
	};
	return {
		tx,
		salesItemUpdates,
		hptUpdates,
		salesItemRetirements,
		hptRetirements,
		doorRetirements,
	};
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

	it("projects grouped service rows with their own flags and prices", async () => {
		const { tx, salesItemUpdates, hptUpdates } = createTransactionMock();
		const handled = await projectApprovedGroupedSalesLine({
			tx: tx as unknown as TransactionClient,
			salesOrderId: 7,
			persistedItemIds: new Set([41, 42]),
			line: {
				uid: "service-group",
				title: "Services",
				meta: {
					serviceRows: [
						{
							uid: "delivery",
							salesItemId: 41,
							primaryGroupItem: true,
							service: "Delivery",
							qty: 2,
							unitPrice: 35,
							taxxable: true,
							produceable: false,
						},
						{
							uid: "installation",
							salesItemId: 42,
							service: "Installation",
							qty: 1,
							unitPrice: 80,
							taxxable: false,
							produceable: true,
						},
					],
				},
			},
		});

		expect(handled).toBe(true);
		expect(salesItemUpdates.map((update) => update.data.qty)).toEqual([2, 1]);
		expect(salesItemUpdates.map((update) => update.data.rate)).toEqual([
			35, 80,
		]);
		expect(salesItemUpdates.map((update) => update.data.total)).toEqual([
			70, 80,
		]);
		expect(
			salesItemUpdates.map((update) => update.data.dykeProduction),
		).toEqual([false, true]);
		expect(hptUpdates).toHaveLength(0);
	});

	it("retires persisted grouped siblings omitted from an approved reduction", async () => {
		const { tx, salesItemRetirements, hptRetirements, doorRetirements } =
			createTransactionMock();
		const handled = await projectApprovedGroupedSalesLine({
			tx: tx as unknown as TransactionClient,
			salesOrderId: 26569,
			persistedItemIds: new Set([172482, 172484, 172494]),
			line: {
				uid: "service-group",
				title: "Services",
				meta: {
					serviceRows: [
						{
							uid: "bypass-track",
							salesItemId: 172482,
							primaryGroupItem: true,
							service: "BYPASS TRACK 5-0 HEAVY DUTY",
							groupUid: "service-group",
							qty: 2,
							unitPrice: 140,
							lineTotal: 280,
						},
					],
				},
			},
		});

		expect(handled).toBe(true);
		expect(salesItemRetirements).toHaveLength(1);
		expect(salesItemRetirements[0]?.where).toMatchObject({
			salesOrderId: 26569,
			multiDykeUid: "service-group",
			deletedAt: null,
			id: { notIn: [172482] },
		});
		expect(salesItemRetirements[0]?.data.deletedAt).toBeInstanceOf(Date);
		expect(hptRetirements).toHaveLength(1);
		expect(doorRetirements).toHaveLength(1);
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
