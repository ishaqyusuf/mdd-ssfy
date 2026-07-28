import { describe, expect, it } from "bun:test";
import { getWorkflowStepPillLabels } from "./workflow-step-pill-labels";

describe("workflow step pill labels", () => {
  it("uses selected component labels from JSON metadata even without step value", () => {
    expect(
      getWorkflowStepPillLabels(
        {
          step: { title: "Door" },
          meta: JSON.stringify({
            selectedComponents: [
              {
                uid: "workflow-door-package",
                title: "workflow-door-package",
                value: "Modern door",
              },
            ],
          }),
        } as any,
        0,
      ),
    ).toEqual({
      stepLabel: "MODERN DOOR",
      pillLabel: "MODERN DOOR",
      selected: true,
    });
  });

  it("falls back to the step title for unselected steps", () => {
    expect(
      getWorkflowStepPillLabels(
        {
          step: { title: "Height" },
          meta: {},
        } as any,
        1,
      ),
    ).toEqual({
      stepLabel: "Height",
      pillLabel: "Height",
      selected: false,
    });
  });
});
