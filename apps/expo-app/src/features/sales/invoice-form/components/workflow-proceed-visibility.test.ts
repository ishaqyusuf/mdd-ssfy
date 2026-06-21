import { describe, expect, it } from "bun:test";
import {
  getWorkflowProceedSelectedCount,
  isWorkflowBulkSelectableStep,
  shouldShowWorkflowProceedAction,
} from "./workflow-proceed-visibility";

describe("workflow proceed visibility", () => {
  it("shows proceed for selected Door multi-select steps", () => {
    expect(
      shouldShowWorkflowProceedAction({
        componentPickerStep: true,
        pickerMultiSelectStep: true,
        doorStep: true,
        selectedCount: 1,
      }),
    ).toBe(true);
    expect(
      isWorkflowBulkSelectableStep({
        pickerMultiSelectStep: true,
        doorStep: true,
        mouldingStep: false,
      }),
    ).toBe(false);
  });

  it("shows proceed for selected Moulding multi-select steps", () => {
    expect(
      shouldShowWorkflowProceedAction({
        componentPickerStep: true,
        pickerMultiSelectStep: true,
        mouldingStep: true,
        selectedCount: 2,
      }),
    ).toBe(true);
    expect(
      isWorkflowBulkSelectableStep({
        pickerMultiSelectStep: true,
        doorStep: false,
        mouldingStep: true,
      }),
    ).toBe(false);
  });

  it("hides proceed until at least one item is selected", () => {
    expect(
      shouldShowWorkflowProceedAction({
        componentPickerStep: true,
        pickerMultiSelectStep: true,
        doorStep: true,
        selectedCount: 0,
      }),
    ).toBe(false);
  });

  it("uses selected row fallback while step metadata catches up", () => {
    const selectedCount = getWorkflowProceedSelectedCount({
      stepSelectedCount: 0,
      fallbackSelectedCount: 1,
    });

    expect(selectedCount).toBe(1);
    expect(
      shouldShowWorkflowProceedAction({
        componentPickerStep: true,
        pickerMultiSelectStep: false,
        mouldingStep: true,
        selectedCount,
      }),
    ).toBe(true);
  });

  it("keeps Door and Moulding proceed visible when the generic picker flag drops", () => {
    expect(
      shouldShowWorkflowProceedAction({
        componentPickerStep: true,
        pickerMultiSelectStep: false,
        doorStep: true,
        selectedCount: 2,
      }),
    ).toBe(true);
    expect(
      shouldShowWorkflowProceedAction({
        componentPickerStep: true,
        pickerMultiSelectStep: false,
        mouldingStep: true,
        selectedCount: 2,
      }),
    ).toBe(true);
  });

  it("hides proceed outside multi component picker steps", () => {
    expect(
      shouldShowWorkflowProceedAction({
        componentPickerStep: false,
        pickerMultiSelectStep: true,
        doorStep: true,
        mouldingStep: true,
        selectedCount: 3,
      }),
    ).toBe(false);
    expect(
      shouldShowWorkflowProceedAction({
        componentPickerStep: true,
        pickerMultiSelectStep: false,
        doorStep: false,
        mouldingStep: false,
        selectedCount: 3,
      }),
    ).toBe(false);
  });

  it("keeps generic multi-select steps bulk selectable", () => {
    expect(
      isWorkflowBulkSelectableStep({
        pickerMultiSelectStep: true,
        doorStep: false,
        mouldingStep: false,
      }),
    ).toBe(true);
  });
});
