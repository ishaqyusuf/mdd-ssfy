import { describe, expect, it } from "bun:test";
import {
  salesFormLineItemSchema,
  salesFormPortableLineItemSchema,
} from "./schemas";

describe("sales form runtime schemas", () => {
  it("preserves portable workflow metadata while validating known fields", () => {
    const result = salesFormPortableLineItemSchema.parse({
      uid: "line-1",
      title: "Door",
      qty: 1,
      unitPrice: 100,
      meta: {
        rootUid: "door",
      },
      formSteps: [
        {
          stepId: 10,
          prodUid: "door-a",
          customWorkflowField: "kept",
        },
      ],
      shelfItems: [
        {
          productId: 20,
          customShelfField: "kept",
        },
      ],
      housePackageTool: {
        totalDoors: 1,
        customPackageField: "kept",
        doors: [
          {
            dimension: "30 x 80",
            customDoorField: "kept",
          },
        ],
      },
      customLineField: "kept",
    }) as any;

    expect(result.customLineField).toBe("kept");
    expect(result.formSteps?.[0]?.customWorkflowField).toBe("kept");
    expect(result.shelfItems?.[0]?.customShelfField).toBe("kept");
    expect(result.housePackageTool?.customPackageField).toBe("kept");
    expect(result.housePackageTool?.doors?.[0]?.customDoorField).toBe("kept");
  });

  it("keeps persisted sales form saves stricter than portable draft lines", () => {
    expect(() =>
      salesFormLineItemSchema.parse({
        uid: "line-1",
        qty: 1,
        unitPrice: 100,
        lineTotal: 100,
      }),
    ).toThrow();
  });
});
