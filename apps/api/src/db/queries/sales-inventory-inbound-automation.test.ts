import { describe, expect, test } from "bun:test";

import { planOrderedInboundAutomation } from "./sales-inventory-inbound-automation";

describe("planOrderedInboundAutomation", () => {
	test("updates pending linked inbounds and groups unlinked demand by supplier", () => {
		expect(
			planOrderedInboundAutomation([
				{
					id: 1,
					inboundShipmentItem: {
						inboundId: 90,
						inbound: { status: "pending" },
					},
					inventoryVariant: {
						inventory: { defaultSupplierId: null },
						supplierVariants: [],
					},
				},
				{
					id: 2,
					inboundShipmentItem: null,
					inventoryVariant: {
						inventory: { defaultSupplierId: 12 },
						supplierVariants: [],
					},
				},
				{
					id: 3,
					inboundShipmentItem: null,
					inventoryVariant: {
						inventory: { defaultSupplierId: null },
						supplierVariants: [
							{ supplierId: 14, preferred: true, active: true },
						],
					},
				},
			]),
		).toEqual({
			inboundIdsToStart: [90],
			createGroups: [
				{ supplierId: 12, demandIds: [2] },
				{ supplierId: 14, demandIds: [3] },
			],
			skippedDemandIds: [],
		});
	});

	test("does not regress active or terminal linked inbounds", () => {
		expect(
			planOrderedInboundAutomation([
				{
					id: 4,
					inboundShipmentItem: {
						inboundId: 91,
						inbound: { status: "in_progress" },
					},
					inventoryVariant: {
						inventory: { defaultSupplierId: null },
						supplierVariants: [],
					},
				},
				{
					id: 5,
					inboundShipmentItem: {
						inboundId: 92,
						inbound: { status: "completed" },
					},
					inventoryVariant: {
						inventory: { defaultSupplierId: null },
						supplierVariants: [],
					},
				},
			]),
		).toEqual({
			inboundIdsToStart: [],
			createGroups: [],
			skippedDemandIds: [],
		});
	});

	test("groups supplier-ambiguous demand into an unassigned inbound", () => {
		expect(
			planOrderedInboundAutomation([
				{
					id: 6,
					inboundShipmentItem: null,
					inventoryVariant: {
						inventory: { defaultSupplierId: null },
						supplierVariants: [
							{ supplierId: 20, preferred: false, active: true },
							{ supplierId: 21, preferred: false, active: true },
						],
					},
				},
			]),
		).toEqual({
			inboundIdsToStart: [],
			createGroups: [{ supplierId: null, demandIds: [6] }],
			skippedDemandIds: [6],
		});
	});
});
