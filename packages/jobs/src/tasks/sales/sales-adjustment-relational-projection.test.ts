import { describe, expect, it } from "bun:test";
import type { TransactionClient } from "@gnd/db";

import {
	projectApprovedSalesTaxes,
	projectApprovedShelfSalesLine,
} from "./sales-adjustment-relational-projection";

function createTransactionMock() {
	type MutationArgs = Record<string, unknown>;
	const shelfUpdates: MutationArgs[] = [];
	const shelfCreates: MutationArgs[] = [];
	const shelfRetirements: MutationArgs[] = [];
	const taxDeletes: MutationArgs[] = [];
	const taxCreates: MutationArgs[] = [];
	const tx = {
		dykeSalesShelfItem: {
			findMany: async () => [
				{ id: 392, categoryId: 379, productId: 755 },
				{ id: 393, categoryId: 380, productId: 756 },
			],
			update: async (args: MutationArgs) => {
				shelfUpdates.push(args);
				return { id: (args.where as { id: number }).id };
			},
			create: async (args: MutationArgs) => {
				shelfCreates.push(args);
				return { id: 500 };
			},
			updateMany: async (args: MutationArgs) => {
				shelfRetirements.push(args);
				return { count: 1 };
			},
		},
		salesTaxes: {
			deleteMany: async (args: MutationArgs) => {
				taxDeletes.push(args);
				return { count: 2 };
			},
			create: async (args: MutationArgs) => {
				taxCreates.push(args);
				return args.data;
			},
		},
	};
	return {
		tx: tx as unknown as TransactionClient,
		shelfUpdates,
		shelfCreates,
		shelfRetirements,
		taxDeletes,
		taxCreates,
	};
}

describe("approved adjustment relational projection", () => {
	it("updates approved Shelf children and retires omitted rows", async () => {
		const { tx, shelfUpdates, shelfCreates, shelfRetirements } =
			createTransactionMock();

		await projectApprovedShelfSalesLine({
			tx,
			salesOrderItemId: 172467,
			line: {
				shelfItems: [
					{
						id: 392,
						categoryId: 379,
						productId: 755,
						description: "Pocket Door Frame",
						qty: 2,
						unitPrice: 144.62,
						totalPrice: 289.24,
						meta: { productRowUid: "shelf-product-1" },
					},
				],
			},
		});

		expect(shelfUpdates).toHaveLength(1);
		expect(shelfUpdates[0]).toMatchObject({
			where: { id: 392 },
			data: { qty: 2, unitPrice: 144.62, totalPrice: 289.24 },
		});
		expect(shelfCreates).toHaveLength(0);
		expect(shelfRetirements[0]).toMatchObject({
			where: {
				salesOrderItemId: 172467,
				deletedAt: null,
				id: { notIn: [392] },
			},
		});
	});

	it("creates a second approved row instead of reusing one matching product twice", async () => {
		const { tx, shelfUpdates, shelfCreates, shelfRetirements } =
			createTransactionMock();

		await projectApprovedShelfSalesLine({
			tx,
			salesOrderItemId: 172467,
			line: {
				shelfItems: [
					{
						id: 392,
						categoryId: 379,
						productId: 755,
						qty: 1,
						unitPrice: 144.62,
						totalPrice: 144.62,
					},
					{
						categoryId: 379,
						productId: 755,
						qty: 2,
						unitPrice: 144.62,
						totalPrice: 289.24,
					},
				],
			},
		});

		expect(shelfUpdates).toHaveLength(1);
		expect(shelfCreates).toHaveLength(1);
		expect(shelfCreates[0]).toMatchObject({
			data: { productId: 755, qty: 2, totalPrice: 289.24 },
		});
		expect(shelfRetirements[0]).toMatchObject({
			where: { id: { notIn: [392, 500] } },
		});
	});

	it("replaces stale tax rows with the approved tax summary", async () => {
		const { tx, taxDeletes, taxCreates } = createTransactionMock();

		await projectApprovedSalesTaxes({
			tx,
			salesOrderId: 26567,
			proposal: { meta: { taxCode: "ZSCK" } },
			summary: { taxableSubTotal: 5016.38, taxTotal: 351.15 },
		});

		expect(taxDeletes).toEqual([{ where: { salesId: 26567 } }]);
		expect(taxCreates).toEqual([
			{
				data: {
					salesId: 26567,
					taxCode: "ZSCK",
					taxxable: 5016.38,
					tax: 351.15,
				},
			},
		]);
	});
});
