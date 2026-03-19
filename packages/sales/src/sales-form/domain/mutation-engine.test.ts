import { describe, expect, it } from "bun:test";
import {
  applyMultiSelectStepMutation,
  applySingleSelectStepMutation,
  compactStepValue,
  getSelectedProdUids,
} from "./mutation-engine";

describe("mutation-engine domain", () => {
  it("extracts selected prod uids from metadata", () => {
    const uids = getSelectedProdUids({
      meta: { selectedProdUids: ["a", "b", "a"] },
    });
    expect(uids).toEqual(["a", "b"]);
  });

  it("builds compact step labels", () => {
    expect(compactStepValue([{ title: "Door A" }, { title: "Door B" }])).toBe(
      "Door A +1",
    );
  });

  it("applies single select mutation", () => {
    const steps = [
      {
        stepId: 1,
        step: { title: "Item Type" },
        componentId: null,
        prodUid: "",
        meta: {},
      },
    ];
    const next = applySingleSelectStepMutation({
      steps,
      currentStepIndex: 0,
      component: {
        id: 10,
        uid: "rootA",
        title: "Door",
        salesPrice: 100,
        redirectUid: "step-b",
        sectionOverride: { overrideMode: true, noHandle: true },
      },
      activeStepTitle: "Item Type",
    });
    expect(next[0].componentId).toBe(10);
    expect(next[0].prodUid).toBe("rootA");
    expect(next[0].value).toBe("Door");
    expect(next[0].meta.redirectUid).toBe("step-b");
    expect(next[0].meta.sectionOverride).toEqual({
      overrideMode: true,
      noHandle: true,
    });
  });

  it("applies multi select mutation and stores selected components", () => {
    const steps = [
      {
        stepId: 2,
        step: { title: "Door" },
        componentId: null,
        prodUid: "",
        meta: {},
      },
    ];
    const result = applyMultiSelectStepMutation({
      steps,
      currentStepIndex: 0,
      component: { uid: "d1" },
      visibleComponents: [
        {
          id: 1,
          uid: "d1",
          title: "Door A",
          salesPrice: 10,
          basePrice: 8,
          pricing: {
            "2-0 x 7-0": { price: 120 },
          },
          redirectUid: "next-step",
          sectionOverride: { overrideMode: true, noHandle: true },
        },
      ],
      selectedOverride: true,
      activeStepTitle: "Door",
    });
    expect(result.hasSelection).toBe(true);
    expect(result.steps[0].meta.selectedProdUids).toEqual(["d1"]);
    expect(result.steps[0].value).toBe("Door A");
    expect(result.steps[0].meta.redirectUid).toBe("next-step");
    expect(result.steps[0].meta.sectionOverride).toEqual({
      overrideMode: true,
      noHandle: true,
    });
    expect(result.steps[0].meta.selectedComponents[0].pricing).toEqual({
      "2-0 x 7-0": { price: 120 },
    });
    expect(result.steps[0].meta.selectedComponents[0].redirectUid).toBe(
      "next-step",
    );
    expect(result.steps[0].meta.selectedComponents[0].sectionOverride).toEqual({
      overrideMode: true,
      noHandle: true,
    });
  });
});
