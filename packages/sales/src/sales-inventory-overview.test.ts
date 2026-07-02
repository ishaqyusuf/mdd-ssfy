import { describe, expect, test } from "bun:test";

import {
	buildSalesOverviewInventoryGroups,
	buildSalesOverviewInventoryMergedRows,
	hasPassedInventoryTrackingRepairBoundary,
	resolveSalesInventoryOperationPolicy,
	resolveSalesInventoryOverviewSetupMode,
	resolveSalesInventoryRequirementDisplay,
	summarizeSalesInventoryOverview,
} from "./sales-inventory-overview";

describe("resolveSalesInventoryOverviewSetupMode", () => {
	test("keeps fulfilled orders without inventory rows read-only", () => {
		expect(
			resolveSalesInventoryOverviewSetupMode({
				lifecycleStatus: "fulfilled",
				inventoryRowCount: 0,
			}),
		).toBe("completed_readonly");
	});

	test("keeps active orders without inventory rows configurable", () => {
		expect(
			resolveSalesInventoryOverviewSetupMode({
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 0,
			}),
		).toBe("not_configured");
	});

	test("locks active orders with a manual inbound status before inventory setup", () => {
		expect(
			resolveSalesInventoryOverviewSetupMode({
				lifecycleStatus: "awaiting_production",
				inventoryRowCount: 0,
				inventoryStatus: "ORDERED",
			}),
		).toBe("legacy_status_locked");
	});

	test("keeps fulfilled orders with inventory rows inspectable as active setup", () => {
		expect(
			resolveSalesInventoryOverviewSetupMode({
				lifecycleStatus: "fulfilled",
				inventoryRowCount: 1,
			}),
		).toBe("active");
	});
});

describe("resolveSalesInventoryOperationPolicy", () => {
	test("blocks new inventory work for fulfilled orders with inventory rows", () => {
		const policy = resolveSalesInventoryOperationPolicy({
			lifecycleStatus: "fulfilled",
			setupMode: "active",
		});

		expect(policy).toMatchObject({
			mode: "completed_readonly",
			isReadOnly: true,
			capabilities: {
				canSync: false,
				canCreateInbound: false,
				canAllocateStock: false,
				canMarkAvailable: false,
				canConfigureTracking: false,
			},
		});
	});

	test("blocks new inventory work for cancelled orders with inventory rows", () => {
		const policy = resolveSalesInventoryOperationPolicy({
			lifecycleStatus: "cancelled",
			setupMode: "active",
		});

		expect(policy).toMatchObject({
			mode: "cancelled_readonly",
			isReadOnly: true,
			capabilities: {
				canSync: false,
				canCreateInbound: false,
				canAllocateStock: false,
				canMarkAvailable: false,
				canConfigureTracking: false,
			},
		});
	});

	test("allows active non-terminal orders to create inbound", () => {
		const policy = resolveSalesInventoryOperationPolicy({
			lifecycleStatus: "awaiting_production",
			setupMode: "active",
		});

		expect(policy).toMatchObject({
			mode: "active",
			isReadOnly: false,
			capabilities: {
				canCreateInbound: true,
				canAllocateStock: true,
			},
		});
	});

	test("blocks first-time inventory setup behind legacy manual status", () => {
		const policy = resolveSalesInventoryOperationPolicy({
			lifecycleStatus: "awaiting_production",
			setupMode: "legacy_status_locked",
		});

		expect(policy).toMatchObject({
			mode: "legacy_status_locked",
			isReadOnly: true,
			capabilities: {
				canSync: false,
				canCreateInbound: false,
			},
		});
	});
});

describe("sales inventory requirement display policy", () => {
	test("marks untracked and not-inventory rows as not applicable", () => {
		expect(
			resolveSalesInventoryRequirementDisplay({
				trackingPolicy: "untracked",
				requiredQty: 4,
			}),
		).toMatchObject({
			status: "not_applicable",
			label: "Not Applicable",
			shortLabel: "N/A",
			canEditInboundStatus: false,
		});
		expect(
			resolveSalesInventoryRequirementDisplay({
				trackingPolicy: "not_inventory",
				requiredQty: 4,
			}).status,
		).toBe("not_applicable");
	});

	test("marks zero required tracked rows as not applicable", () => {
		expect(
			resolveSalesInventoryRequirementDisplay({
				trackingPolicy: "tracked",
				requiredQty: 0,
			}),
		).toMatchObject({
			status: "not_applicable",
			shortLabel: "N/A",
			canEditInboundStatus: false,
		});
	});

	test("keeps positive tracked rows applicable for inventory work", () => {
		expect(
			resolveSalesInventoryRequirementDisplay({
				trackingPolicy: "tracked",
				requiredQty: 1,
			}),
		).toMatchObject({
			status: "required",
			shortLabel: "Required",
			canEditInboundStatus: true,
		});
	});
});

