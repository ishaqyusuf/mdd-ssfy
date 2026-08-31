import { describe, expect, it } from "bun:test";

const source = await Bun.file(
  new URL("./update-sales-control.ts", import.meta.url),
).text();

describe("update-sales-control permissions", () => {
  it("rechecks and sanitizes every task actor before resolving a write", () => {
    expect(source).toContain("salesControlTaskPermissionKeys.map");
    expect(source).toContain("userHasPermission(");
    expect(source).toContain("authorizeSalesControlTaskInput(");
    expect(source).toContain(
      "const authorizedInput = await authorizeTaskInput",
    );
    expect(source).toContain("resolveActionHandler(authorizedInput)");
    expect(source.indexOf("userHasPermission(")).toBeLessThan(
      source.indexOf("await enforceSpecialOrderForAction"),
    );
  });

  it("delivers pending material review alerts directly to the order sales rep", () => {
    const helperStart = source.indexOf(
      "async function sendProductionMaterialReviewNotification",
    );
    const helper = source.slice(helperStart, helperStart + 3200);

    expect(helper).toContain("new Notifications(db)");
    expect(helper).toContain("review.order.salesRepId");
    expect(helper).toContain("forceInAppRecipients: true");
    expect(helper).toContain("includeChannelSubscribers: false");
  });

  it("delivers production lifecycle alerts directly to the named people", () => {
    const assignedStart = source.indexOf(
      "async function sendProductionAssignedNotification",
    );
    const assigned = source.slice(assignedStart, assignedStart + 2600);

    expect(assigned).toContain("new Notifications(db)");
    expect(assigned).toContain("forceInAppRecipients: true");
    expect(assigned).toContain("includeChannelSubscribers: false");
    expect(source).toContain('"sales_production_unassigned"');
    expect(source).toContain('"sales_production_submitted"');
  });
});
