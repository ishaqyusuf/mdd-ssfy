import { describe, expect, it } from "bun:test";
import {
	buildInventorySyncComponentCandidatesForItem,
	planComponentDemandState,
	resolveProjectedInboundDemandStatus,
	resolveSalesItemProductionEligibility,
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
						qty: 4,
						unitPrice: 20,
						totalPrice: 80,
						meta: {
							basePrice: 12,
							salesPrice: 20,
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
		expect(candidates[0]?.unitSalesPrice).toBe(20);
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
});