describe("hasPassedInventoryTrackingRepairBoundary", () => {
	test("excludes ready-to-fulfill and fulfillment-stage orders from tracking repair", () => {
		expect(hasPassedInventoryTrackingRepairBoundary("ready_to_fulfill")).toBe(
			true,
		);
		expect(hasPassedInventoryTrackingRepairBoundary("fulfillment_queued")).toBe(
			true,
		);
		expect(hasPassedInventoryTrackingRepairBoundary("packing")).toBe(true);
		expect(hasPassedInventoryTrackingRepairBoundary("fulfilled")).toBe(true);
		expect(hasPassedInventoryTrackingRepairBoundary("cancelled")).toBe(true);
	});

	test("keeps pre-production and active-production orders eligible for review", () => {
		expect(
			hasPassedInventoryTrackingRepairBoundary("awaiting_production"),
		).toBe(false);
		expect(hasPassedInventoryTrackingRepairBoundary("production_queued")).toBe(
			false,
		);
		expect(hasPassedInventoryTrackingRepairBoundary("in_production")).toBe(
			false,
		);
	});
});

describe("summarizeSalesInventoryOverview", () => {
	test("marks sales without synced inventory components as not synced", () => {
		const summary = summarizeSalesInventoryOverview([]);

		expect(summary).toMatchObject({
			lineItemCount: 0,
			componentCount: 0,
			readiness: "not_synced",
		});
	});

	test("prioritizes awaiting inbound when components still need received stock", () => {
		const summary = summarizeSalesInventoryOverview([
			{
				components: [
					{
						required: true,
						qty: 4,
						qtyAllocated: 1,
						qtyInbound: 3,
						qtyReceived: 1,
						status: "partially_received",
					},
					{
						required: true,
						qty: 2,
						qtyAllocated: 2,
						status: "allocated",
					},
				],
			},
		]);

		expect(summary).toMatchObject({
			componentCount: 2,
			requiredComponentCount: 2,
			qtyRequired: 6,
			qtyAllocated: 3,
			qtyInbound: 3,
			qtyReceived: 1,
			statusCounts: {
				partially_received: 1,
				allocated: 1,
			},
			readiness: "awaiting_inbound",
		});
	});

	test("marks fully allocated components as production ready", () => {
		const summary = summarizeSalesInventoryOverview([
			{
				components: [
					{
						qty: 1,
						qtyAllocated: 1,
						status: "allocated",
					},
					{
						qty: 1,
						qtyAllocated: 1,
						status: "fulfilled",
					},
				],
			},
		]);

		expect(summary.readiness).toBe("ready_for_production");
	});
});

