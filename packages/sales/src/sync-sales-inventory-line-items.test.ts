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
			"dyke-house-package",
			"dyke-door-product",
		]);
		expect(candidates.map((candidate) => candidate.sourceUid)).toEqual([
			"door-root",
			"door-501",
			"shelf-prod-44",
			"door-501",
			"door-501",
		]);
		expect(candidates.map((candidate) => candidate.qty)).toEqual([
			1, 2, 3, 2, 2,
		]);
		expect(candidates[2]?.inventoryName).toBe("Shelf board");
		expect(candidates[3]?.inventoryCategoryTitle).toBe("Door");
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
		).toEqual([
			"dyke-step-product",
			"dyke-step-product",
			"dyke-house-package",
			"dyke-door-product",
		]);
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
