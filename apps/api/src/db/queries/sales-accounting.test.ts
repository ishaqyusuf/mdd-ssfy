import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";

import { getSalesAccountings } from "./sales-accounting";

type Customer = {
	businessName: string | null;
	name: string | null;
} | null;

function makeTransaction({
	id,
	walletCustomer,
	orderCustomers,
}: {
	id: number;
	walletCustomer: Customer;
	orderCustomers: Customer[];
}) {
	return {
		id,
		statusNote: null,
		amount: 100,
		createdAt: new Date("2026-07-29T12:00:00.000Z"),
		description: "Payment",
		status: "success",
		paymentMethod: "cash",
		meta: null,
		history: [],
		author: null,
		wallet: walletCustomer ? { customer: walletCustomer } : null,
		salesPayments: orderCustomers.map((customer, index) => ({
			amount: 100,
			status: "success",
			meta: null,
			order: {
				subTotal: 100,
				orderId: `ORDER-${id}-${index + 1}`,
				grandTotal: 100,
				extraCosts: [],
				salesRep: null,
				customer,
			},
		})),
	};
}

describe("sales accounting customer names", () => {
	it("returns business, personal, deduplicated, and missing customer names", async () => {
		const transactions = [
			makeTransaction({
				id: 1,
				walletCustomer: {
					businessName: "Acme Doors",
					name: "Ada Lovelace",
				},
				orderCustomers: [
					{
						businessName: "Other Builders",
						name: "Different Customer",
					},
				],
			}),
			makeTransaction({
				id: 2,
				walletCustomer: null,
				orderCustomers: [
					{
						businessName: null,
						name: "Grace Hopper",
					},
				],
			}),
			makeTransaction({
				id: 3,
				walletCustomer: null,
				orderCustomers: [
					{
						businessName: "Alpha Millwork",
						name: null,
					},
					{
						businessName: "Alpha Millwork",
						name: null,
					},
					{
						businessName: "Beta Builders",
						name: null,
					},
				],
			}),
			makeTransaction({
				id: 4,
				walletCustomer: null,
				orderCustomers: [null],
			}),
		];
		let findManyArgs: Prisma.CustomerTransactionFindManyArgs | undefined;
		const ctx = {
			db: {
				customerTransaction: {
					count: async () => transactions.length,
					findMany: async (args: Prisma.CustomerTransactionFindManyArgs) => {
						findManyArgs = args;
						return transactions;
					},
				},
			},
		};

		const result = await getSalesAccountings(ctx as unknown as TRPCContext, {
			size: 20,
		});

		expect(findManyArgs?.select).toMatchObject({
			wallet: {
				select: {
					customer: {
						select: {
							businessName: true,
							name: true,
						},
					},
				},
			},
			salesPayments: {
				select: {
					order: {
						select: {
							customer: {
								select: {
									businessName: true,
									name: true,
								},
							},
						},
					},
				},
			},
		});
		expect(result.data.map((row) => row.customerName)).toEqual([
			"Acme Doors",
			"Grace Hopper",
			"Alpha Millwork, Beta Builders",
			null,
		]);
	});
});
