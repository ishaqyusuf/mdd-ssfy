import { describe, expect, it } from "bun:test";
import {
	getSalesCustomerSelectorRoute,
	getSalesDashboardDocumentType,
	getSalesDispatchCreateRoute,
	salesDashboardActionOptions,
} from "./sales-dashboard-action-options";

describe("sales dashboard action options", () => {
	it("offers Sales, Quote, and Dispatch choices in dashboard order", () => {
		expect(salesDashboardActionOptions.map((option) => option.title)).toEqual([
			"Sales",
			"Quote",
			"Dispatch",
		]);
		expect(salesDashboardActionOptions.map((option) => option.action)).toEqual([
			"sales",
			"quote",
			"dispatch",
		]);
	});

	it("maps document actions to form types", () => {
		expect(getSalesDashboardDocumentType("sales")).toBe("order");
		expect(getSalesDashboardDocumentType("quote")).toBe("quote");
		expect(getSalesDashboardDocumentType("dispatch")).toBeNull();
	});

	it("routes a new Sales document to the typed customer selector", () => {
		expect(getSalesCustomerSelectorRoute("order")).toEqual({
			pathname: "/(sales)/invoices/customer-selector",
			params: { type: "order", source: "new" },
		});
	});

	it("routes a new Quote document to the typed customer selector", () => {
		expect(getSalesCustomerSelectorRoute("quote")).toEqual({
			pathname: "/(sales)/invoices/customer-selector",
			params: { type: "quote", source: "new" },
		});
	});

	it("routes Dispatch to the existing sales dispatch search route", () => {
		expect(getSalesDispatchCreateRoute()).toBe("/(sales)/dispatch/new");
	});
});