describe("buildSalesOverviewInventoryMergedRows", () => {
	test("merges matching components across invoice items without multiplying stock", () => {
		const groups = buildSalesOverviewInventoryGroups([
			{
				id: 10,
				qty: 6,
				salesItem: {
					id: 100,
					description: "Door group 1",
					qty: 6,
				},
				components: [
					{
						id: 1,
						required: true,
						qty: 6,
						qtyAllocated: 1,
						status: "pending",
						inventoryId: 500,
						inventoryVariantId: 501,
						inventoryCategoryId: 502,
						inventory: {
							id: 500,
							name: "HC Molded",
							stockMode: "monitored",
						},
						inventoryVariant: {
							id: 501,
							sku: "HC-MOLDED",
							stocks: [{ qty: 8 }],
						},
						inventoryCategory: {
							id: 502,
							title: "Door Type",
							stockMode: "monitored",
						},
					},
				],
			},
			{
				id: 11,
				qty: 1,
				salesItem: {
					id: 101,
					description: "Door group 2",
					qty: 1,
				},
				components: [
					{
						id: 2,
						required: true,
						qty: 1,
						qtyAllocated: 0,
						status: "pending",
						inventoryId: 500,
						inventoryVariantId: 501,
						inventoryCategoryId: 502,
						inventory: {
							id: 500,
							name: "HC Molded",
							stockMode: "monitored",
						},
						inventoryVariant: {
							id: 501,
							sku: "HC-MOLDED",
							stocks: [{ qty: 8 }],
						},
						inventoryCategory: {
							id: 502,
							title: "Door Type",
							stockMode: "monitored",
						},
					},
				],
			},
		]);

		const rows = buildSalesOverviewInventoryMergedRows(groups);

		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			componentName: "HC Molded",
			stepName: "Door Type",
			qtyRequired: 7,
			qtyInStock: 8,
			qtyAllocated: 1,
			qtyPending: 6,
			sourceLineCount: 2,
			lineItemIds: [10, 11],
			salesItemIds: [100, 101],
		});
	});

	test("exposes only unassigned pending inbound demand ids for create inbound", () => {
		const groups = buildSalesOverviewInventoryGroups([
			{
				id: 10,
				components: [
					{
						id: 1,
						qty: 4,
						status: "pending",
						inventoryId: 500,
						inventoryVariantId: 501,
						inventoryCategoryId: 502,
						inventory: {
							id: 500,
							name: "Door",
							stockMode: "monitored",
						},
						inventoryVariant: {
							id: 501,
							sku: "2-8",
							stocks: [{ qty: 0 }],
						},
						inventoryCategory: {
							id: 502,
							title: "Door",
							stockMode: "monitored",
						},
						inboundDemands: [
							{
								id: 701,
								qty: 4,
								qtyReceived: 0,
								status: "pending",
								inboundShipmentItemId: null,
								inventoryVariantId: 501,
							},
							{
								id: 702,
								qty: 2,
								qtyReceived: 0,
								status: "ordered",
								inboundShipmentItemId: 900,
								inventoryVariantId: 501,
							},
							{
								id: 703,
								qty: 1,
								qtyReceived: 1,
								status: "pending",
								inboundShipmentItemId: null,
								inventoryVariantId: 501,
							},
						],
					},
				],
			},
		]);

		const rows = buildSalesOverviewInventoryMergedRows(groups);

		expect(rows[0]).toMatchObject({
			inboundDemandIds: [701, 702, 703],
			pendingInboundDemandIds: [701],
		});
	});
});

