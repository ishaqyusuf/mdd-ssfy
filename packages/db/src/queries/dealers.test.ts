// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import {
	calculateDealerApprovalPricing,
	calculateDealerQuotePricing,
	convertDealerPortalQuoteToOrder,
	getDealerPortalSalesDocument,
	getDealerPortalSalesDocuments,
	getDealerPortalCustomerOverview,
	getDealerPortalCustomers,
	getDealerOrderRequestCount,
	getDealerRequestSla,
	getDealerPortalSettings,
	getDealerPortalSalesProfiles,
	getDealerPortalSalesList,
	mergeDealerApprovalDeliveryMeta,
	deleteDealerPortalCustomer,
	saveDealerPortalQuote,
	saveDealerPortalCustomer,
	saveDealerPortalSettings,
	saveDealerPortalSalesProfile,
	summarizeDealerRequestSla,
	requestDealerPortalQuoteOrder,
	updateDealerSalesProfile,
	updateDealerPortalCustomerPayment,
	updateDealerPortalCustomerOfficeVisibility,
} from "./dealers";

describe("dealer portal pricing", () => {
	it("rebuilds customer pricing after the office completes a dealer quote", () => {
		const result = calculateDealerApprovalPricing({
			lineItems: [
				{
					uid: "office-added-shelf-line",
					title: "Shelf item",
					qty: 1,
					unitPrice: 380.38,
					lineTotal: 380.38,
					shelfItems: [
						{
							productId: 113,
							qty: 1,
							unitPrice: 380.38,
							totalPrice: 380.38,
							meta: {
								basePrice: 247,
							},
						},
					],
				},
			],
			taxRate: 0,
			internalGrandTotal: 405.38,
			internalCoefficient: 1,
			dealerSalesPercentage: 20,
			fallbackDealerGrandTotal: 0,
		});

		expect(result.internalBaseTotal).toBe(380.38);
		expect(result.dealerBaseTotal).toBe(481.46);
	});

	it("keeps the saved dealer total when no structured quote lines exist", () => {
		const result = calculateDealerApprovalPricing({
			lineItems: [],
			taxRate: 0,
			internalGrandTotal: 300,
			internalCoefficient: 0.65,
			dealerSalesPercentage: 20,
			fallbackDealerGrandTotal: 360,
		});

		expect(result).toEqual({
			internalBaseTotal: 300,
			dealerBaseTotal: 360,
		});
	});

	it("keeps internal and dealer customer pricing snapshots separate", () => {
		const result = calculateDealerQuotePricing({
			createdAt: "2026-05-18T00:00:00.000Z",
			taxRate: 10,
			internalProfile: {
				id: 1,
				title: "Dealer Standard",
				coefficient: 0.67,
			},
			dealerProfile: {
				id: 2,
				title: "Retail",
				coefficient: 99,
				salesPercentage: 20,
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
			coefficient: 0.67,
		});
		expect(result.profiles.dealer).toEqual({
			id: 2,
			label: "Retail",
			coefficient: 99,
			salesPercentage: 20,
		});
		expect(result.lines[0]).toMatchObject({
			internalUnitPrice: 149,
			internalLineTotal: 298,
			dealerUnitPrice: 178.8,
			dealerLineTotal: 357.6,
		});
		expect(result.internalPricing.grandTotal).toBe(327.8);
		expect(result.dealerPricing.grandTotal).toBe(393.36);
	});

	it("taxes only taxable lines in both pricing layers", () => {
		const result = calculateDealerQuotePricing({
			taxRate: 10,
			internalProfile: { coefficient: 1 },
			dealerProfile: { salesPercentage: 20 },
			lineItems: [
				{ uid: "taxable", qty: 1, unitPrice: 100, taxxable: true },
				{ uid: "exempt", qty: 1, unitPrice: 50, taxxable: false },
			],
		});

		expect(result.internalPricing.taxableSubTotal).toBe(100);
		expect(result.internalPricing.taxTotal).toBe(10);
		expect(result.internalPricing.grandTotal).toBe(160);
		expect(result.dealerPricing.taxableSubTotal).toBe(120);
		expect(result.dealerPricing.taxTotal).toBe(12);
		expect(result.dealerPricing.grandTotal).toBe(192);
		expect(result.lines.map((line) => line.taxable)).toEqual([true, false]);
	});

	it("keeps customer tax while exempting a qualified dealer resale layer", () => {
		const result = calculateDealerQuotePricing({
			taxRate: 8,
			internalProfile: { coefficient: 1 },
			dealerProfile: { salesPercentage: 20 },
			sellerOfRecord: "DEALER",
			resaleCertificateOnFile: true,
			lineItems: [{ uid: "door", qty: 1, unitPrice: 100 }],
		});

		expect(result.internalPricing.taxableSubTotal).toBe(100);
		expect(result.internalPricing.taxTotal).toBe(0);
		expect(result.internalPricing.grandTotal).toBe(100);
		expect(result.dealerPricing.taxableSubTotal).toBe(120);
		expect(result.dealerPricing.taxTotal).toBe(9.6);
		expect(result.dealerPricing.grandTotal).toBe(129.6);
	});

	it("prices flat, door, shelf, moulding, and service lines from their effective totals", () => {
		const result = calculateDealerQuotePricing({
			createdAt: "2026-05-18T00:00:00.000Z",
			taxRate: 0,
			internalProfile: {
				id: 1,
				title: "Dealer Standard",
				coefficient: 1,
			},
			dealerProfile: {
				id: 2,
				title: "Retail",
				coefficient: 99,
				salesPercentage: 10,
			},
			lineItems: [
				{
					uid: "flat",
					title: "Flat",
					qty: 2,
					unitPrice: 100,
					lineTotal: 200,
				},
				{
					uid: "door-hpt",
					title: "Door",
					qty: 4,
					unitPrice: 0,
					lineTotal: 800,
					housePackageTool: {
						totalDoors: 4,
						totalPrice: 800,
						doors: [],
					},
				},
				{
					uid: "shelf",
					title: "Shelf",
					qty: 3,
					unitPrice: 0,
					lineTotal: 150,
					shelfItems: [],
				},
				{
					uid: "moulding",
					title: "Moulding",
					qty: 5,
					unitPrice: 0,
					lineTotal: 250,
					meta: {
						mouldingRows: [],
					},
				},
				{
					uid: "service",
					title: "Service",
					qty: 2,
					unitPrice: 0,
					lineTotal: 120,
					meta: {
						serviceRows: [],
					},
				},
			],
		});

		expect(result.lines.map((line) => line.internalLineTotal)).toEqual([
			200, 800, 150, 250, 120,
		]);
		expect(result.lines.map((line) => line.dealerLineTotal)).toEqual([
			220, 880, 165, 275, 132,
		]);
		expect(result.internalPricing.subTotal).toBe(1520);
		expect(result.dealerPricing.subTotal).toBe(1672);
	});
});

describe("dealer order request visibility", () => {
	it("tracks pending request aging against the 24-hour SLA", () => {
		const createdAt = "2026-07-20T00:00:00.000Z";

		expect(
			getDealerRequestSla({
				createdAt,
				status: "pending",
				now: new Date("2026-07-20T19:00:00.000Z"),
			}),
		).toMatchObject({ status: "due_soon", ageHours: 19, targetHours: 24 });
		expect(
			getDealerRequestSla({
				createdAt,
				status: "pending",
				now: new Date("2026-07-21T01:00:00.000Z"),
			}),
		).toMatchObject({ status: "overdue", ageHours: 25 });
	});

	it("summarizes approval, rejection, and decision-time analytics", () => {
		const analytics = summarizeDealerRequestSla(
			[
				{
					status: "approved",
					createdAt: "2026-07-20T00:00:00.000Z",
					updatedAt: "2026-07-20T12:00:00.000Z",
				},
				{
					status: "rejected",
					createdAt: "2026-07-20T00:00:00.000Z",
					updatedAt: "2026-07-21T00:00:00.000Z",
				},
				{
					status: "pending",
					createdAt: "2026-07-20T00:00:00.000Z",
				},
			],
			new Date("2026-07-21T01:00:00.000Z"),
		);

		expect(analytics).toMatchObject({
			total: 3,
			pending: 1,
			overdue: 1,
			approved: 1,
			rejected: 1,
			averageDecisionHours: 18,
			approvalRate: 50,
		});
	});

	it("lets Sales Team members review unassigned dealer requests", async () => {
		let capturedWhere: Record<string, unknown> | undefined;
		const db = {
			users: {
				findUnique: async () => ({
					roles: [{ role: { name: "Sales Team" } }],
				}),
			},
			dealerSalesRequest: {
				count: async ({ where }: { where: Record<string, unknown> }) => {
					capturedWhere = where;
					return 1;
				},
			},
		};

		expect(await getDealerOrderRequestCount(db as never, 69)).toBe(1);
		expect(capturedWhere).toMatchObject({
			status: "pending",
			OR: [{ sale: { salesRepId: 69 } }, { sale: { salesRepId: null } }],
		});
	});

	it("captures an immutable direct-ship recipient snapshot on submission", async () => {
		let addressData: Record<string, any> | undefined;
		const saleUpdates: Record<string, any>[] = [];
		const tx = {
			salesOrders: {
				findFirst: async () => ({
					id: 81,
					orderId: "DPP-81",
					slug: "dpp-81",
					meta: {
						newSalesForm: {
							form: { deliveryOption: "ship" },
						},
					},
					deliveryOption: "ship",
					billingAddressId: null,
					shippingAddressId: null,
					salesRepId: 9,
					dealerAuth: {
						id: 10,
						email: "dealer@example.com",
						companyName: "Dealer Co",
						salesRepId: 9,
					},
					customer: {
						id: 44,
						businessName: "End Customer",
						email: "ship@example.com",
						phoneNo: "555-0100",
						address: "123 Main St",
						meta: {
							dealerAddress: {
								address1: "123 Main St",
								city: "Orlando",
								state: "FL",
								zip_code: "32801",
								country: "US",
							},
						},
					},
					requests: [],
				}),
				update: async ({ data }: { data: Record<string, any> }) => {
					saleUpdates.push(data);
					return { id: 81 };
				},
			},
			addressBooks: {
				create: async ({ data }: { data: Record<string, any> }) => {
					addressData = data;
					return { id: 501 };
				},
			},
			dealerSalesRequest: {
				create: async () => ({
					id: 700,
					status: "pending",
					createdAt: new Date("2026-07-19T12:00:00.000Z"),
				}),
			},
		};
		const db = {
			$transaction: async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
		};

		const result = await requestDealerPortalQuoteOrder(db as any, 10, 81);

		expect(addressData).toMatchObject({
			name: "End Customer",
			email: "ship@example.com",
			phoneNo: "555-0100",
			address1: "123 Main St",
			city: "Orlando",
			state: "FL",
			meta: {
				source: "dealer_order_recipient_snapshot",
				dealerId: 10,
				customerId: 44,
				zip_code: "32801",
			},
		});
		expect(saleUpdates[0]).toMatchObject({
			billingAddressId: 501,
			shippingAddressId: 501,
			meta: {
				dealerFulfillmentRecipient: {
					customerId: 44,
					email: "ship@example.com",
					phoneNo: "555-0100",
					zip_code: "32801",
				},
			},
		});
		expect(result.notification.fulfillmentRecipient).toMatchObject({
			customerId: 44,
			address1: "123 Main St",
		});
	});
});

describe("dealer approval delivery metadata", () => {
	it("keeps the sales-form snapshot synchronized with the reviewed delivery row", () => {
		const meta = mergeDealerApprovalDeliveryMeta({
			meta: {
				newSalesForm: {
					extraCosts: [
						{ id: 10, label: "Labor", type: "Labor", amount: 0 },
						{ id: 11, label: "Old delivery", type: "Delivery", amount: 5 },
					],
				},
			},
			deliveryCost: 25,
			extraCostId: 12,
		});

		expect(meta).toMatchObject({
			deliveryCost: 25,
			newSalesForm: {
				extraCosts: [
					{ id: 10, type: "Labor", amount: 0 },
					{
						id: 12,
						label: "Delivery",
						type: "Delivery",
						amount: 25,
						taxxable: false,
					},
				],
			},
		});
	});
});

function createDealerQuoteTestDb(options: {
	existingQuote?: { id: number; orderId: string; slug: string } | null;
	activeDppCount?: number;
	collidingOrderIds?: string[];
	dppDocuments?: Array<{ orderId: string; deletedAt?: Date | null }>;
	customerTypeId?: number | null;
	dealerProfile?: {
		id: number;
		title: string;
		coefficient?: number | null;
		salesPercentage?: number | null;
		defaultProfile?: boolean | null;
	} | null;
	dealerMeta?: Record<string, unknown> | null;
	customerTaxCode?: string | null;
	salesSettingsMeta?: Record<string, unknown> | null;
	shelfProducts?: Array<{
		id: number;
		categoryId?: number | null;
		parentCategoryId?: number | null;
	}>;
}) {
	const collidingOrderIds = new Set(options.collidingOrderIds || []);
	const dealerProfile = options.dealerProfile ?? {
		id: 30,
		title: "Retail",
		coefficient: 1.2,
		salesPercentage: 20,
		defaultProfile: true,
	};
	let createdOrderData: Record<string, unknown> | null = null;
	let updatedOrderData: Record<string, unknown> | null = null;
	let createdItemData: Array<Record<string, unknown>> = [];
	let dealerSalesData: Record<string, unknown> | null = null;
	let sequenceCountWhere: Record<string, unknown> | null = null;

	const tx = {
		customers: {
			findFirst: async () => ({
				id: 20,
				customerTypeId: options.customerTypeId ?? null,
				taxProfiles: options.customerTaxCode
					? [
							{
								taxCode: options.customerTaxCode,
								tax: {
									taxCode: options.customerTaxCode,
									percentage: options.customerTaxCode === "FL" ? 6 : 8,
								},
							},
						]
					: [],
			}),
		},
		customerTypes: {
			findFirst: async ({ where }: { where: Record<string, unknown> }) => {
				if (where.dealerOwnerId === null) {
					return {
						id: 1,
						title: "Dealer Standard",
						coefficient: 1,
					};
				}
				if (where.dealerOwnerId === 10 && dealerProfile) {
					if (where.id && where.id !== dealerProfile.id) return null;
					if (where.defaultProfile && !dealerProfile.defaultProfile) {
						return null;
					}
					return dealerProfile;
				}
				return null;
			},
		},
		dealerAuth: {
			findUnique: async () => ({
				meta: options.dealerMeta || {},
				dealer: {
					customerTypeId: 30,
					profile: {
						id: 30,
						title: "Retail",
						coefficient: 1.2,
					},
				},
			}),
		},
		settings: {
			findFirst: async () =>
				options.salesSettingsMeta === undefined
					? null
					: { meta: options.salesSettingsMeta },
		},
		taxes: {
			findFirst: async ({ where }: { where: Record<string, unknown> }) => {
				if (where.taxCode === "FL") return { taxCode: "FL", percentage: 6 };
				if (where.taxCode === "TX") return { taxCode: "TX", percentage: 8 };
				return null;
			},
		},
		dykeShelfProducts: {
			findMany: async ({ where }: { where: { id?: { in?: number[] } } }) => {
				const ids = new Set(where.id?.in || []);
				return (options.shelfProducts || []).filter((product) =>
					ids.has(product.id),
				);
			},
		},
		salesOrders: {
			findFirst: async () => options.existingQuote ?? null,
			count: async ({ where }: { where: Record<string, unknown> }) => {
				if (typeof where.orderId === "string") {
					const collidesWithDocument = options.dppDocuments?.some(
						(document) => document.orderId === where.orderId,
					);
					return collidingOrderIds.has(where.orderId) || collidesWithDocument
						? 1
						: 0;
				}

				sequenceCountWhere = where;
				if (options.dppDocuments) {
					return options.dppDocuments.filter(
						(document) => document.deletedAt == null,
					).length;
				}
				return options.activeDppCount ?? 0;
			},
			create: async ({ data }: { data: Record<string, unknown> }) => {
				createdOrderData = data;
				return {
					id: 55,
					orderId: data.orderId,
					slug: data.slug,
				};
			},
			update: async ({ data }: { data: Record<string, unknown> }) => {
				updatedOrderData = data;
				return {
					id: options.existingQuote?.id ?? 55,
					orderId: data.orderId,
					slug: data.slug,
				};
			},
		},
		salesOrderItems: {
			deleteMany: async () => ({ count: 1 }),
			createMany: async ({
				data,
			}: {
				data: Array<Record<string, unknown>>;
			}) => {
				createdItemData = data;
				return { count: data.length };
			},
		},
		dealerSales: {
			upsert: async ({ create, update }: Record<string, any>) => {
				dealerSalesData = dealerSalesData
					? { ...dealerSalesData, ...update }
					: create;
				return dealerSalesData;
			},
		},
	};

	const db = {
		$transaction: async (callback: (transaction: typeof tx) => unknown) =>
			callback(tx),
	};

	return {
		db,
		getCreatedOrderData: () => createdOrderData,
		getCreatedItemData: () => createdItemData,
		getDealerSalesData: () => dealerSalesData,
		getUpdatedOrderData: () => updatedOrderData,
		getSequenceCountWhere: () => sequenceCountWhere,
	};
}

function dealerQuoteInput(overrides: Record<string, unknown> = {}) {
	return {
		customerId: 20,
		taxRate: 0,
		lineItems: [
			{
				uid: "line-1",
				title: "Door",
				qty: 1,
				unitPrice: 100,
			},
		],
		...overrides,
	};
}

describe("dealer portal DPP identities", () => {
	it("assigns the first DPP serial to a new dealer quote", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
		});

		const saved = await saveDealerPortalQuote(
			testDb.db as any,
			10,
			dealerQuoteInput(),
		);

		expect(saved.orderId).toBe("00001DPP");
		expect(saved.slug).toBe("quote-00001dpp");
		expect(testDb.getCreatedOrderData()).toMatchObject({
			orderId: "00001DPP",
			slug: "quote-00001dpp",
			type: "quote",
			dealerAuthId: 10,
		});
		expect(testDb.getSequenceCountWhere()).toMatchObject({
			dealerAuthId: {
				not: null,
			},
			deletedAt: null,
			orderId: {
				endsWith: "DPP",
			},
		});
	});

	it("preserves dealer workflow payload in saved quote metadata", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
		});

		await saveDealerPortalQuote(
			testDb.db as any,
			10,
			dealerQuoteInput({
				lineItems: [
					{
						uid: "line-1",
						title: "Door",
						qty: 1,
						unitPrice: 100,
						meta: {
							serviceRows: [{ uid: "svc-1", service: "Install" }],
						},
						formSteps: [{ stepId: 10, prodUid: "door-a", value: "Door A" }],
						shelfItems: [{ uid: "shelf-1", qty: 2 }],
						housePackageTool: {
							doors: [{ dimension: "30 x 80", totalQty: 1 }],
						},
					},
				],
			}),
		);

		const meta = testDb.getCreatedOrderData()?.meta as any;
		expect(meta.newSalesForm.lineItems[0].formSteps).toHaveLength(1);
		expect(meta.newSalesForm.lineItems[0].shelfItems).toHaveLength(1);
		expect(meta.newSalesForm.lineItems[0].housePackageTool.doors).toHaveLength(
			1,
		);
		expect(meta.newSalesForm.lineItems[0].meta.serviceRows).toHaveLength(1);
	});

	it("rejects dealer quote line items for hidden item types", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
			salesSettingsMeta: {
				route: {
					service: {
						config: {
							dealerVisible: false,
						},
					},
				},
			},
		});

		await expect(
			saveDealerPortalQuote(
				testDb.db as any,
				10,
				dealerQuoteInput({
					lineItems: [
						{
							uid: "line-1",
							title: "Service",
							qty: 1,
							unitPrice: 100,
							formSteps: [
								{
									stepId: 1,
									prodUid: "service",
									value: "Service",
								},
							],
						},
					],
				}),
			),
		).rejects.toThrow("This item type is not available in the dealer portal.");
	});

	it("rejects dealer quote shelf items outside the dealer allowlist", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
			salesSettingsMeta: {
				dealerShelfCategoryVisibility: {
					mode: "allowlist",
					categoryIds: [10],
				},
			},
			shelfProducts: [
				{
					id: 99,
					categoryId: 20,
					parentCategoryId: null,
				},
			],
		});

		await expect(
			saveDealerPortalQuote(
				testDb.db as any,
				10,
				dealerQuoteInput({
					lineItems: [
						{
							uid: "line-1",
							title: "Shelf",
							qty: 1,
							unitPrice: 100,
							shelfItems: [
								{
									uid: "shelf-1",
									productId: 99,
									categoryId: 20,
								},
							],
						},
					],
				}),
			),
		).rejects.toThrow("This shelf item is not available in the dealer portal.");
	});

	it("allows dealer quote shelf items in an allowed parent category", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
			salesSettingsMeta: {
				dealerShelfCategoryVisibility: {
					mode: "allowlist",
					categoryIds: [10],
				},
			},
			shelfProducts: [
				{
					id: 99,
					categoryId: 20,
					parentCategoryId: 10,
				},
			],
		});

		const saved = await saveDealerPortalQuote(
			testDb.db as any,
			10,
			dealerQuoteInput({
				lineItems: [
					{
						uid: "line-1",
						title: "Shelf",
						qty: 1,
						unitPrice: 100,
						shelfItems: [
							{
								uid: "shelf-1",
								productId: 99,
								categoryId: 20,
							},
						],
					},
				],
			}),
		);

		expect(saved.orderId).toBe("00001DPP");
	});

	it("persists dealer workflow tax and production flags on sales items", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
		});

		await saveDealerPortalQuote(
			testDb.db as any,
			10,
			dealerQuoteInput({
				lineItems: [
					{
						uid: "line-1",
						title: "Service",
						qty: 1,
						unitPrice: 100,
						meta: {
							serviceRows: [
								{
									uid: "svc-1",
									service: "Install",
									taxxable: true,
									produceable: true,
								},
							],
						},
					},
					{
						uid: "line-2",
						title: "Flat",
						qty: 1,
						unitPrice: 50,
						meta: {
							taxxable: false,
							produceable: false,
						},
					},
				],
			}),
		);

		const [serviceItem, flatItem] = testDb.getCreatedItemData();
		expect((serviceItem?.meta as any).tax).toBe(true);
		expect(serviceItem?.dykeProduction).toBe(true);
		expect((flatItem?.meta as any).tax).toBe(false);
		expect(flatItem?.dykeProduction).toBe(false);
	});

	it("uses the next shared DPP serial and skips collisions", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 1,
			collidingOrderIds: ["00002DPP"],
		});

		const saved = await saveDealerPortalQuote(
			testDb.db as any,
			10,
			dealerQuoteInput(),
		);

		expect(saved.orderId).toBe("00003DPP");
		expect(saved.slug).toBe("quote-00003dpp");
	});

	it("ignores deleted DPP documents when calculating the next serial", async () => {
		const testDb = createDealerQuoteTestDb({
			dppDocuments: [
				{ orderId: "00001DPP", deletedAt: null },
				{ orderId: "00002DPP", deletedAt: new Date("2026-05-22") },
			],
		});

		const saved = await saveDealerPortalQuote(
			testDb.db as any,
			10,
			dealerQuoteInput(),
		);

		expect(saved.orderId).toBe("00003DPP");
		expect(testDb.getSequenceCountWhere()).toMatchObject({
			deletedAt: null,
			orderId: {
				endsWith: "DPP",
			},
		});
	});

	it("preserves an existing quote order number when editing", async () => {
		const testDb = createDealerQuoteTestDb({
			existingQuote: {
				id: 55,
				orderId: "00007DPP",
				slug: "quote-00007dpp",
			},
		});

		const saved = await saveDealerPortalQuote(
			testDb.db as any,
			10,
			dealerQuoteInput({ id: 55 }),
		);

		expect(saved.orderId).toBe("00007DPP");
		expect(saved.slug).toBe("quote-00007dpp");
		expect(testDb.getUpdatedOrderData()).toMatchObject({
			orderId: "00007DPP",
			slug: "quote-00007dpp",
			type: "quote",
		});
		expect(testDb.getSequenceCountWhere()).toBeNull();
	});

	it("assigns a new DPP order number when converting a dealer quote", async () => {
		let updateData: Record<string, unknown> | null = null;
		const tx = {
			salesOrders: {
				findFirst: async () => ({
					id: 55,
					meta: {},
				}),
				count: async ({ where }: { where: Record<string, unknown> }) => {
					if (typeof where.orderId === "string") return 0;
					return 1;
				},
				update: async ({ data }: { data: Record<string, unknown> }) => {
					updateData = data;
					return {
						id: 55,
						orderId: data.orderId,
						slug: data.slug,
						type: data.type,
						status: data.status,
					};
				},
			},
		};
		const db = {
			$transaction: async (callback: (transaction: typeof tx) => unknown) =>
				callback(tx),
		};

		const order = await convertDealerPortalQuoteToOrder(db as any, 10, 55);

		expect(order).toMatchObject({
			orderId: "00002DPP",
			slug: "order-00002dpp",
			type: "order",
			status: "New",
		});
		expect(updateData).toMatchObject({
			orderId: "00002DPP",
			slug: "order-00002dpp",
			type: "order",
			status: "New",
			meta: {
				convertedFromDealerQuoteId: 55,
			},
		});
	});
});

