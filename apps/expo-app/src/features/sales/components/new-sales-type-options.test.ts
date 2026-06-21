import { describe, expect, it } from "bun:test";
import {
  getNewSalesCustomerSelectorRoute,
  newSalesTypeOptions,
} from "./new-sales-type-options";

describe("new sales type options", () => {
  it("offers Sales and Quote choices with the expected form types", () => {
    expect(newSalesTypeOptions.map((option) => option.title)).toEqual([
      "Sales",
      "Quote",
    ]);
    expect(newSalesTypeOptions.map((option) => option.type)).toEqual([
      "order",
      "quote",
    ]);
  });

  it("routes a new Sales document to the typed customer selector", () => {
    expect(getNewSalesCustomerSelectorRoute("order")).toEqual({
      pathname: "/(sales)/invoices/customer-selector",
      params: { type: "order", source: "new" },
    });
  });

  it("routes a new Quote document to the typed customer selector", () => {
    expect(getNewSalesCustomerSelectorRoute("quote")).toEqual({
      pathname: "/(sales)/invoices/customer-selector",
      params: { type: "quote", source: "new" },
    });
  });
});
