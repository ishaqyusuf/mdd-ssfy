// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import {
	calculateDealerQuotePricing,
	convertDealerPortalQuoteToOrder,
	getDealerPortalSalesDocument,
	getDealerPortalSalesDocuments,
	saveDealerPortalQuote,
	saveDealerPortalCustomer,
} from "./dealers";

describe("dealer portal pricing", () => {
	it("keeps internal and dealer customer pricing snapshots separate", () => {
		const result = calculateDealerQuotePricing({
			createdAt: "2026-05-18T00:00:00.000Z",
			taxRate: 10,
			internalProfile: {
				id: 1,
				title: "Dealer Standard",
				coefficient: 1,
			},
			dealerProfile: {
				id: 2,
				title: "Retail",
				coefficient: 1.5,
			},
			lineItems: [
				{
					uid: "line-1",
					title: "Door",
					qty: 2,
					unitPrice: 100,
				},
			],
		});

		expect(result.source).toBe("dealer_portal_dual_pricing");
		expect(result.createdAt).toBe("2026-05-18T00:00:00.000Z");
		expect(result.profiles.internal).toEqual({
			id: 1,
			label: "Dealer Standard",
			coefficient: 1,
		});
		expect(result.profiles.dealer).toEqual({
			id: 2,
			label: "Retail",
			coefficient: 1.5,
		});
		expect(result.lines[0]).toMatchObject({
			internalUnitPrice: 100,
			internalLineTotal: 200,
			dealerUnitPrice: 150,
			dealerLineTotal: 300,
		});
		expect(result.internalPricing.grandTotal).toBe(220);
		expect(result.dealerPricing.grandTotal).toBe(330);
	});
});

describe("dealer portal isolation", () => {
	it("rejects assigning another dealer's sales profile to a dealer customer", async () => {
		const db = {
			customerTypes: {
				findFirst: async () => null,
			},
			customers: {
				create: async () => {
					throw new Error("Customer create should not run.");
				},
			},
		};

		await expect(
			saveDealerPortalCustomer(db as any, 10, {
				name: "Retail Buyer",
				email: "buyer@example.com",
				customerTypeId: 99,
			}),
		).rejects.toThrow("Dealer sales profile could not be found.");
	});

	it("does not expose raw sales order item metadata in dealer document detail", async () => {
		let capturedWhere: Record<string, unknown> | null = null;
		const document = await getDealerPortalSalesDocument(
			{
				salesOrders: {
					findFirst: async ({ where }: { where: Record<string, unknown> }) => {
						capturedWhere = where;
						return {
						id: 55,
						orderId: "DQ-55",
						title: "Dealer Quote",
						status: "Draft",
						type: "quote",
						grandTotal: 100,
						amountDue: 100,
						taxPercentage: 0,
						customerId: 20,
						customerProfileId: 30,
						dealerSalesProfileId: 40,
						meta: {
							dealerPricing: {
								summary: {
									grandTotal: 150,
								},
							},
						},
						customer: {
							id: 20,
							name: "Customer",
							businessName: null,
							email: "customer@example.com",
							customerTypeId: 40,
						},
						items: [
							{
								id: 1,
								description: "Door",
								dykeDescription: "Entry Door",
								qty: 1,
								rate: 100,
								total: 100,
								meta: {
									uid: "line-1",
									title: "Entry Door",
									internalUnitPrice: 100,
									internalLineTotal: 100,
									dealerUnitPrice: 150,
									dealerLineTotal: 150,
								},
							},
						],
					};
					},
				},
			} as any,
			10,
			55,
		);

		expect(capturedWhere).toMatchObject({
			id: 55,
			dealerAuthId: 10,
			deletedAt: null,
		});
		expect("meta" in document).toBe(false);
		expect("items" in document).toBe(false);
		expect(document.lineItems).toEqual([
			{
				uid: "line-1",
				title: "Entry Door",
				description: "Door",
				qty: 1,
				unitPrice: 150,
				lineTotal: 150,
			},
		]);
	});

	it("rejects saving a quote with another dealer's sales profile", async () => {
		const tx = {
			customers: {
				findFirst: async () => ({
					id: 20,
					customerTypeId: null,
				}),
			},
			customerTypes: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) =>
					where.dealerOwnerId === null
						? {
								id: 1,
								title: "Dealer Standard",
								coefficient: 1,
							}
						: null,
			},
			salesOrders: {
				create: async () => {
					throw new Error("Quote create should not run.");
				},
			},
		};
		const db = {
			$transaction: async (callback: (transaction: typeof tx) => unknown) =>
				callback(tx),
		};

		await expect(
			saveDealerPortalQuote(db as any, 10, {
				customerId: 20,
				customerProfileId: 99,
				taxRate: 0,
				lineItems: [
					{
						uid: "line-1",
						title: "Door",
						qty: 1,
						unitPrice: 100,
					},
				],
			}),
		).rejects.toThrow("Dealer sales profile could not be found.");
	});

	it("scopes dealer document lists to the active dealer and strips document metadata", async () => {
		let capturedWhere: Record<string, unknown> | null = null;
		const documents = await getDealerPortalSalesDocuments(
			{
				salesOrders: {
					findMany: async ({ where }: { where: Record<string, unknown> }) => {
						capturedWhere = where;
						return [
							{
								id: 55,
								orderId: "DQ-55",
								title: "Dealer Quote",
								status: "Draft",
								type: "quote",
								grandTotal: 100,
								amountDue: 100,
								meta: {
									internalPricing: {
										summary: {
											grandTotal: 100,
										},
									},
									dealerPricing: {
										summary: {
											grandTotal: 150,
										},
									},
								},
								invoiceStatus: null,
								createdAt: new Date("2026-05-18T00:00:00.000Z"),
								customer: {
									id: 20,
									name: "Customer",
									businessName: null,
									email: "customer@example.com",
								},
							},
						];
					},
				},
			} as any,
			10,
			"quote",
		);

		expect(capturedWhere).toMatchObject({
			dealerAuthId: 10,
			deletedAt: null,
			type: "quote",
		});
		expect(documents[0]?.grandTotal).toBe(150);
		expect(documents[0]?.amountDue).toBe(150);
		expect("meta" in documents[0]!).toBe(false);
	});

	it("scopes quote conversion to the active dealer", async () => {
		let capturedWhere: Record<string, unknown> | null = null;
		const tx = {
			salesOrders: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) => {
					capturedWhere = where;
					return null;
				},
				update: async () => {
					throw new Error("Quote update should not run.");
				},
			},
		};
		const db = {
			$transaction: async (callback: (transaction: typeof tx) => unknown) =>
				callback(tx),
		};

		await expect(
			convertDealerPortalQuoteToOrder(db as any, 10, 55),
		).rejects.toThrow("Dealer quote could not be found.");
		expect(capturedWhere).toMatchObject({
			id: 55,
			dealerAuthId: 10,
			deletedAt: null,
			type: "quote",
		});
	});
});
