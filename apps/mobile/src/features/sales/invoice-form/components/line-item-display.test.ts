import { describe, expect, it } from "bun:test";
import {
  getLineItemCardSubtitle,
  getLineItemDisplayTitle,
} from "./line-item-display";

describe("line item display", () => {
  it("keeps ordinary product SKU subtitles", () => {
    expect(
      getLineItemCardSubtitle({
        uid: "line-1",
        title: "Hinge",
        description: "HDW-HINGE-03",
        qty: 1,
        unitPrice: 10,
        lineTotal: 10,
        taxxable: true,
        meta: {
          sku: "HDW-HINGE-03",
        },
        formSteps: [],
        shelfItems: [],
        housePackageTool: null,
      } as any),
    ).toBe("HDW-HINGE-03");
  });

  it("hides workflow component uid subtitles on hydrated workflow lines", () => {
    expect(
      getLineItemCardSubtitle({
        uid: "line-1",
        title: "Door package",
        description: "Door package",
        qty: 1,
        unitPrice: 100,
        lineTotal: 100,
        taxxable: true,
        meta: {
          sku: "workflow-door-package",
          workflowComponentUid: "workflow-door-package",
          category: "Components",
        },
        formSteps: [{ step: { title: "Item Type" }, value: "Door package" }],
        shelfItems: [],
        housePackageTool: null,
      } as any),
    ).toBe("Components");
  });

  it("uses neutral copy when a sparse workflow line only has identity values", () => {
    expect(
      getLineItemCardSubtitle({
        uid: "workflow-door-package",
        title: "workflow-door-package",
        description: "workflow-door-package",
        qty: 1,
        unitPrice: 0,
        lineTotal: 0,
        taxxable: true,
        meta: {
          sku: "workflow-door-package",
          workflowComponentUid: "workflow-door-package",
        },
        formSteps: [{ step: { title: "Item Type" } }],
        shelfItems: [],
        housePackageTool: null,
      } as any),
    ).toBe("Workflow item");
  });

  it("hides uid-like workflow fallback copy that differs from the stored identity", () => {
    expect(
      getLineItemCardSubtitle({
        uid: "line-1",
        title: "door-package-uid",
        description: "workflow-door-package",
        qty: 1,
        unitPrice: 0,
        lineTotal: 0,
        taxxable: true,
        meta: {
          sku: "workflow-door-package",
          workflowComponentUid: "door-package",
        },
        formSteps: [{ step: { title: "Item Type" } }],
        shelfItems: [],
        housePackageTool: null,
      } as any),
    ).toBe("Workflow item");
  });

  it("uses workflow category before uid-like description copy", () => {
    expect(
      getLineItemCardSubtitle({
        uid: "line-1",
        title: "door-package-uid",
        description: "workflow-door-package",
        qty: 1,
        unitPrice: 0,
        lineTotal: 0,
        taxxable: true,
        meta: {
          sku: "workflow-door-package",
          workflowComponentUid: "door-package",
          category: "Door package",
        },
        formSteps: [{ step: { title: "Item Type" } }],
        shelfItems: [],
        housePackageTool: null,
      } as any),
    ).toBe("Door package");
  });

  it("reads workflow subtitle metadata from JSON strings", () => {
    expect(
      getLineItemCardSubtitle({
        uid: "line-1",
        title: "workflow-door-package",
        description: "workflow-door-package",
        qty: 1,
        unitPrice: 0,
        lineTotal: 0,
        taxxable: true,
        meta: JSON.stringify({
          sku: "workflow-door-package",
          workflowComponentUid: "door-package",
          category: "Door package",
        }),
        formSteps: [{ step: { title: "Item Type" } }],
        shelfItems: [],
        housePackageTool: null,
      } as any),
    ).toBe("Door package");
  });

  it("keeps ordinary product titles visible", () => {
    expect(
      getLineItemDisplayTitle({
        uid: "line-1",
        title: "Hinge",
        description: "HDW-HINGE-03",
        qty: 1,
        unitPrice: 10,
        lineTotal: 10,
        taxxable: true,
        meta: {
          sku: "HDW-HINGE-03",
        },
        formSteps: [],
        shelfItems: [],
        housePackageTool: null,
      } as any),
    ).toBe("Hinge");
  });

  it("hides uid-like workflow titles in shared display title copy", () => {
    expect(
      getLineItemDisplayTitle({
        uid: "line-1",
        title: "workflow-door-package",
        description: "Door package",
        qty: 1,
        unitPrice: 0,
        lineTotal: 0,
        taxxable: true,
        meta: {
          sku: "workflow-door-package",
          workflowComponentUid: "workflow-door-package",
        },
        formSteps: [{ step: { title: "Item Type" } }],
        shelfItems: [],
        housePackageTool: null,
      } as any),
    ).toBe("Door package");
  });
});
