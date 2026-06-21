import { describe, expect, it } from "bun:test";
import { buildCustomerSearchInput } from "./customer-search-options";

describe("customer search options", () => {
  it("requests the top 10 recent order customers by default", () => {
    expect(buildCustomerSearchInput({ query: "" })).toEqual({
      query: "",
      recent: true,
      type: "order",
      limit: 10,
    });
  });

  it("requests the top 10 recent quote customers for quote forms", () => {
    expect(buildCustomerSearchInput({ query: "   ", type: "quote" })).toEqual({
      query: "",
      recent: true,
      type: "quote",
      limit: 10,
    });
  });

  it("switches typed customer input to selected-type search results", () => {
    expect(buildCustomerSearchInput({ query: " acme ", type: "quote" })).toEqual({
      query: "acme",
      recent: false,
      type: "quote",
      limit: 10,
    });
  });
});
