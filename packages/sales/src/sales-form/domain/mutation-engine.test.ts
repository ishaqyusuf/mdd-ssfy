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
      },
    ];
    const next = applySingleSelectStepMutation({
      steps,
      currentStepIndex: 0,
      component: { id: 10, uid: "rootA", title: "Door", salesPrice: 100 },
      activeStepTitle: "Item Type",
    });
    expect(next[0].componentId).toBe(10);
    expect(next[0].prodUid).toBe("rootA");
    expect(next[0].value).toBe("Door");
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
        { id: 1, uid: "d1", title: "Door A", salesPrice: 10, basePrice: 8 },
      ],
      selectedOverride: true,
      activeStepTitle: "Door",
    });
    expect(result.hasSelection).toBe(true);
    expect(result.steps[0].meta.selectedProdUids).toEqual(["d1"]);
    expect(result.steps[0].value).toBe("Door A");
  });
});
