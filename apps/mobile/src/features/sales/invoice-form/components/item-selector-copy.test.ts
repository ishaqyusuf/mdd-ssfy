import { describe, expect, it } from "bun:test";
import { getItemSelectorRowSubtitle } from "./item-selector-copy";

describe("item selector copy", () => {
  it("keeps ordinary non-workflow SKU and category subtitles", () => {
    expect(
      getItemSelectorRowSubtitle({
        uid: "shelf-12",
        source: "shelf",
        title: "Shelf pin",
        sku: "SHELF-12",
        category: "Hardware",
        unitPrice: 8,
        taxxable: true,
        status: "Available",
      }),
    ).toBe("SHELF-12 - Hardware");
  });

  it("uses category subtitles for workflow root rows", () => {
    expect(
      getItemSelectorRowSubtitle({
        uid: "workflow-door-package",
        source: "workflow",
        title: "Door package",
        sku: "Workflow component",
        category: "Components",
        unitPrice: 0,
        taxxable: true,
        status: "Configure",
      }),
    ).toBe("Components");
  });

  it("does not show uid-like workflow category subtitles", () => {
    expect(
      getItemSelectorRowSubtitle({
        uid: "workflow-door-package",
        source: "workflow",
        title: "Door package",
        sku: "workflow-door-package",
        category: "workflow-door-package",
        unitPrice: 0,
        taxxable: true,
        status: "Configure",
      } as any),
    ).toBe("Components");
  });
});
