export function shouldShowWorkflowProceedAction(input: {
  componentPickerStep: boolean;
  pickerMultiSelectStep: boolean;
  doorStep?: boolean;
  mouldingStep?: boolean;
  selectedCount: number;
}) {
  const selectedMultiStep =
    input.componentPickerStep &&
    (input.pickerMultiSelectStep || input.doorStep || input.mouldingStep);

  return selectedMultiStep && input.selectedCount > 0;
}

export function getWorkflowProceedSelectedCount(input: {
  stepSelectedCount?: number | null;
  fallbackSelectedCount?: number | null;
}) {
  return Math.max(
    0,
    Number(input.stepSelectedCount || 0),
    Number(input.fallbackSelectedCount || 0),
  );
}

export function isWorkflowBulkSelectableStep(input: {
  pickerMultiSelectStep: boolean;
  doorStep: boolean;
  mouldingStep: boolean;
}) {
  return (
    input.pickerMultiSelectStep && !input.doorStep && !input.mouldingStep
  );
}
