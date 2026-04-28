import { describe, expect, it } from "bun:test";

import { applyDefaultSalesRepScope } from "./sales";

describe("applyDefaultSalesRepScope", () => {
  it("scopes default queries to the current sales rep", () => {
    expect(
      applyDefaultSalesRepScope(
        {
          defaultSearch: true,
          salesType: "order",
        },
        42,
      ),
    ).toMatchObject({
      salesRepId: 42,
    });
  });

  it("keeps manager queries unscoped when showing all sales", () => {
    expect(
      applyDefaultSalesRepScope(
        {
          defaultSearch: true,
          showing: "all sales",
          salesType: "order",
        },
        42,
      ),
    ).not.toHaveProperty("salesRepId");
  });

  it("scopes empty-search quote queries to the current sales rep", () => {
    expect(
      applyDefaultSalesRepScope(
        {
          q: "",
          salesType: "quote",
        },
        42,
      ),
    ).toMatchObject({
      salesRepId: 42,
    });
  });

  it("does not scope bin queries by default", () => {
    expect(
      applyDefaultSalesRepScope(
        {
          defaultSearch: true,
          bin: true,
          salesType: "order",
        },
        42,
      ),
    ).not.toHaveProperty("salesRepId");
  });
});
