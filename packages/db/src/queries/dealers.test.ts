// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import {
	calculateDealerQuotePricing,
	convertDealerPortalQuoteToOrder,
	getDealerPortalSalesDocument,
	getDealerPortalSalesDocuments,
	getDealerPortalSalesList,
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
				coefficient: 1.5,
			},
			dealerProfile: {
				id: 2,
				title: "Retail",
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
			coefficient: 1.5,
		});
		expect(result.profiles.dealer).toEqual({
			id: 2,
			label: "Retail",
			salesPercentage: 20,
		});
		expect(result.lines[0]).toMatchObject({
			internalUnitPrice: 150,
			internalLineTotal: 300,
			dealerUnitPrice: 180,
			dealerLineTotal: 360,
		});
		expect(result.internalPricing.grandTotal).toBe(330);
		expect(result.dealerPricing.grandTotal).toBe(396);
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

function createDealerQuoteTestDb(options: {
	existingQuote?: { id: number; orderId: string; slug: string } | null;
	activeDppCount?: number;
	collidingOrderIds?: string[];
	dppDocuments?: Array<{ orderId: string; deletedAt?: Date | null }>;
	salesSettingsMeta?: Record<string, unknown> | null;
	shelfProducts?: Array<{
		id: number;
		categoryId?: number | null;
		parentCategoryId?: number | null;
	}>;
}) {
	const collidingOrderIds = new Set(options.collidingOrderIds || []);
	let createdOrderData: Record<string, unknown> | null = null;
	let updatedOrderData: Record<string, unknown> | null = null;
	let createdItemData: Array<Record<string, unknown>> = [];
	let sequenceCountWhere: Record<string, unknown> | null = null;

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
		settings: {
			findFirst: async () =>
				options.salesSettingsMeta === undefined
					? null
					: { meta: options.salesSettingsMeta },
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
	};

	const db = {
		$transaction: async (callback: (transaction: typeof tx) => unknown) =>
			callback(tx),
	};

	return {
		db,
		getCreatedOrderData: () => createdOrderData,
		getCreatedItemData: () => createdItemData,
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
					meta: {
						source: "dealer_portal",
					},
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
				source: "dealer_portal",
				convertedFromDealerQuoteId: 55,
			},
		});
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
						meta: {
							dealerPricing: {
								summary: {
									grandTotal: 150,
								},
							},
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
				deliveryOption: "delivery",
				customerProfileId: "45",
				paymentStatus: "due",
				invoiceStatus: "pending",
			},
		);

		expect(capturedWhere).toMatchObject({
			dealerAuthId: 10,
			deletedAt: null,
			type: {
				not: "quote",
			},
			deliveryOption: "delivery",
			dealerSalesProfileId: 45,
			invoiceStatus: "pending",
			amountDue: {
				gt: 0,
			},
		});
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
