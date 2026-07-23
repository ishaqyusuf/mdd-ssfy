import { describe, expect, test } from "bun:test";
import { deriveDoorProductionPreflight } from "./sales-overview-production-preflight";

function readyInput() {
	return {
		sale: {
			overviewItems: [
				{
					title: "Interior pre-hung door",
					configurationSteps: [{ label: "Hinge", value: "Satin nickel" }],
					doors: [
						{
							dimension: "2-8 x 8-0",
							swing: "LH",
							lhQty: 2,
							rhQty: 0,
							totalQty: 2,
						},
					],
				},
			],
			customerProfile: { id: 7, title: "Builder" },
			taxSummary: { configured: true, codes: ["FL-6"] },
			deliveryOption: "delivery",
			shippingAddressConfigured: true,
			addressData: {
				shipping: { lines: ["Ada Homes", "123 Main St", "Miami, FL"] },
			},
			documentReadiness: { status: "ready" },
		},
		inventory: {
			summary: { readiness: "ready_for_production" },
			rows: [
				{
					trackingPolicy: "tracked",
					qtyRequired: 2,
					inventoryVariantId: 22,
					cost: 180,
					salesPrice: 245,
					supplierCount: 1,
					hasSupplierPrice: true,
					supplierNames: ["Masonite"],
				},
			],
		},
	};
}

describe("door production preflight", () => {
	test("marks a fully configured door order ready", () => {
		const result = deriveDoorProductionPreflight(readyInput());

		expect(result.overallStatus).toBe("ready");
		expect(result.counts).toEqual({
			ready: 6,
			review: 0,
			blocked: 0,
			notApplicable: 0,
		});
		expect(result.checks.map((check) => check.id)).toEqual([
			"door_configuration",
			"customer_pricing",
			"supplier_variant",
			"inventory",
			"fulfillment",
			"pdf",
		]);
	});

	test("blocks missing dimensions, pricing profile, and inventory sync", () => {
		const input = readyInput();
		const door = input.sale.overviewItems[0]?.doors[0];
		if (!door) throw new Error("Expected door fixture");
		door.dimension = "";
		door.swing = "";
		door.lhQty = 0;
		input.sale.customerProfile = null as never;
		input.sale.taxSummary.configured = false;
		input.inventory.summary.readiness = "not_synced";
		input.inventory.rows = [];

		const result = deriveDoorProductionPreflight(input);

		expect(result.overallStatus).toBe("blocked");
		const doorCheck = result.checks.find(
			(check) => check.id === "door_configuration",
		);
		expect(doorCheck?.status).toBe("blocked");
		expect(doorCheck?.actionTab).toBe("details");
		expect(
			result.checks.find((check) => check.id === "customer_pricing")?.status,
		).toBe("blocked");
		const inventoryCheck = result.checks.find(
			(check) => check.id === "inventory",
		);
		expect(inventoryCheck?.status).toBe("blocked");
		expect(inventoryCheck?.actionTab).toBe("inventory");
	});

	test("blocks a door whose quantity has no explicit handing or no-handle choice", () => {
		const input = readyInput();
		const door = input.sale.overviewItems[0]?.doors[0];
		if (!door) throw new Error("Expected door fixture");
		door.swing = "";
		door.lhQty = 0;
		door.rhQty = 0;
		door.noHandle = false;

		const result = deriveDoorProductionPreflight(input);

		expect(
			result.checks.find((check) => check.id === "door_configuration")?.status,
		).toBe("blocked");
	});

	test("accepts an explicit no-handle choice with unhanded quantity", () => {
		const input = readyInput();
		const door = input.sale.overviewItems[0]?.doors[0];
		if (!door) throw new Error("Expected door fixture");
		door.swing = "";
		door.lhQty = 0;
		door.rhQty = 0;
		door.noHandle = true;

		const result = deriveDoorProductionPreflight(input);

		expect(
			result.checks.find((check) => check.id === "door_configuration")?.status,
		).toBe("ready");
	});

	test("surfaces supplier and inbound work as review instead of ready", () => {
		const input = readyInput();
		const inventoryRow = input.inventory.rows[0];
		if (!inventoryRow) throw new Error("Expected inventory row fixture");
		inventoryRow.supplierCount = 0;
		inventoryRow.hasSupplierPrice = false;
		inventoryRow.supplierNames = [];
		input.inventory.summary.readiness = "awaiting_inbound";
		input.sale.documentReadiness.status = "stale";

		const result = deriveDoorProductionPreflight(input);

		expect(result.overallStatus).toBe("review");
		expect(
			result.checks.find((check) => check.id === "supplier_variant")?.status,
		).toBe("review");
		expect(
			result.checks.find((check) => check.id === "inventory")?.status,
		).toBe("review");
		expect(result.checks.find((check) => check.id === "pdf")?.status).toBe(
			"review",
		);
	});

	test("blocks a selected supplier variant without supplier price evidence", () => {
		const input = readyInput();
		const inventoryRow = input.inventory.rows[0];
		if (!inventoryRow) throw new Error("Expected inventory row fixture");
		inventoryRow.hasSupplierPrice = false;

		const result = deriveDoorProductionPreflight(input);

		expect(
			result.checks.find((check) => check.id === "supplier_variant")?.status,
		).toBe("blocked");
	});

	test("requires an explicit shipping-address readiness signal for delivery", () => {
		const input = readyInput();
		input.sale.shippingAddressConfigured = false;
		input.sale.addressData.shipping = {
			lines: ["Ada Homes", "555-0100", "ada@example.com"],
		};

		const result = deriveDoorProductionPreflight(input);

		expect(
			result.checks.find((check) => check.id === "fulfillment")?.status,
		).toBe("blocked");
	});

	test("treats non-door orders as not applicable for door configuration", () => {
		const input = readyInput();
		input.sale.overviewItems = [
			{
				title: "Moulding",
				configurationSteps: [],
				doors: [],
			},
		];

		const result = deriveDoorProductionPreflight(input);

		expect(
			result.checks.find((check) => check.id === "door_configuration")?.status,
		).toBe("not_applicable");
		expect(result.overallStatus).toBe("ready");
	});
});