describe("dealer portal isolation", () => {
	it("updates the linked customer profile from a dealer account", async () => {
		const updates: Record<string, unknown>[] = [];
		const db = {
			$transaction: async (callback: (tx: unknown) => unknown) => callback(db),
			dealerAuth: {
				findFirst: async () => ({
					id: 10,
					dealerId: 20,
					email: "dealer@example.com",
					name: "Dealer",
					companyName: null,
					dealer: {
						customerTypeId: 25,
						profile: {
							id: 25,
							title: "Standard",
						},
					},
				}),
			},
			customerTypes: {
				findFirst: async () => ({ id: 30, title: "Preferred" }),
			},
			customers: {
				update: async (args: Record<string, unknown>) => {
					updates.push(args);
					return { id: 20 };
				},
			},
		};

		const result = await updateDealerSalesProfile(db as any, {
			dealerId: 10,
			customerProfileId: 30,
		});

		expect(result).toEqual({
			dealerId: 10,
			customerId: 20,
			customerProfileId: 30,
			dealerName: "Dealer",
			dealerEmail: "dealer@example.com",
			previousProfileName: "Standard",
			newProfileName: "Preferred",
			profileChanged: true,
		});
		expect(updates[0]).toEqual({
			where: { id: 20 },
			data: { customerTypeId: 30 },
		});
	});

	it("creates and links a customer when setting a dealer-only sales profile", async () => {
		const dealerUpdates: Record<string, unknown>[] = [];
		const customerCreates: Record<string, unknown>[] = [];
		const db = {
			$transaction: async (callback: (tx: unknown) => unknown) => callback(db),
			dealerAuth: {
				findFirst: async () => ({
					id: 10,
					dealerId: null,
					email: "dealer@example.com",
					name: "Dealer",
					companyName: "Dealer Co",
					dealer: null,
				}),
				update: async (args: Record<string, unknown>) => {
					dealerUpdates.push(args);
					return { id: 10 };
				},
			},
			customerTypes: {
				findFirst: async () => ({ id: 30, title: "Preferred" }),
			},
			customers: {
				create: async (args: Record<string, unknown>) => {
					customerCreates.push(args);
					return { id: 40 };
				},
			},
		};

		const result = await updateDealerSalesProfile(db as any, {
			dealerId: 10,
			customerProfileId: 30,
		});

		expect(result).toEqual({
			dealerId: 10,
			customerId: 40,
			customerProfileId: 30,
			dealerName: "Dealer Co",
			dealerEmail: "dealer@example.com",
			previousProfileName: null,
			newProfileName: "Preferred",
			profileChanged: true,
		});
		expect(customerCreates[0]).toEqual({
			data: {
				name: "Dealer",
				businessName: "Dealer Co",
				email: "dealer@example.com",
				customerTypeId: 30,
				meta: {
					source: "dealer_admin_profile_assignment",
					dealerAuthId: 10,
				},
			},
			select: { id: true },
		});
		expect(dealerUpdates[0]).toEqual({
			where: { id: 10 },
			data: { dealerId: 40 },
		});
	});

	it("marks linked dealer profile updates as unchanged when the profile is already assigned", async () => {
		const db = {
			$transaction: async (callback: (tx: unknown) => unknown) => callback(db),
			dealerAuth: {
				findFirst: async () => ({
					id: 10,
					dealerId: 20,
					email: "dealer@example.com",
					name: "Dealer",
					companyName: null,
					dealer: {
						customerTypeId: 30,
						profile: {
							id: 30,
							title: "Preferred",
						},
					},
				}),
			},
			customerTypes: {
				findFirst: async () => ({ id: 30, title: "Preferred" }),
			},
			customers: {
				update: async () => ({ id: 20 }),
			},
		};

		const result = await updateDealerSalesProfile(db as any, {
			dealerId: 10,
			customerProfileId: 30,
		});

		expect(result).toMatchObject({
			dealerId: 10,
			customerId: 20,
			customerProfileId: 30,
			previousProfileName: "Preferred",
			newProfileName: "Preferred",
			profileChanged: false,
		});
	});

	it("rejects assigning another dealer's sales profile to a dealer customer", async () => {
		let capturedWhere: Record<string, unknown> | null = null;
		const db = {
			customerTypes: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) => {
					capturedWhere = where;
					return null;
				},
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
		).rejects.toThrow("Customer profile could not be found.");
		expect(capturedWhere).toMatchObject({
			id: 99,
			dealerOwnerId: 10,
			deletedAt: null,
		});
	});

	it("saves a dealer customer default tax group", async () => {
		let capturedTaxWhere: Record<string, unknown> | null = null;
		let createdTaxProfile: Record<string, unknown> | null = null;

		const db = {
			taxes: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) => {
					capturedTaxWhere = where;
					return { taxCode: "TX" };
				},
			},
			$transaction: async (callback: (tx: any) => Promise<unknown>) =>
				callback({
					customers: {
						create: async () => ({ id: 50 }),
					},
					customerTaxProfiles: {
						findFirst: async () => null,
						create: async ({ data }: { data: Record<string, unknown> }) => {
							createdTaxProfile = data;
							return { id: 70, ...data };
						},
					},
				}),
		};

		const customer = await saveDealerPortalCustomer(db as any, 10, {
			name: "Taxed Buyer",
			taxCode: "TX",
		});

		expect(customer).toMatchObject({ id: 50 });
		expect(capturedTaxWhere).toMatchObject({
			taxCode: "TX",
			deletedAt: null,
		});
		expect(createdTaxProfile).toMatchObject({
			customerId: 50,
			taxCode: "TX",
		});
	});

	it("saves and loads dealer defaults from company settings", async () => {
		let savedMeta: Record<string, unknown> | null = null;
		const db = {
			dealerAuth: {
				findUnique: async ({
					select,
				}: {
					select?: Record<string, unknown>;
				}) => {
					const dealer = {
						id: 10,
						email: "dealer@example.com",
						name: "Dealer",
						companyName: "Dealer Co",
						phoneNo: "555-111-2222",
						meta: {
							logoUrl: "https://example.com/old.png",
						},
						primaryBillingAddressId: 1,
						primaryBillingAddress: {
							id: 1,
							address1: "1 Old St",
							address2: null,
							city: "Orlando",
							state: "FL",
							country: "US",
						},
					};
					if (select?.primaryBillingAddress) return dealer;
					return {
						id: dealer.id,
						meta: dealer.meta,
						primaryBillingAddressId: dealer.primaryBillingAddressId,
					};
				},
				update: async ({ data }: { data: Record<string, any> }) => {
					savedMeta = data.meta;
					return {
						id: 10,
						email: "dealer@example.com",
						name: data.name,
						companyName: data.companyName,
						phoneNo: data.phoneNo,
						meta: data.meta,
					};
				},
			},
			customerTypes: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) =>
					where.id === 45 && where.dealerOwnerId === 10 ? { id: 45 } : null,
			},
			taxes: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) =>
					where.taxCode === "FL" ? { taxCode: "FL" } : null,
			},
			addressBooks: {
				update: async () => ({ id: 1 }),
			},
			$transaction: async (callback: (tx: any) => unknown) => callback(db),
		};

		await saveDealerPortalSettings(db as any, 10, {
			name: "Dealer",
			companyName: "Dealer Co",
			phoneNo: "555-111-2222",
			logoUrl: "https://example.com/logo.png",
			zip_code: "32801",
			defaultCustomerProfileId: 45,
			defaultTaxCode: "FL",
			defaultFulfillmentMode: "delivery",
		});

		expect(savedMeta).toMatchObject({
			logoUrl: "https://example.com/logo.png",
			billingZip: "32801",
			brandingVersion: 1,
			defaultCustomerProfileId: 45,
			defaultTaxCode: "FL",
			defaultFulfillmentMode: "delivery",
		});
		const settings = await getDealerPortalSettings(db as any, 10);
		expect(settings?.meta).toMatchObject({
			logoUrl: "https://example.com/old.png",
		});
	});

	it("shares only a customer owned by the active dealer", async () => {
		let update: Record<string, unknown> | undefined;
		const db = {
			customers: {
				updateMany: async (args: Record<string, unknown>) => {
					update = args;
					return { count: 1 };
				},
			},
		};

		await updateDealerPortalCustomerOfficeVisibility(db as any, 10, {
			id: 44,
			officeVisibility: "SHARED",
		});

		expect(update).toEqual({
			where: {
				id: 44,
				dealerOwnerId: 10,
				deletedAt: null,
			},
			data: {
				officeVisibility: "SHARED",
			},
		});
	});

	it("rejects dealer defaults outside the active dealer scope", async () => {
		const baseDb = {
			dealerAuth: {
				findUnique: async () => ({
					id: 10,
					meta: {},
					primaryBillingAddressId: 1,
				}),
			},
			addressBooks: {
				update: async () => ({ id: 1 }),
			},
			customerTypes: {
				findFirst: async () => null,
			},
			taxes: {
				findFirst: async () => ({ taxCode: "FL" }),
			},
			$transaction: async (callback: (tx: any) => unknown) => callback(baseDb),
		};

		await expect(
			saveDealerPortalSettings(baseDb as any, 10, {
				defaultCustomerProfileId: 99,
			}),
		).rejects.toThrow("Default customer profile could not be found.");
	});

	it("rejects unknown default tax groups", async () => {
		const baseDb = {
			dealerAuth: {
				findUnique: async () => ({
					id: 10,
					meta: {},
					primaryBillingAddressId: 1,
				}),
			},
			addressBooks: {
				update: async () => ({ id: 1 }),
			},
			customerTypes: {
				findFirst: async () => ({ id: 45 }),
			},
			taxes: {
				findFirst: async () => null,
			},
			$transaction: async (callback: (tx: any) => unknown) => callback(baseDb),
		};

		await expect(
			saveDealerPortalSettings(baseDb as any, 10, {
				defaultTaxCode: "BAD",
			}),
		).rejects.toThrow("Default tax group could not be found.");
	});

	it("uses dealer defaults when creating a customer with blank profile and tax", async () => {
		let createdCustomer: Record<string, unknown> | null = null;
		let createdTaxProfile: Record<string, unknown> | null = null;
		const db = {
			dealerAuth: {
				findUnique: async () => ({
					meta: {
						defaultCustomerProfileId: 45,
						defaultTaxCode: "FL",
					},
				}),
			},
			customerTypes: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) =>
					where.id === 45 && where.dealerOwnerId === 10 ? { id: 45 } : null,
			},
			taxes: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) =>
					where.taxCode === "FL" ? { taxCode: "FL" } : null,
			},
			customers: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					createdCustomer = data;
					return { id: 20, ...data };
				},
			},
			customerTaxProfiles: {
				findFirst: async () => null,
				create: async ({ data }: { data: Record<string, unknown> }) => {
					createdTaxProfile = data;
					return { id: 1, ...data };
				},
			},
			$transaction: async (callback: (tx: any) => unknown) => callback(db),
		};

		await saveDealerPortalCustomer(db as any, 10, {
			name: "Defaulted Customer",
		});

		expect(createdCustomer).toMatchObject({
			customerTypeId: 45,
			dealerOwnerId: 10,
		});
		expect(createdTaxProfile).toEqual({
			customerId: 20,
			taxCode: "FL",
		});
	});

	it("preserves explicit customer profile and tax values on edit", async () => {
		let updatedCustomer: Record<string, unknown> | null = null;
		let updatedTaxProfile: Record<string, unknown> | null = null;
		const db = {
			customerTypes: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) =>
					where.id === 46 && where.dealerOwnerId === 10 ? { id: 46 } : null,
			},
			taxes: {
				findFirst: async ({ where }: { where: Record<string, unknown> }) =>
					where.taxCode === "TX" ? { taxCode: "TX" } : null,
			},
			customers: {
				findFirst: async () => ({ id: 20, meta: {} }),
				update: async ({ data }: { data: Record<string, unknown> }) => {
					updatedCustomer = data;
					return { id: 20, ...data };
				},
			},
			customerTaxProfiles: {
				findFirst: async () => ({ id: 5, taxCode: "FL" }),
				update: async ({ data }: { data: Record<string, unknown> }) => {
					updatedTaxProfile = data;
					return { id: 5, ...data };
				},
			},
			$transaction: async (callback: (tx: any) => unknown) => callback(db),
		};

		await saveDealerPortalCustomer(db as any, 10, {
			id: 20,
			name: "Explicit Customer",
			customerTypeId: 46,
			taxCode: "TX",
		});

		expect(updatedCustomer).toMatchObject({
			customerTypeId: 46,
		});
		expect(updatedTaxProfile).toEqual({
			taxCode: "TX",
		});
	});

	it("soft-deletes only a customer owned by the dealer", async () => {
		let capturedArgs: {
			where: Record<string, unknown>;
			data: Record<string, unknown>;
		} | null = null;
		const db = {
			customers: {
				updateMany: async (args: {
					where: Record<string, unknown>;
					data: Record<string, unknown>;
				}) => {
					capturedArgs = args;
					return { count: 1 };
				},
			},
		};

		await expect(
			deleteDealerPortalCustomer(db as any, 10, 55),
		).resolves.toEqual({ id: 55 });
		expect(capturedArgs).not.toBeNull();
		const args = capturedArgs as unknown as {
			where: Record<string, unknown>;
			data: Record<string, unknown>;
		};
		expect(args.where).toEqual({
			id: 55,
			dealerOwnerId: 10,
			deletedAt: null,
		});
		expect(args.data.deletedAt).toBeInstanceOf(Date);
	});

	it("rejects deleting a missing or unowned dealer customer", async () => {
		const db = {
			customers: {
				updateMany: async () => ({ count: 0 }),
			},
		};

		await expect(deleteDealerPortalCustomer(db as any, 10, 55)).rejects.toThrow(
			"Dealer customer could not be found.",
		);
	});

	it("lists only the active dealer's percentage sales profiles", async () => {
		let capturedWhere: Record<string, unknown> | null = null;
		const profiles = await getDealerPortalSalesProfiles(
			{
				customerTypes: {
					findMany: async ({ where }: { where: Record<string, unknown> }) => {
						capturedWhere = where;
						return [
							{
								id: 45,
								title: "Retail",
								salesPercentage: 20,
								defaultProfile: true,
								createdAt: new Date("2026-05-18T00:00:00.000Z"),
								_count: { customers: 2 },
							},
						];
					},
				},
			} as any,
			10,
		);

		expect(capturedWhere).toMatchObject({
			dealerOwnerId: 10,
			deletedAt: null,
		});
		expect(profiles[0]).toMatchObject({
			id: 45,
			salesPercentage: 20,
		});
	});

	it("saves dealer sales profiles as dealer-owned percentage profiles", async () => {
		let createData: Record<string, unknown> | null = null;
		const db = {
			customerTypes: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					createData = data;
					return { id: 45, ...data };
				},
			},
		};

		await saveDealerPortalSalesProfile(db as any, 10, {
			title: "Retail",
			salesPercentage: 20,
			defaultProfile: false,
		});

		expect(createData).toMatchObject({
			title: "Retail",
			salesPercentage: 20,
			defaultProfile: false,
			dealerOwnerId: 10,
		});
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
							meta: {},
							dealerSale: {
								customerId: 20,
								dealerCustomerProfileId: 40,
								dealerSalesPercentage: 50,
								grandTotal: 150,
								dueAmount: 150,
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
		expect(document).toMatchObject({
			grandTotal: 150,
			amountDue: 150,
			officeGrandTotal: 100,
			officeAmountDue: 100,
			customerPaymentStatus: "unpaid",
			customerPaidAmount: 0,
		});
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

	it("updates only the active dealer's customer-payment ledger and records history", async () => {
		let updatedDue: number | null = null;
		let historyData: Record<string, unknown> | null = null;
		const tx = {
			dealerSales: {
				findFirst: async () => ({
					id: 7,
					grandTotal: 150,
					dueAmount: 150,
					salesOrderId: 55,
				}),
				update: async ({ data }: { data: { dueAmount: number } }) => {
					updatedDue = data.dueAmount;
					return {
						grandTotal: 150,
						dueAmount: data.dueAmount,
						updatedAt: new Date("2026-07-18T00:00:00.000Z"),
					};
				},
			},
			salesHistory: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					historyData = data;
					return data;
				},
			},
		};
		const db = {
			$transaction: async (callback: (transaction: typeof tx) => unknown) =>
				callback(tx),
		};

		const result = await updateDealerPortalCustomerPayment(db as never, 10, {
			id: 55,
			status: "paid",
		});

		expect(updatedDue).toBe(0);
		expect(result).toMatchObject({ status: "paid", amountDue: 0 });
		expect(historyData).toMatchObject({
			salesId: 55,
			name: "Dealer customer payment status updated",
			authorName: "Dealer 10",
			data: {
				dealerId: 10,
				status: "paid",
				previousDue: 150,
				nextDue: 0,
			},
		});
	});

	it("reopens dealer documents from saved package workflow payload", async () => {
		const document = await getDealerPortalSalesDocument(
			{
				salesOrders: {
					findFirst: async () => ({
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
						dealerSale: {
							customerId: 20,
							dealerCustomerProfileId: 40,
							dealerSalesPercentage: 50,
							grandTotal: 150,
							dueAmount: 150,
						},
						meta: {
							newSalesForm: {
								form: {
									customerId: 20,
									customerProfileId: 40,
								},
								summary: {
									taxRate: 8.25,
								},
								lineItems: [
									{
										uid: "saved-line",
										title: "Saved Door",
										qty: 2,
										unitPrice: 0,
										lineTotal: 400,
										formSteps: [{ stepId: 1, value: "Door" }],
										housePackageTool: {
											doors: [{ dimension: "30 x 80", totalQty: 2 }],
										},
									},
								],
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
								description: "Legacy row",
								dykeDescription: "Legacy row",
								qty: 1,
								rate: 10,
								total: 10,
								meta: {},
							},
						],
					}),
				},
			} as any,
			10,
			55,
		);

		expect(document.grandTotal).toBe(150);
		expect(document.customerProfileId).toBe(40);
		expect(document.taxRate).toBe(8.25);
		expect(document.lineItems).toEqual([
			{
				uid: "saved-line",
				title: "Saved Door",
				qty: 2,
				unitPrice: 0,
				lineTotal: 400,
				formSteps: [{ stepId: 1, value: "Door" }],
				housePackageTool: {
					doors: [{ dimension: "30 x 80", totalQty: 2 }],
				},
			},
		]);
	});

	it("saves quotes with the selected dealer customer profile", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
			dealerProfile: {
				id: 45,
				title: "Retail customer",
				coefficient: 0.5,
				salesPercentage: 50,
				defaultProfile: false,
			},
		});

		await saveDealerPortalQuote(
			testDb.db as any,
			10,
			dealerQuoteInput({
				customerProfileId: 45,
			}),
		);

		expect(testDb.getCreatedOrderData()).toMatchObject({
			dealerSalesProfileId: 45,
			grandTotal: 100,
		});
		const savedOrderData = testDb.getCreatedOrderData() as Record<string, any>;
		expect(savedOrderData.meta.newSalesForm.form.customerProfileId).toBe(45);
		expect(savedOrderData.meta).not.toHaveProperty("dealerPricing");
		expect(savedOrderData.meta).not.toHaveProperty("pricingSnapshot");
		expect(testDb.getDealerSalesData()).toMatchObject({
			dealerCustomerProfileId: 45,
			dealerSalesPercentage: 50,
			grandTotal: 150,
			dueAmount: 150,
		});
	});

	it("falls back to the dealer customer's assigned profile when quote profile is omitted", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
			customerTypeId: 45,
			dealerProfile: {
				id: 45,
				title: "Builder customer",
				coefficient: 0.8,
				salesPercentage: 25,
				defaultProfile: false,
			},
		});

		await saveDealerPortalQuote(testDb.db as any, 10, dealerQuoteInput());

		expect(testDb.getCreatedOrderData()).toMatchObject({
			dealerSalesProfileId: 45,
		});
		const savedOrderData = testDb.getCreatedOrderData() as Record<string, any>;
		expect(savedOrderData.meta.newSalesForm.form.customerProfileId).toBe(45);
	});

	it("falls back to dealership default profile, tax, and fulfillment on quote save", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
			customerTypeId: null,
			dealerMeta: {
				defaultCustomerProfileId: 45,
				defaultTaxCode: "FL",
				defaultFulfillmentMode: "delivery",
			},
			dealerProfile: {
				id: 45,
				title: "Dealer Default",
				coefficient: 0.8,
				salesPercentage: 25,
				defaultProfile: true,
			},
		});

		await saveDealerPortalQuote(testDb.db as any, 10, dealerQuoteInput());

		const savedOrderData = testDb.getCreatedOrderData() as Record<string, any>;
		expect(savedOrderData).toMatchObject({
			dealerSalesProfileId: 45,
			taxPercentage: 6,
		});
		expect(savedOrderData.meta.newSalesForm.form).toMatchObject({
			customerProfileId: 45,
			taxCode: "FL",
			deliveryOption: "delivery",
		});
	});

	it("keeps explicit quote customer tax and fulfillment over dealership defaults", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
			customerTaxCode: "TX",
			dealerMeta: {
				defaultTaxCode: "FL",
				defaultFulfillmentMode: "delivery",
			},
		});

		await saveDealerPortalQuote(
			testDb.db as any,
			10,
			dealerQuoteInput({
				taxCode: "TX",
				deliveryOption: "ship",
			}),
		);

		const savedOrderData = testDb.getCreatedOrderData() as Record<string, any>;
		expect(savedOrderData).toMatchObject({
			taxPercentage: 8,
		});
		expect(savedOrderData.meta.newSalesForm.form).toMatchObject({
			taxCode: "TX",
			deliveryOption: "ship",
		});
	});

	it("rejects quote profiles not owned by the active dealer", async () => {
		const testDb = createDealerQuoteTestDb({
			activeDppCount: 0,
			dealerProfile: {
				id: 45,
				title: "Retail customer",
				coefficient: 0.5,
				salesPercentage: 50,
				defaultProfile: true,
			},
		});

		await expect(
			saveDealerPortalQuote(
				testDb.db as any,
				10,
				dealerQuoteInput({
					customerProfileId: 99,
				}),
			),
		).rejects.toThrow(
			"Dealer customer profile is required before saving a quote.",
		);
		expect(testDb.getCreatedOrderData()).toBeNull();
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
								meta: {},
								dealerSale: {
									grandTotal: 150,
									dueAmount: 150,
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

	it("applies dealer sales list filters to dealer-owned records", async () => {
		let capturedWhere: Record<string, unknown> | null = null;

		await getDealerPortalSalesList(
			{
				salesOrders: {
					findMany: async ({ where }: { where: Record<string, unknown> }) => {
						capturedWhere = where;
						return [];
					},
					count: async () => 0,
				},
			} as any,
			10,
			"order",
			{
				customerId: 20,
				deliveryOption: "delivery",
				customerProfileId: "45",
				paymentStatus: "due",
				invoiceStatus: "pending",
			},
		);

		expect(capturedWhere).toMatchObject({
			dealerAuthId: 10,
			deletedAt: null,
			dealerSale: {
				is: {
					customerId: 20,
					dealerCustomerProfileId: 45,
					dueAmount: {
						gt: 0,
					},
				},
			},
			type: {
				not: "quote",
			},
			deliveryOption: "delivery",
			invoiceStatus: "pending",
		});
	});

	it("loads dealer customer overview with scoped sales counts", async () => {
		let capturedCustomerWhere: Record<string, unknown> | null = null;
		let capturedSalesWhere: Record<string, unknown> | null = null;

		const overview = await getDealerPortalCustomerOverview(
			{
				customers: {
					findFirst: async ({ where }: { where: Record<string, unknown> }) => {
						capturedCustomerWhere = where;
						return {
							id: 20,
							name: "Jane Customer",
							businessName: "Jane Co",
							email: "jane@example.com",
							phoneNo: "555-000-0000",
							address: "100 Main St",
							meta: {
								dealerAddress: {
									formattedAddress: "100 Main St, Dallas, TX",
									city: "Dallas",
									state: "TX",
								},
							},
							customerTypeId: 45,
							createdAt: new Date("2026-05-18T00:00:00.000Z"),
							profile: {
								id: 45,
								title: "Retail",
								salesPercentage: 20,
							},
						};
					},
				},
				salesOrders: {
					groupBy: async ({ where }: { where: Record<string, unknown> }) => {
						capturedSalesWhere = where;
						return [
							{ type: "quote", _count: { _all: 2 } },
							{ type: "order", _count: { _all: 1 } },
						];
					},
				},
			} as any,
			10,
			20,
		);

		expect(capturedCustomerWhere).toMatchObject({
			id: 20,
			dealerOwnerId: 10,
			deletedAt: null,
		});
		expect(capturedSalesWhere).toMatchObject({
			dealerAuthId: 10,
			customerId: 20,
			deletedAt: null,
			type: {
				in: ["order", "quote"],
			},
		});
		expect(overview).toMatchObject({
			id: 20,
			formattedAddress: "100 Main St, Dallas, TX",
			ordersCount: 1,
			quotesCount: 2,
		});
		expect("meta" in overview).toBe(false);
	});

	it("loads dealer customers with scoped sales and quote counts", async () => {
		let capturedCustomerWhere: Record<string, unknown> | null = null;
		let capturedSalesWhere: Record<string, unknown> | null = null;

		const customers = await getDealerPortalCustomers(
			{
				customers: {
					findMany: async ({ where }: { where: Record<string, unknown> }) => {
						capturedCustomerWhere = where;
						return [
							{
								id: 20,
								name: "Jane Customer",
								businessName: "Jane Co",
								email: "jane@example.com",
								phoneNo: "555-000-0000",
								address: "100 Main St",
								meta: {
									dealerAddress: {
										formattedAddress: "100 Main St, Dallas, TX",
										city: "Dallas",
										state: "TX",
									},
								},
								customerTypeId: 45,
								createdAt: new Date("2026-05-18T00:00:00.000Z"),
								profile: {
									id: 45,
									title: "Retail",
									coefficient: 1,
									salesPercentage: 20,
									dealerOwnerId: 10,
								},
								taxProfiles: [
									{
										id: 60,
										taxCode: "TX",
										tax: {
											taxCode: "TX",
											title: "Texas",
											percentage: 8.25,
										},
									},
								],
							},
						];
					},
				},
				salesOrders: {
					groupBy: async ({ where }: { where: Record<string, unknown> }) => {
						capturedSalesWhere = where;
						return [
							{ customerId: 20, type: "quote", _count: { _all: 3 } },
							{ customerId: 20, type: "order", _count: { _all: 2 } },
						];
					},
				},
			} as any,
			10,
		);

		expect(capturedCustomerWhere).toMatchObject({
			dealerOwnerId: 10,
			deletedAt: null,
		});
		expect(capturedSalesWhere).toMatchObject({
			dealerAuthId: 10,
			deletedAt: null,
			customerId: {
				in: [20],
			},
			type: {
				in: ["order", "quote"],
			},
		});
		const customer = customers[0];
		expect(customer).toMatchObject({
			id: 20,
			formattedAddress: "100 Main St, Dallas, TX",
			ordersCount: 2,
			quotesCount: 3,
			taxCode: "TX",
			taxProfileId: 60,
			profile: {
				id: 45,
				title: "Retail",
				salesPercentage: 20,
			},
		});
		expect("dealerOwnerId" in (customer?.profile || {})).toBe(false);
	});

	it("rejects another dealer's customer overview", async () => {
		let grouped = false;

		await expect(
			getDealerPortalCustomerOverview(
				{
					customers: {
						findFirst: async () => null,
					},
					salesOrders: {
						groupBy: async () => {
							grouped = true;
							return [];
						},
					},
				} as any,
				10,
				20,
			),
		).rejects.toThrow("Dealer customer could not be found.");
		expect(grouped).toBe(false);
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
