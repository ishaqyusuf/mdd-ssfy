import { describe, expect, it } from "bun:test";
import {
  filterWorkflowComponentsBySearch,
  getWorkflowProceedFallbackSelectedCount,
  isWorkflowMouldingStepTitle,
  limitWorkflowComponents,
  shouldShowWorkflowComponentSearch,
  shouldTreatWorkflowStepAsMouldingSelection,
  shouldUseWorkflowGroupedRowEditorStep,
} from "./workflow-step-rendering";

describe("workflow step rendering", () => {
  it("keeps the root Item Type step on the component grid", () => {
    expect(
      shouldUseWorkflowGroupedRowEditorStep({
        activeRootStep: true,
        activeStepFamily: "moulding-line-item",
        activeMouldingStep: false,
      }),
    ).toBe(false);
  });

  it("uses grouped row editors only for non-root grouped families", () => {
    expect(
      shouldUseWorkflowGroupedRowEditorStep({
        activeRootStep: false,
        activeStepFamily: "shelf",
        activeMouldingStep: false,
      }),
    ).toBe(true);
    expect(
      shouldUseWorkflowGroupedRowEditorStep({
        activeRootStep: false,
        activeStepFamily: "service-line-item",
        activeMouldingStep: false,
      }),
    ).toBe(true);
    expect(
      shouldUseWorkflowGroupedRowEditorStep({
        activeRootStep: false,
        activeStepFamily: "moulding-line-item",
        activeMouldingStep: true,
      }),
    ).toBe(false);
  });

  it("falls back to saved Door and Moulding rows for Proceed visibility", () => {
    expect(
      getWorkflowProceedFallbackSelectedCount({
        visibleSelectedCount: 0,
        stepSelectedComponentCount: 0,
        doorStep: true,
        doorRowCount: 1,
        mouldingStep: false,
        mouldingSelectionCount: 0,
        mouldingRowCount: 0,
      }),
    ).toBe(1);
    expect(
      getWorkflowProceedFallbackSelectedCount({
        visibleSelectedCount: 0,
        stepSelectedComponentCount: 0,
        doorStep: false,
        doorRowCount: 0,
        mouldingStep: true,
        mouldingSelectionCount: 0,
        mouldingRowCount: 2,
      }),
    ).toBe(2);
  });

  it("counts selected Moulding snapshots even before rows are derived", () => {
    expect(
      getWorkflowProceedFallbackSelectedCount({
        visibleSelectedCount: 0,
        stepSelectedComponentCount: 2,
        doorStep: false,
        doorRowCount: 0,
        mouldingStep: true,
        mouldingSelectionCount: 2,
        mouldingRowCount: 0,
      }),
    ).toBe(2);
  });

  it("counts pending multi-select card taps before line metadata rehydrates", () => {
    expect(
      getWorkflowProceedFallbackSelectedCount({
        visibleSelectedCount: 0,
        stepSelectedComponentCount: 0,
        doorStep: true,
        doorRowCount: 0,
        mouldingStep: false,
        mouldingSelectionCount: 0,
        mouldingRowCount: 0,
        pendingMultiSelectCount: 1,
      }),
    ).toBe(1);
  });

  it("recognizes Moulding title variants as Moulding steps", () => {
    expect(isWorkflowMouldingStepTitle("Moulding")).toBe(true);
    expect(isWorkflowMouldingStepTitle("Mouldings")).toBe(true);
    expect(isWorkflowMouldingStepTitle("Molding")).toBe(true);
    expect(isWorkflowMouldingStepTitle("Line Item")).toBe(false);
  });

  it("treats moulding category steps as moulding selection steps", () => {
    expect(
      shouldTreatWorkflowStepAsMouldingSelection({
        activeRootStep: false,
        activeStepTitle: "FLAT BOARD (...WOOD PRIMED)",
        mouldingItem: true,
      }),
    ).toBe(true);
    expect(
      shouldTreatWorkflowStepAsMouldingSelection({
        activeRootStep: false,
        activeStepTitle: "Line Item",
        mouldingItem: true,
      }),
    ).toBe(false);
    expect(
      shouldTreatWorkflowStepAsMouldingSelection({
        activeRootStep: true,
        activeStepTitle: "Item Type",
        mouldingItem: true,
      }),
    ).toBe(false);
  });

  it("shows component search only when the step has more than fifteen results", () => {
    expect(shouldShowWorkflowComponentSearch(15)).toBe(false);
    expect(shouldShowWorkflowComponentSearch(16)).toBe(true);
  });

  it("caps visible workflow component results to the configured limit", () => {
    const components = Array.from({ length: 20 }, (_, index) => ({
      uid: `component-${index}`,
    }));

    expect(limitWorkflowComponents(components)).toHaveLength(15);
    expect(limitWorkflowComponents(components.slice(0, 10))).toHaveLength(10);
  });

  it("filters component search values case-insensitively", () => {
    const components = [
      { uid: "door-a", title: "Oak Door", value: "Interior" },
      { uid: "moulding-b", title: "Flat Casing", value: "Primed" },
      { uid: "shelf-c", title: "Shelf Board", value: "Garage" },
    ];

    expect(
      filterWorkflowComponentsBySearch(components, "flat", (component) => [
        component.title,
        component.value,
        component.uid,
      ]),
    ).toEqual([components[1]]);
    expect(
      filterWorkflowComponentsBySearch(components, "SHELF-C", (component) => [
        component.title,
        component.value,
        component.uid,
      ]),
    ).toEqual([components[2]]);
    expect(
      filterWorkflowComponentsBySearch(components, "", (component) => [
        component.title,
      ]),
    ).toEqual(components);
  });
});
