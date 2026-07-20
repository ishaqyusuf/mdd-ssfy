import { describe, expect, it } from "bun:test";
import {
	buildInventorySyncComponentCandidatesForItem,
	planComponentDemandState,
	resolveProjectedInboundDemandStatus,
	resolveSalesItemProductionEligibility,
	syncSalesInventoryLineItems,
} from "./sync-sales-inventory-line-items";

const emptyItem = {
	id: 10,
	description: "Package line",
	meta: {},
	formSteps: [],
	shelfItems: [],
	housePackageTool: null,
};

describe("sync sales inventory line items", () => {
	it("queues inbound demand only for unavailable quantity after suggested allocations", () => {
		expect(
			planComponentDemandState({
				qtyRequired: 10,
				committedAllocationQty: 0,
				suggestedAllocationQty: 6,
				qtyReceived: 0,
			}),
		).toEqual({
			qtyAllocated: 0,
			qtyInbound: 4,
			qtyReceived: 0,
			status: "partially_allocated",
		});
	});

	it("does not queue inbound demand when available stock covers the requirement pending review", () => {
		expect(
			planComponentDemandState({
				qtyRequired: 10,
				committedAllocationQty: 0,
				suggestedAllocationQty: 10,
				qtyReceived: 0,
			}),
		).toEqual({
			qtyAllocated: 0,
			qtyInbound: 0,
			qtyReceived: 0,
			status: "partially_allocated",
		});
	});

	it("keeps committed allocations as allocated quantity", () => {
		expect(
			planComponentDemandState({
				qtyRequired: 10,
				committedAllocationQty: 10,
				suggestedAllocationQty: 10,
				qtyReceived: 0,
			}),
		).toEqual({
			qtyAllocated: 10,
			qtyInbound: 0,
			qtyReceived: 0,
			status: "allocated",
		});
	});

	it("projects order inbound prompts into newly created inbound demand status", () => {
		expect(
			resolveProjectedInboundDemandStatus({
				orderInventoryStatus: "ORDERED",
				qtyInbound: 4,
				qtyReceived: 0,
			}),
		).toBe("ordered");

		expect(
			resolveProjectedInboundDemandStatus({
				orderInventoryStatus: "PENDING ORDER",
				qtyInbound: 4,
				qtyReceived: 0,
			}),
		).toBe("pending");
	});

	it("does not let order prompts downgrade received or shipment-linked demand", () => {
		expect(
			resolveProjectedInboundDemandStatus({
				orderInventoryStatus: "PENDING ORDER",
				qtyInbound: 4,
				qtyReceived: 2,
			}),
		).toBe("partially_received");

		expect(
			resolveProjectedInboundDemandStatus({
				orderInventoryStatus: "PENDING ORDER",
				qtyInbound: 4,
				qtyReceived: 0,
				inboundShipmentItemId: 123,
			}),
		).toBe("ordered");

		expect(
			resolveProjectedInboundDemandStatus({
				orderInventoryStatus: "ORDERED",
				qtyInbound: 4,
				qtyReceived: 4,
			}),
		).toBe("received");
	});

	it("extracts package-authored form step, shelf, HPT, and door candidates from item metadata", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem({
			...emptyItem,
			meta: {
				formSteps: [
					{
						prodUid: "door-root",
						qty: 1,
						value: "Entry Door",
						step: {
							uid: "item-type-step",
							title: "Item Type",
						},
						meta: {
							selectedComponents: [
								{
									id: 501,
									uid: "door-501",
									title: "30in Door",
								},
							],
						},
					},
					{
						prodUid: "door-501",
						qty: 2,
						value: "30in Door",
						step: {
							uid: "door-step",
							title: "Door",
						},
						meta: {
							selectedComponents: [
								{
									id: 501,
									uid: "door-501",
									title: "30in Door",
								},
							],
						},
					},
				],
				shelfItems: [
					{
						productId: 44,
						categoryId: 12,
						description: "Shelf board",
						qty: 3,
					},
				],
				housePackageTool: {
					totalDoors: 2,
					doors: [
						{
							stepProductId: 501,
							totalQty: 2,
							dimension: "30 x 80",
						},
					],
				},
			},
		});

		expect(candidates.map((candidate) => candidate.sourceType)).toEqual([
			"dyke-step-product",
			"dyke-step-product",
			"shelf-product",
			"dyke-door-product",
		]);
		expect(candidates.map((candidate) => candidate.sourceUid)).toEqual([
			"door-root",
			"door-501",
			"shelf-prod-44",
			"door-501",
		]);
		expect(candidates.map((candidate) => candidate.qty)).toEqual([2, 4, 3, 2]);
		expect(candidates[2]?.inventoryName).toBe("Shelf board");
		expect(candidates[3]?.inventoryCategoryTitle).toBe("Door");
	});

	it("uses selected Dyke dependency pricing keys as inventory variant UIDs", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem({
			...emptyItem,
			meta: {
				formSteps: [
					{
						prodUid: "door-size-2-4x8-0",
						qty: 1,
						value: "2-4 x 8-0",
						step: {
							uid: "size-step",
							title: "Size",
						},
						meta: {
							selectedProdUids: ["2-4 x 8-0"],
							selectedComponents: [
								{
									id: 700,
									uid: "2-4 x 8-0",
									title: "2-4 x 8-0",
								},
							],
						},
					},
					{
						prodUid: "door-501",
						qty: 1,
						value: "30in Door",
						step: {
							uid: "door-step",
							title: "Door",
						},
						meta: {
							priceStepDeps: ["size-step"],
							selectedComponents: [
								{
									id: 501,
									uid: "door-501",
									title: "30in Door",
									pricing: {
										"2-4 x 8-0": {
											price: 120,
										},
									},
								},
							],
						},
					},
				],
			},
		});

		const door = candidates.find(
			(candidate) => candidate.sourceUid === "door-501",
		);

		expect(door?.inventoryUid).toBe("door-501");
		expect(door?.variantUid).toBe("w2_4-h8_0");
	});

	it("keeps repeated components separate when selected dependency variants differ", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem({
			...emptyItem,
			meta: {
				formSteps: [
					{
						prodUid: "casing",
						qty: 1,
						value: "Casing",
						step: {
							uid: "casing-step",
							title: "Casing",
						},
						meta: {
							selectedComponents: [
								{
									id: 801,
									uid: "casing",
									title: "Casing",
									dependenciesUid: "white",
								},
							],
						},
					},
					{
						prodUid: "casing",
						qty: 2,
						value: "Casing",
						step: {
							uid: "casing-step",
							title: "Casing",
						},
						meta: {
							selectedComponents: [
								{
									id: 801,
									uid: "casing",
									title: "Casing",
									dependenciesUid: "primed",
								},
							],
						},
					},
				],
			},
		});

		const casingRows = candidates.filter(
			(candidate) => candidate.sourceUid === "casing",
		);

		expect(
			casingRows.map((candidate) => ({
				qty: candidate.qty,
				variantUid: candidate.variantUid,
			})),
		).toEqual([
			{
				qty: 1,
				variantUid: "white",
			},
			{
				qty: 2,
				variantUid: "primed",
			},
		]);
	});

	it("prefers relational candidates over metadata fallbacks when both exist", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem({
			...emptyItem,
			meta: {
				shelfItems: [
					{
						productId: 44,
						categoryId: 12,
						description: "Metadata shelf",
						qty: 3,
					},
				],
			},
			shelfItems: [
				{
					productId: 55,
					categoryId: 13,
					description: "Relational shelf",
					qty: 4,
					shelfProduct: {
						id: 55,
						title: "Relational shelf",
					},
					category: {
						id: 13,
						name: "Shelves",
					},
				},
			],
		});

		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.sourceUid).toBe("shelf-prod-55");
		expect(candidates[0]?.qty).toBe(4);
		expect(candidates[0]?.inventoryName).toBe("Relational shelf");
	});

	it("uses saved shelf row pricing as cost and sales fallback", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem(
			{
				...emptyItem,
				shelfItems: [
					{
						productId: 55,
						categoryId: 13,
						description: "Relational shelf",
						qty: 2,
						unitPrice: 12.34,
						totalPrice: 24.68,
						meta: {
							basePrice: 12,
							salesPrice: 12.34,
						},
						shelfProduct: {
							id: 55,
							title: "Relational shelf",
						},
						category: {
							id: 13,
							name: "Shelves",
						},
					},
				],
			},
			{
				profileCoefficient: 0.6,
			},
		);

		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.sourceUid).toBe("shelf-prod-55");
		expect(candidates[0]?.unitCostPrice).toBe(12);
		expect(candidates[0]?.unitSalesPrice).toBe(12.34);
	});

	it("derives missing shelf cost from sales price and customer profile coefficient", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem(
			{
				...emptyItem,
				meta: {
					shelfItems: [
						{
							productId: 44,
							categoryId: 12,
							description: "Metadata shelf",
							qty: 2,
							unitPrice: 25,
							totalPrice: 50,
						},
					],
				},
			},
			{
				profileCoefficient: 0.5,
			},
		);

		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.unitCostPrice).toBe(12.5);
		expect(candidates[0]?.unitSalesPrice).toBe(25);
	});

	it("aggregates repeated HPT door rows and multiplies selected door step components", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem({
			...emptyItem,
			formSteps: [
				{
					prodUid: "item-type-prehung",
					value: "Interior pre-hung",
					qty: 1,
					meta: {},
					step: {
						uid: "item-type-step",
						title: "Item Type",
					},
					component: {
						uid: "item-type-prehung",
						name: "Interior pre-hung",
					},
				},
			],
			housePackageTool: {
				deletedAt: null,
				totalDoors: 0,
				stepProduct: {
					uid: "madison-door",
					name: "H.C Madison",
					step: {
						uid: "door-step",
						title: "Door",
					},
				},
				doors: [
					{
						totalQty: 1,
						stepProduct: {
							uid: "madison-door",
							name: "H.C Madison",
							step: {
								uid: "door-step",
								title: "Door",
							},
						},
					},
					{
						totalQty: 5,
						stepProduct: {
							uid: "madison-door",
							name: "H.C Madison",
							step: {
								uid: "door-step",
								title: "Door",
							},
						},
					},
				],
			},
		});

		expect(
			candidates.map((candidate) => ({
				sourceType: candidate.sourceType,
				sourceUid: candidate.sourceUid,
				qty: candidate.qty,
			})),
		).toEqual([
			{
				sourceType: "dyke-step-product",
				sourceUid: "item-type-prehung",
				qty: 6,
			},
			{
				sourceType: "dyke-door-product",
				sourceUid: "madison-door",
				qty: 6,
			},
		]);
	});

	it("uses the HPT root product for door rows missing their own product mapping", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem({
			...emptyItem,
			id: 32,
			description: "House Package Tool",
			housePackageTool: {
				deletedAt: null,
				totalDoors: 5,
				stepProduct: {
					uid: "carrara-door",
					name: "Carrara Door",
					step: {
						uid: "door-step",
						title: "Door",
					},
				},
				doors: [
					{
						totalQty: 0,
						dimension: '34" x 80"',
						unitPrice: 95.5,
						lineTotal: 191,
						stepProduct: null,
					},
					{
						totalQty: 0,
						dimension: '36" x 80"',
						unitPrice: 95.5,
						lineTotal: 286.5,
						stepProduct: null,
					},
				],
			},
		});

		expect(
			candidates.map((candidate) => ({
				sourceType: candidate.sourceType,
				sourceUid: candidate.sourceUid,
				variantUid: candidate.variantUid,
				qty: candidate.qty,
				unitSalesPrice: candidate.unitSalesPrice,
			})),
		).toEqual([
			{
				sourceType: "dyke-door-product",
				sourceUid: "carrara-door",
				variantUid: "w2_10-h6_8",
				qty: 2,
				unitSalesPrice: 95.5,
			},
			{
				sourceType: "dyke-door-product",
				sourceUid: "carrara-door",
				variantUid: "w3_0-h6_8",
				qty: 3,
				unitSalesPrice: 95.5,
			},
		]);
	});

	it("preserves produceable semantics for persisted mixed grouped metadata rows", () => {
		const hptLine = {
			...emptyItem,
			id: 21,
			description: "House Package Tool",
			dykeProduction: true,
			meta: {
				formSteps: [
					{
						prodUid: "door-root",
						qty: 1,
						value: "Door",
						step: {
							uid: "item-type-step",
							title: "Item Type",
						},
						meta: {
							selectedComponents: [
								{
									id: 501,
									uid: "door-501",
									title: "30in Door",
								},
							],
						},
					},
					{
						prodUid: "door-501",
						qty: 2,
						value: "30in Door",
						step: {
							uid: "door-step",
							title: "Door",
						},
						meta: {
							selectedComponents: [
								{
									id: 501,
									uid: "door-501",
									title: "30in Door",
								},
							],
						},
					},
				],
				housePackageTool: {
					totalDoors: 2,
					doors: [
						{
							stepProductId: 501,
							totalQty: 2,
							dimension: "30 x 80",
						},
					],
				},
			},
		};
		const serviceLine = {
			...emptyItem,
			id: 22,
			description: "Install Service",
			dykeProduction: true,
			meta: {
				formSteps: [
					{
						prodUid: "service-install",
						qty: 1,
						value: "Services",
						step: {
							uid: "service-step",
							title: "Services",
						},
					},
				],
				serviceRows: [
					{
						title: "Installation",
						qty: 1,
					},
				],
			},
		};
		const mouldingLine = {
			...emptyItem,
			id: 23,
			description: "Moulding",
			dykeProduction: true,
			meta: {
				mouldingRows: [
					{
						title: "Casing",
						qty: 8,
					},
				],
				housePackageTool: {
					totalDoors: 0,
					doors: [],
					stepProduct: {
						uid: "moulding-casing",
						name: "Casing",
						step: {
							uid: "moulding-step",
							title: "Moulding",
						},
					},
				},
			},
		};

		expect(
			[hptLine, serviceLine, mouldingLine].map((line) =>
				resolveSalesItemProductionEligibility(line),
			),
		).toEqual([true, true, false]);

		expect(
			buildInventorySyncComponentCandidatesForItem(hptLine).map(
				(candidate) => candidate.sourceType,
			),
		).toEqual(["dyke-step-product", "dyke-step-product", "dyke-door-product"]);
		expect(
			buildInventorySyncComponentCandidatesForItem(serviceLine).map(
				(candidate) => candidate.sourceUid,
			),
		).toEqual(["service-install"]);
		expect(
			buildInventorySyncComponentCandidatesForItem(mouldingLine).map(
				(candidate) => candidate.sourceUid,
			),
		).toEqual(["moulding-casing"]);
	});

	it("uses HPT moulding price tags as cost and sales fallback", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem(
			{
				...emptyItem,
				id: 30,
				description: "WM886 DOOR STOP",
				qty: 25,
				rate: 2.46,
				total: 61.5,
				housePackageTool: {
					deletedAt: null,
					totalDoors: 0,
					meta: {
						priceTags: {
							moulding: {
								basePrice: 1.85,
								salesPrice: 2.46,
							},
						},
					},
					stepProduct: {
						uid: "sd4RQ",
						name: "WM886 DOOR STOP",
						step: {
							uid: "8iDAw",
							title: "Moulding",
						},
					},
					doors: [],
				},
			},
			{
				profileCoefficient: 0.75,
			},
		);

		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.sourceUid).toBe("sd4RQ");
		expect(candidates[0]?.unitCostPrice).toBe(1.85);
		expect(candidates[0]?.unitSalesPrice).toBe(2.46);
	});

	it("derives missing HPT moulding cost from sales fallback and customer profile coefficient", () => {
		const candidates = buildInventorySyncComponentCandidatesForItem(
			{
				...emptyItem,
				id: 31,
				description: "SHIMS CEDAR BUNDLE",
				qty: 4,
				rate: 5.69,
				total: 22.76,
				housePackageTool: {
					deletedAt: null,
					totalDoors: 0,
					meta: {
						priceTags: {
							moulding: {
								basePrice: 0,
								salesPrice: 5.69,
							},
						},
					},
					stepProduct: {
						uid: "55fsQ",
						name: "SHIMS CEDAR BUNDLE",
						step: {
							uid: "8iDAw",
							title: "Moulding",
						},
					},
					doors: [],
				},
			},
			{
				profileCoefficient: 0.75,
			},
		);

		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.unitCostPrice).toBe(4.27);
		expect(candidates[0]?.unitSalesPrice).toBe(5.69);
	});

	it("treats produceable service rows as production eligible", () => {
		expect(
			resolveSalesItemProductionEligibility({
				...emptyItem,
				dykeProduction: true,
				formSteps: [
					{
						prodUid: "service-root",
						value: "Services",
						qty: 1,
						meta: {},
						step: {
							uid: "service-step",
							title: "Services",
						},
						component: {
							uid: "service-root",
							name: "Install",
						},
					},
				],
			}),
		).toBe(true);
	});

	it("lets explicit non-produceable metadata override Dyke production flags", () => {
		expect(
			resolveSalesItemProductionEligibility({
				...emptyItem,
				dykeProduction: true,
				meta: {
					produceable: false,
				},
				formSteps: [
					{
						prodUid: "door-root",
						value: "Door",
						qty: 1,
						meta: {},
						step: {
							uid: "door-step",
							title: "Door",
						},
						component: {
							uid: "door-root",
							name: "Door",
						},
					},
				],
			}),
		).toBe(false);
	});

	it("treats non-produceable service rows as production ineligible", () => {
		expect(
			resolveSalesItemProductionEligibility({
				...emptyItem,
				dykeProduction: false,
				formSteps: [
					{
						prodUid: "service-root",
						value: "Services",
						qty: 1,
						meta: {},
						step: {
							uid: "service-step",
							title: "Services",
						},
						component: {
							uid: "service-root",
							name: "Install",
						},
					},
				],
			}),
		).toBe(false);
	});

	it("treats moulding rows as production ineligible even when they carry HPT metadata", () => {
		expect(
			resolveSalesItemProductionEligibility({
				...emptyItem,
				description: "Moulding",
				dykeProduction: false,
				housePackageTool: {
					deletedAt: null,
					totalDoors: 0,
					stepProduct: {
						uid: "moulding-casing",
						name: "Casing",
						step: {
							uid: "moulding-step",
							title: "Moulding",
						},
					},
					doors: [],
				},
			}),
		).toBe(false);
	});

	it("cleans removed sales-item inventory lines only after the stale line soft-delete is confirmed", async () => {
		const calls: Array<{ name: string; payload?: unknown }> = [];
		const db = {
			salesOrders: {
				findFirstOrThrow: async () => {
					calls.push({ name: "salesOrders.findFirstOrThrow" });
					return {
						id: 9001,
						inventoryStatus: null,
						salesProfile: null,
						items: [],
						lineItems: [
							{
								id: 91,
								salesItemId: 10,
								inventoryId: 20,
								components: [],
							},
						],
					};
				},
			},
			lineItem: {
				updateMany: async (payload: unknown) => {
					calls.push({ name: "lineItem.updateMany", payload });
					return { count: 1 };
				},
			},
			lineItemComponents: {
				findMany: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.findMany", payload });
					return [{ id: 501 }, { id: 502 }];
				},
				deleteMany: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.deleteMany", payload });
					return { count: 2 };
				},
			},
			stockAllocation: {
				updateMany: async (payload: unknown) => {
					calls.push({ name: "stockAllocation.updateMany", payload });
					return { count: 2 };
				},
				deleteMany: async (payload: unknown) => {
					calls.push({ name: "stockAllocation.deleteMany", payload });
					return { count: 2 };
				},
			},
			inboundDemand: {
				updateMany: async (payload: unknown) => {
					calls.push({ name: "inboundDemand.updateMany", payload });
					return { count: 1 };
				},
				deleteMany: async (payload: unknown) => {
					calls.push({ name: "inboundDemand.deleteMany", payload });
					return { count: 1 };
				},
			},
		};

		const result = await syncSalesInventoryLineItems(db as any, {
			salesOrderId: 9001,
			source: "repair",
		});
		const lineUpdate = calls.find((call) => call.name === "lineItem.updateMany");
		const componentRead = calls.find(
			(call) => call.name === "lineItemComponents.findMany",
		);
		const childCleanup = calls.filter((call) =>
			[
				"stockAllocation.updateMany",
				"stockAllocation.deleteMany",
				"inboundDemand.updateMany",
				"inboundDemand.deleteMany",
				"lineItemComponents.deleteMany",
			].includes(call.name),
		);

		expect(result.deletedCount).toBe(1);
		expect(lineUpdate?.payload).toMatchObject({
			where: {
				id: {
					in: [91],
				},
				deletedAt: null,
				lineItemType: "SALE",
				saleId: 9001,
				salesItemId: {
					in: [10],
				},
			},
		});
		expect(componentRead?.payload).toMatchObject({
			where: {
				lineItemId: {
					in: [91],
				},
				parent: {
					is: {
						deletedAt: {
							not: null,
						},
					},
				},
			},
		});
		expect(childCleanup.map((call) => call.name)).toEqual([
			"stockAllocation.updateMany",
			"stockAllocation.deleteMany",
			"inboundDemand.updateMany",
			"inboundDemand.deleteMany",
			"lineItemComponents.deleteMany",
		]);
	});

	it("guards stale component cleanup by the exact pre-read component identity", async () => {
		const calls: Array<{ name: string; payload?: unknown }> = [];
		let lineItemFindCount = 0;
		const db = {
			salesOrders: {
				findFirstOrThrow: async () => ({
					id: 9001,
					inventoryStatus: null,
					salesProfile: null,
					items: [
						{
							id: 10,
							description: "Configured line",
							dykeProduction: true,
							qty: 1,
							rate: 100,
							total: 100,
							meta: {
								inventoryId: 20,
								inventoryVariantId: 30,
								inventoryCategoryId: 40,
							},
							formSteps: [],
							shelfItems: [],
							housePackageTool: null,
						},
					],
					lineItems: [
						{
							id: 91,
							salesItemId: 10,
							inventoryId: 20,
							components: [],
						},
					],
				}),
			},
			inventory: {
				findFirst: async () => ({
					uid: "configured-line",
				}),
			},
			lineItem: {
				findUnique: async () => {
					lineItemFindCount += 1;
					if (lineItemFindCount === 1) {
						return { id: 91 };
					}
					return {
						id: 91,
						inventoryId: 20,
						components: [
							{
								id: 501,
								subComponentId: 601,
								inventoryVariantId: 701,
							},
						],
					};
				},
				update: async (payload: unknown) => {
					calls.push({ name: "lineItem.update", payload });
					return { id: 91 };
				},
				updateMany: async (payload: unknown) => {
					calls.push({ name: "lineItem.updateMany", payload });
					return { count: 0 };
				},
			},
			stockAllocation: {
				updateMany: async (payload: unknown) => {
					calls.push({ name: "stockAllocation.updateMany", payload });
					return { count: 1 };
				},
				deleteMany: async (payload: unknown) => {
					calls.push({ name: "stockAllocation.deleteMany", payload });
					return { count: 1 };
				},
			},
			inboundDemand: {
				updateMany: async (payload: unknown) => {
					calls.push({ name: "inboundDemand.updateMany", payload });
					return { count: 1 };
				},
				deleteMany: async (payload: unknown) => {
					calls.push({ name: "inboundDemand.deleteMany", payload });
					return { count: 1 };
				},
			},
			lineItemComponents: {
				deleteMany: async (payload: unknown) => {
					calls.push({ name: "lineItemComponents.deleteMany", payload });
					return { count: 1 };
				},
			},
		};

		await syncSalesInventoryLineItems(db as any, {
			salesOrderId: 9001,
			source: "repair",
		});
		const allocationUpdate = calls.find(
			(call) => call.name === "stockAllocation.updateMany",
		);
		const allocationDelete = calls.find(
			(call) => call.name === "stockAllocation.deleteMany",
		);
		const inboundDelete = calls.find(
			(call) => call.name === "inboundDemand.deleteMany",
		);
		const componentDelete = calls.find(
			(call) => call.name === "lineItemComponents.deleteMany",
		);
		const exactComponentIdentity = {
			OR: [
				{
					id: 501,
					lineItemId: 91,
					subComponentId: 601,
					inventoryVariantId: 701,
				},
			],
		};

		expect(allocationUpdate?.payload).toMatchObject({
			where: {
				lineItemComponentId: {
					in: [501],
				},
				lineItemComponent: {
					is: exactComponentIdentity,
				},
			},
		});
		expect(allocationDelete?.payload).toMatchObject({
			where: {
				lineItemComponentId: {
					in: [501],
				},
				lineItemComponent: {
					is: exactComponentIdentity,
				},
				deletedAt: {
					not: null,
				},
				status: "released",
			},
		});
		expect(inboundDelete?.payload).toMatchObject({
			where: {
				lineItemComponentId: {
					in: [501],
				},
				lineItemComponent: {
					is: exactComponentIdentity,
				},
				deletedAt: {
					not: null,
				},
				status: "cancelled",
			},
		});
		expect(componentDelete?.payload).toMatchObject({
			where: exactComponentIdentity,
		});
	});

	it("skips removed sales-item child cleanup when stale line soft-delete is not confirmed", async () => {
		const calls: string[] = [];
		const db = {
			salesOrders: {
				findFirstOrThrow: async () => {
					calls.push("salesOrders.findFirstOrThrow");
					return {
						id: 9001,
						inventoryStatus: null,
						salesProfile: null,
						items: [],
						lineItems: [
							{
								id: 91,
								salesItemId: 10,
								inventoryId: 20,
								components: [],
							},
						],
					};
				},
			},
			lineItem: {
				updateMany: async () => {
					calls.push("lineItem.updateMany");
					return { count: 0 };
				},
			},
			lineItemComponents: {
				findMany: async () => {
					calls.push("lineItemComponents.findMany");
					return [{ id: 501 }];
				},
				deleteMany: async () => {
					calls.push("lineItemComponents.deleteMany");
					return { count: 1 };
				},
			},
			stockAllocation: {
				updateMany: async () => {
					calls.push("stockAllocation.updateMany");
					return { count: 1 };
				},
				deleteMany: async () => {
					calls.push("stockAllocation.deleteMany");
					return { count: 1 };
				},
			},
			inboundDemand: {
				updateMany: async () => {
					calls.push("inboundDemand.updateMany");
					return { count: 1 };
				},
				deleteMany: async () => {
					calls.push("inboundDemand.deleteMany");
					return { count: 1 };
				},
			},
		};

		const result = await syncSalesInventoryLineItems(db as any, {
			salesOrderId: 9001,
			source: "repair",
		});

		expect(result.deletedCount).toBe(0);
		expect(calls).toEqual([
			"salesOrders.findFirstOrThrow",
			"lineItem.updateMany",
		]);
	});
});
