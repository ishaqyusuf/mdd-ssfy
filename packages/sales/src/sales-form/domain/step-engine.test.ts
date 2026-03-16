import { describe, expect, it } from "bun:test";
import {
  buildSelectedByStepUid,
  buildSelectedProdUidsByStepUid,
  customNextStepTitle,
  getRedirectableRoutes,
  isComponentVisibleByRules,
  resolveComponentPriceByDeps,
} from "./step-engine";

describe("step-engine domain", () => {
  it("resolves custom next step title for moulding flow", () => {
    expect(customNextStepTitle("Moulding", "Item Type", "Moulding")).toBe(
      "Specie",
    );
  });

  it("applies visibility rules against selected components", () => {
    const visible = isComponentVisibleByRules(
      {
        variations: [
          {
            rules: [
              {
                stepUid: "root",
                operator: "is",
                componentsUid: ["abc"],
              },
            ],
          },
        ],
      },
      { root: "abc" },
    );
    const hidden = isComponentVisibleByRules(
      {
        variations: [
          {
            rules: [
              {
                stepUid: "root",
                operator: "is",
                componentsUid: ["abc"],
              },
            ],
          },
        ],
      },
      { root: "xyz" },
    );
    expect(visible).toBe(true);
    expect(hidden).toBe(false);
  });

  it("maps selected UID from multi-select metadata when prodUid is absent", () => {
    const selected = buildSelectedByStepUid([
      {
        step: { uid: "door-step" },
        prodUid: "",
        meta: {
          selectedProdUids: ["door-a", "door-b"],
        },
      },
    ]);
    expect(selected["door-step"]).toBe("door-a");
  });

  it("builds full selected UID stacks by step for multi-select steps", () => {
    const selected = buildSelectedProdUidsByStepUid([
      {
        step: { uid: "door-step" },
        meta: {
          selectedProdUids: ["door-a", "door-b"],
        },
      },
    ]);
    expect(selected["door-step"]).toEqual(["door-a", "door-b"]);
  });

  it("lists redirect routes in configured step order and keeps the current step available", () => {
    const routes = getRedirectableRoutes({
      stepsById: {
        10: "item-type",
        20: "door",
        30: "house-package-tool",
      },
      stepsByUid: {
        "item-type": { uid: "item-type", title: "Item Type" },
        door: { uid: "door", title: "Door" },
        "house-package-tool": {
          uid: "house-package-tool",
          title: "House Package Tool",
        },
      },
    });
    expect(routes).toEqual([
      { uid: "item-type", title: "Item Type" },
      { uid: "door", title: "Door" },
      { uid: "house-package-tool", title: "House Package Tool" },
    ]);
  });

  it("resolves price by dependency key", () => {
    const resolved = resolveComponentPriceByDeps(
      {
        uid: "door-comp",
        priceStepDeps: ["supplier", "size"],
        pricing: {
          "sup-a-2-8 x 7-0": { price: 250 },
        },
      },
      {
        supplier: "sup-a",
        size: "2-8 x 7-0",
      },
    );
    expect(resolved.salesPrice).toBe(250);
    expect(resolved.basePrice).toBe(250);
  });

  it("uses explicit step-level dependency keys when provided", () => {
    const resolved = resolveComponentPriceByDeps(
      {
        uid: "door-comp",
        pricing: {
          "sup-a-2-8 x 7-0": { price: 260 },
        },
      },
      {
        supplier: "sup-a",
        size: "2-8 x 7-0",
      },
      {
        priceStepDeps: ["supplier", "size"],
      },
    );
    expect(resolved.salesPrice).toBe(260);
    expect(resolved.basePrice).toBe(260);
  });

  it("prefers dependency pricing over direct component fields when deps apply", () => {
    const resolved = resolveComponentPriceByDeps(
      {
        uid: "door-comp",
        salesPrice: 999,
        basePrice: 777,
        pricing: {
          "sup-a-2-8 x 7-0": { price: 260 },
        },
      },
      {
        supplier: "sup-a",
        size: "2-8 x 7-0",
      },
      {
        priceStepDeps: ["supplier", "size"],
      },
    );
    expect(resolved.salesPrice).toBe(260);
    expect(resolved.basePrice).toBe(260);
  });

  it("supports pricing buckets with separate sales/base fields", () => {
    const resolved = resolveComponentPriceByDeps(
      {
        uid: "door-comp",
        priceStepDeps: ["supplier"],
        pricing: {
          "sup-a": { salesPrice: 320, basePrice: 210 },
        },
      },
      {
        supplier: "sup-a",
      },
    );
    expect(resolved.salesPrice).toBe(320);
    expect(resolved.basePrice).toBe(210);
  });

  it("resolves dependency bucket when pricing key order differs", () => {
    const resolved = resolveComponentPriceByDeps(
      {
        uid: "door-comp",
        priceStepDeps: ["supplier", "size"],
        pricing: {
          "2-8 x 7-0-sup-a": { price: 275 },
        },
      },
      {
        supplier: "sup-a",
        size: "2-8 x 7-0",
      },
    );
    expect(resolved.salesPrice).toBe(275);
    expect(resolved.basePrice).toBe(275);
  });

  it("falls back to best-matching pricing key when exact key is absent", () => {
    const resolved = resolveComponentPriceByDeps(
      {
        uid: "door-comp",
        priceStepDeps: ["supplier", "size"],
        pricing: {
          "sup-a-2-8 x 7-0-special": { price: 290 },
          "sup-a-other": { price: 150 },
        },
      },
      {
        supplier: "sup-a",
        size: "2-8 x 7-0",
      },
    );
    expect(resolved.salesPrice).toBe(290);
    expect(resolved.basePrice).toBe(290);
  });

  it("evaluates visibility rules against all selected UIDs for a step", () => {
    const visible = isComponentVisibleByRules(
      {
        variations: [
          {
            rules: [
              {
                stepUid: "moulding-step",
                operator: "is",
                componentsUid: ["moulding-b"],
              },
            ],
          },
        ],
      },
      { "moulding-step": "moulding-a" },
      { "moulding-step": ["moulding-a", "moulding-b"] },
    );
    expect(visible).toBe(true);
  });

  it("enforces isNot visibility rules against multi-select stacks", () => {
    const hidden = isComponentVisibleByRules(
      {
        variations: [
          {
            rules: [
              {
                stepUid: "moulding-step",
                operator: "isNot",
                componentsUid: ["moulding-b"],
              },
            ],
          },
        ],
      },
      { "moulding-step": "moulding-a" },
      { "moulding-step": ["moulding-a", "moulding-b"] },
    );
    const visible = isComponentVisibleByRules(
      {
        variations: [
          {
            rules: [
              {
                stepUid: "moulding-step",
                operator: "isNot",
                componentsUid: ["moulding-c"],
              },
            ],
          },
        ],
      },
      { "moulding-step": "moulding-a" },
      { "moulding-step": ["moulding-a", "moulding-b"] },
    );
    expect(hidden).toBe(false);
    expect(visible).toBe(true);
  });

  it("resolves dependency pricing from multi-select UID combinations", () => {
    const resolved = resolveComponentPriceByDeps(
      {
        uid: "weatherstrip-comp",
        pricing: {
          "door-b-color-red": { price: 88 },
        },
      },
      {
        door: "door-a",
        color: "color-red",
      },
      {
        priceStepDeps: ["door", "color"],
        selectedProdUidsByStepUid: {
          door: ["door-a", "door-b"],
          color: ["color-red"],
        },
      },
    );
    expect(resolved.salesPrice).toBe(88);
    expect(resolved.basePrice).toBe(88);
  });
});
