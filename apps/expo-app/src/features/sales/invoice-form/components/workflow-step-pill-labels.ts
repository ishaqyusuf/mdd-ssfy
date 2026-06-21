import {
  hasWorkflowStepSelection,
  workflowStepSelectionLabel,
  type WorkflowStepRecord,
} from "@gnd/sales/sales-form-core";
import { formatWorkflowComponentLabel } from "../api/workflow-selectable-copy";

const STEP_PILL_COMPONENT_LABEL_MAX_LENGTH = 24;

export function getWorkflowStepPillLabels(
  step: WorkflowStepRecord,
  index: number,
) {
  const selected = hasWorkflowStepSelection(step);
  const stepLabel = selected
    ? formatWorkflowComponentLabel(workflowStepSelectionLabel(step))
    : step.step?.title || step.title || `Step ${index + 1}`;
  const pillLabel = selected
    ? middleTruncateText(stepLabel, STEP_PILL_COMPONENT_LABEL_MAX_LENGTH)
    : stepLabel;

  return { stepLabel, pillLabel, selected };
}

function middleTruncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const visible = Math.max(4, maxLength - 1);
  const start = Math.ceil(visible / 2);
  const end = Math.floor(visible / 2);
  return `${value.slice(0, start)}...${value.slice(value.length - end)}`;
}
