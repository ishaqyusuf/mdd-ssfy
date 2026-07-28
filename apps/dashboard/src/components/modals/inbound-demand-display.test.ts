import { describe, expect, it } from "bun:test";

import {
	buildInboundDemandDisplayById,
	resolveInboundDemandDisplay,
} from "./inbound-demand-display";

describe("inbound demand display", () => {
	it("uses the Sales Inventory overview labels for every demand in a merged row", () => {
		const displayByDemandId = buildInboundDemandDisplayById([
			{
				componentName: "Entry Door",
				stepName: "door_size",
				variantName: "2-8 x 8-0",
				inboundDemandIds: [701, 702],
			},
		]);

		expect(
			resolveInboundDemandDisplay(
				{
					id: 702,
					lineItemComponent: {
						parent: { title: "Raw sales line title" },
					},
					inventoryVariant: {
						sku: "RAW-SKU",
						uid: "w2_8-h8_0",
						inventory: { name: "Raw inventory name" },
					},
				},
				displayByDemandId,
			),
		).toEqual({
			title: "ENTRY DOOR",
			subtitle: "Door Size • 2-8 x 8-0",
			source: "sales_inventory_overview",
		});
	});

	it("falls back to the existing queue labels when overview metadata is unavailable", () => {
		expect(
			resolveInboundDemandDisplay(
				{
					id: 801,
					lineItemComponent: {
						parent: { title: "Legacy line title" },
					},
					inventoryVariant: {
						sku: "LEGACY-SKU",
						uid: "legacy-uid",
						inventory: { name: "Legacy inventory" },
					},
				},
				new Map(),
			),
		).toEqual({
			title: "Legacy line title",
			subtitle: "LEGACY-SKU",
			source: "inbound_demand_queue",
		});
	});

	it("provides a stable fallback for an unmapped demand without inventory details", () => {
		expect(resolveInboundDemandDisplay({ id: 901 }, new Map())).toEqual({
			title: "Inventory demand",
			subtitle: null,
			source: "inbound_demand_queue",
		});
	});
});
