import { describe, expect, it } from "bun:test";
import {
  formatWorkflowComponentLabel,
  getWorkflowSelectableSku,
  getWorkflowSelectableTitle,
} from "./workflow-selectable-copy";

describe("workflow selectable copy", () => {
  it("uses the component title instead of uid-like text for display sku", () => {
    expect(
      getWorkflowSelectableSku({
        uid: "workflow-door-package",
        title: "Door package",
      } as any),
    ).toBe("Door package");
  });

  it("falls back to neutral copy instead of uid when title is missing", () => {
    expect(
      getWorkflowSelectableTitle({
        uid: "workflow-door-package",
      } as any),
    ).toBe("Component");
    expect(
      getWorkflowSelectableSku({
        uid: "workflow-door-package",
      } as any),
    ).toBe("Workflow component");
  });

  it("ignores uid-like value copy when title is missing", () => {
    expect(
      getWorkflowSelectableTitle({
        uid: "workflow-door-package",
        value: "workflow-door-package",
      } as any),
    ).toBe("Component");
    expect(
      getWorkflowSelectableSku({
        uid: "workflow-door-package",
        value: "door-package-uid",
      } as any),
    ).toBe("Workflow component");
  });

  it("uses a human value when the title is uid-like", () => {
    expect(
      getWorkflowSelectableTitle({
        uid: "workflow-door-package",
        title: "workflow-door-package",
        value: "Door package",
      } as any),
    ).toBe("Door package");
  });

  it("formats selected workflow labels without importing the web/core label helper", () => {
    expect(formatWorkflowComponentLabel("Door package")).toBe("DOOR PACKAGE");
  });
});