describe("buildSalesOverviewInventoryGroups", () => {
	test("groups sale inventory rows by invoice item description", () => {
		const groups = buildSalesOverviewInventoryGroups([
			{
				id: 10,
				qty: 2,
				salesItem: {
					id: 100,
					description: "Front door package",
					qty: 2,
				},
				components: [
					{
						id: 1,
						required: true,
						qty: 4,
						qtyAllocated: 1,
						qtyInbound: 3,
						qtyReceived: 1,
						status: "partially_received",
						price: 12.5,
						inventoryId: 500,
						inventoryVariantId: 501,
						inventoryCategoryId: 502,
						inventory: {
							id: 500,
							name: "Casing",
							stockMode: "monitored",
						},
						inventoryVariant: {
							id: 501,
							uid: "casing-white",
							sku: "CASING-01",
							stocks: [{ qty: 8 }, { qty: 2 }],
						},
						inventoryCategory: {
							id: 502,
							title: "Casing",
							stockMode: "monitored",
						},
						stockAllocations: [
							{
								id: 801,
								qty: 1,
								status: "pending_review",
								inventoryVariantId: 501,
							},
							{
								id: 802,
								qty: 1,
								status: "approved",
								inventoryVariantId: 501,
							},
						],
					},
				],
			},
		]);

		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({
			label: "Front door package",
			qty: 2,
			totals: {
				qtyRequired: 4,
				qtyInStock: 10,
				qtyAllocated: 1,
				qtyPending: 2,
				cost: 12.5,
			},
		});
		expect(groups[0]?.rows[0]).toMatchObject({
			componentName: "Casing",
			stepName: "Casing",
			qtyRequired: 4,
			qtyInStock: 10,
			qtyAllocated: 1,
			qtyPending: 2,
			qtyInboundOpen: 2,
			status: "partial",
			trackingPolicy: "tracked",
			pendingStockAllocationIds: [801],
			actions: [
				"configure_tracking",
				"mark_not_inventory",
				"open_stock",
				"allocate_from_stock",
				"create_inbound",
			],
		});
	});

	test("reads cost and sales price from component line pricing snapshots", () => {
		const groups = buildSalesOverviewInventoryGroups([
			{
				id: 10,
				components: [
					{
						id: 1,
						required: true,
						qty: 4,
						price: {
							costPrice: 50.5,
							salesPrice: 80.75,
							unitCostPrice: 12.625,
							unitSalesPrice: 20.1875,
						},
						inventoryId: 500,
						inventoryVariantId: 501,
						inventoryCategoryId: 502,
						inventory: {
							id: 500,
							name: "Casing",
							stockMode: "monitored",
						},
						inventoryVariant: {
							id: 501,
							uid: "casing-white",
							sku: "CASING-01",
							attributes: [
								{
									value: {
										name: "White",
										inventoryCategory: {
											title: "Finish",
										},
									},
								},
							],
							stocks: [{ qty: 8 }],
						},
						inventoryCategory: {
							id: 502,
							title: "Casing",
							stockMode: "monitored",
						},
					},
				],
			},
		]);

		expect(groups[0]?.rows[0]?.cost).toBe(50.5);
		expect(groups[0]?.rows[0]?.salesPrice).toBe(80.75);
		expect(groups[0]?.rows[0]?.variantUid).toBe("casing-white");
		expect(groups[0]?.rows[0]?.variantSku).toBe("CASING-01");
		expect(groups[0]?.rows[0]?.variantName).toBe("White");
		expect(groups[0]?.totals.cost).toBe(50.5);
		expect(groups[0]?.totals.salesPrice).toBe(80.75);
	});

	test("normalizes door width and height variants for display", () => {
		const groups = buildSalesOverviewInventoryGroups([
			{
				id: 10,
				components: [
					{
						id: 1,
						required: true,
						qty: 1,
						inventoryId: 500,
						inventoryVariantId: 501,
						inventoryCategoryId: 502,
						inventory: {
							id: 500,
							name: "Door Slab",
							stockMode: "monitored",
						},
						inventoryVariant: {
							id: 501,
							uid: "w2_8-h8_0",
							attributes: [
								{
									value: {
										name: "2 x 8",
										inventoryCategory: {
											title: "Width",
										},
									},
								},
								{
									value: {
										name: "8 x 0",
										inventoryCategory: {
											title: "Height",
										},
									},
								},
							],
							stocks: [{ qty: 1 }],
						},
						inventoryCategory: {
							id: 502,
							title: "Door",
							stockMode: "monitored",
						},
					},
				],
			},
		]);

		expect(groups[0]?.rows[0]?.variantUid).toBe("w2_8-h8_0");
		expect(groups[0]?.rows[0]?.variantName).toBe("2-8 x 8-0");
	});

	test("normalizes door variant uid for display when attributes are missing", () => {
		const groups = buildSalesOverviewInventoryGroups([
			{
				id: 10,
				components: [
					{
						id: 1,
						required: true,
						qty: 1,
						inventoryId: 500,
						inventoryVariantId: 501,
						inventoryCategoryId: 502,
						inventory: {
							id: 500,
							name: "Door Slab",
							stockMode: "monitored",
						},
						inventoryVariant: {
							id: 501,
							uid: "w2_4-h8_0",
							stocks: [{ qty: 1 }],
						},
						inventoryCategory: {
							id: 502,
							title: "Door",
							stockMode: "monitored",
						},
					},
				],
			},
		]);

		expect(groups[0]?.rows[0]?.variantName).toBe("2-4 x 8-0");
	});

	test("marks unmapped measurements as not inventory", () => {
		const groups = buildSalesOverviewInventoryGroups([
			{
				id: 20,
				components: [
					{
						id: 2,
						required: false,
						qty: 36,
						subComponent: {
							inventoryCategory: {
								title: "Width",
							},
						},
					},
				],
			},
		]);

		expect(groups[0]?.label).toBe("Invoice Item 1");
		expect(groups[0]?.rows[0]).toMatchObject({
			componentName: "Width",
			stepName: "Width",
			status: "not_inventory",
			requirementStatus: "not_applicable",
			requirementShortLabel: "N/A",
			canEditInboundStatus: false,
			trackingPolicy: "not_inventory",
			actions: ["configure_tracking", "mark_not_inventory"],
		});
	});

	test("marks zero-quantity tracked rows as not applicable for inbound display", () => {
		const groups = buildSalesOverviewInventoryGroups([
			{
				id: 30,
				components: [
					{
						id: 3,
						required: true,
						qty: 0,
						inventoryId: 500,
						inventoryVariantId: 501,
						inventoryCategoryId: 502,
						inventory: {
							id: 500,
							name: "Trackable part",
							stockMode: "monitored",
						},
						inventoryVariant: {
							id: 501,
							sku: "TRACKED",
						},
						inventoryCategory: {
							id: 502,
							title: "Tracked",
							stockMode: "monitored",
						},
					},
				],
			},
		]);

		expect(groups[0]?.rows[0]).toMatchObject({
			status: "allocated",
			requirementStatus: "not_applicable",
			requirementShortLabel: "N/A",
			canEditInboundStatus: false,
			trackingPolicy: "tracked",
		});
	});
});
