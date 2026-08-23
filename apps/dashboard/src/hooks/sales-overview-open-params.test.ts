import { describe, expect, it } from "bun:test";
import {
	buildMaterialSalesOverviewUrl,
	buildProductionSalesOverviewUrl,
	buildSalesOverviewUrl,
	composeLegacyQuoteOverviewOpenParams,
	composeLegacySalesOverviewOpenParams,
	composeMaterialSalesOverviewOpenParams,
	composeProductionSalesOverviewOpenParams,
} from "./sales-overview-open-params";

describe("sales overview open params", () => {
	it("maps a legacy quote row uuid to the quote overview query state", () => {
		expect(composeLegacyQuoteOverviewOpenParams("quote-uuid-1")).toEqual({
			"sales-overview-id": "quote-uuid-1",
			"sales-type": "quote",
			mode: "quote",
			salesTab: "general",
		});
	});

	it("keeps assigned production users on the production view for legacy opens", () => {
		expect(
			composeLegacySalesOverviewOpenParams("order-uuid-1", "sales", {
				assignedTo: 77,
			}),
		).toEqual({
			"sales-overview-id": "order-uuid-1",
			"sales-type": "order",
			mode: "production-tasks",
			salesTab: "production",
		});
	});

	it("preserves the requested canonical tab and dispatch context", () => {
		expect(
			composeLegacySalesOverviewOpenParams("order-1", "dispatch-modal", {
				dispatchId: "42",
				salesTab: "packing",
			}),
		).toEqual({
			"sales-overview-id": "order-1",
			"sales-type": "order",
			mode: "dispatch-modal",
			salesTab: "packing",
			dispatchId: 42,
		});
	});

	it("builds one canonical orders workspace URL", () => {
		expect(
			buildSalesOverviewUrl("order 1", "sales-production", {
				salesTab: "production",
			}),
		).toBe(
			"/sales-book/orders?sales-overview-id=order+1&sales-type=order&mode=sales-production&salesTab=production",
		);
	});

	it("opens Material actions in Inventory Needs with Create inbound expanded", () => {
		expect(composeMaterialSalesOverviewOpenParams("SO-1001")).toEqual({
			"sales-overview-id": "SO-1001",
			"sales-type": "order",
			mode: "sales",
			salesTab: "inventory",
			inventorySegment: "stock",
			inventoryCreateInbound: true,
		});

		const url = new URL(
			buildMaterialSalesOverviewUrl("SO 1001"),
			"https://gnd.test",
		);
		expect(url.pathname).toBe("/sales-book/orders");
		expect(Object.fromEntries(url.searchParams)).toEqual({
			"sales-overview-id": "SO 1001",
			"sales-type": "order",
			mode: "sales",
			salesTab: "inventory",
			inventorySegment: "stock",
			inventoryCreateInbound: "true",
		});
	});

	it("retains the production-only user's authorization-derived overview mode", () => {
		expect(composeMaterialSalesOverviewOpenParams("SO-1002", 77).mode).toBe(
			"production-tasks",
		);
	});

	it("opens Production actions at the exact item assignment surface", () => {
		expect(
			composeProductionSalesOverviewOpenParams("SO-1003", "item-42"),
		).toEqual({
			"sales-overview-id": "SO-1003",
			"sales-type": "order",
			mode: "sales-production",
			salesTab: "production",
			"prod-item-view": "item-42",
			"prod-item-tab": "assignments",
		});
		const url = new URL(
			buildProductionSalesOverviewUrl("SO 1003", "item-42"),
			"https://gnd.test",
		);
		expect(Object.fromEntries(url.searchParams)).toEqual({
			"sales-overview-id": "SO 1003",
			"sales-type": "order",
			mode: "sales-production",
			salesTab: "production",
			"prod-item-view": "item-42",
			"prod-item-tab": "assignments",
		});
	});

	it("keeps production-only users inside their authorization-derived mode", () => {
		expect(
			composeProductionSalesOverviewOpenParams("SO-1004", "item-43", 77),
		).toMatchObject({
			mode: "production-tasks",
			salesTab: "production",
			"prod-item-view": "item-43",
		});
	});
});
