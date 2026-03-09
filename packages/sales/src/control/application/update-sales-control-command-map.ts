import type { UpdateSalesControl } from "../../schema";

export type LegacyUpdateSalesControlAction =
  | "submitAll"
  | "packItems"
  | "clearPackings"
  | "cancelDispatch"
  | "startDispatch"
  | "submitDispatch"
  | "createAssignments"
  | "deleteSubmissions"
  | "deleteAssignments"
  | "markAsCompleted";

export type ControlMutationCommand =
  | "applySubmissionBatch"
  | "applyPack"
  | "applyUnpackBulk"
  | "applyDispatchStatusTransition"
  | "applyAssignmentDelta"
  | "applySubmissionDelta";

export type ControlRepairCommand = "rebuildFromSource";

export type LegacyActionMapping = {
  action: LegacyUpdateSalesControlAction;
  commandPlan: ControlMutationCommand[];
};

export const UPDATE_SALES_CONTROL_COMMAND_MAP: Record<
  LegacyUpdateSalesControlAction,
  ControlMutationCommand[]
> = {
  submitAll: ["applySubmissionBatch"],
  packItems: ["applyPack"],
  clearPackings: ["applyUnpackBulk"],
  cancelDispatch: ["applyDispatchStatusTransition"],
  startDispatch: ["applyDispatchStatusTransition"],
  submitDispatch: ["applyDispatchStatusTransition"],
  createAssignments: ["applyAssignmentDelta"],
  deleteSubmissions: ["applySubmissionDelta"],
  deleteAssignments: ["applyAssignmentDelta"],
  markAsCompleted: [
    "applySubmissionBatch",
    "applyPack",
    "applyDispatchStatusTransition",
  ],
};

const ORDERED_ACTION_KEYS: LegacyUpdateSalesControlAction[] = [
  "submitAll",
  "packItems",
  "clearPackings",
  "cancelDispatch",
  "startDispatch",
  "submitDispatch",
  "createAssignments",
  "deleteSubmissions",
  "deleteAssignments",
  "markAsCompleted",
];

export function resolveLegacyUpdateSalesControlAction(
  input: UpdateSalesControl,
): LegacyActionMapping | null {
  for (const action of ORDERED_ACTION_KEYS) {
    if (!input[action]) continue;
    return {
      action,
      commandPlan: UPDATE_SALES_CONTROL_COMMAND_MAP[action],
    };
  }
  return null;
}

export const RESET_SALES_CONTROL_COMMAND: ControlRepairCommand =
  "rebuildFromSource";

export function resolveResetSalesControlCommand(): ControlRepairCommand {
  return RESET_SALES_CONTROL_COMMAND;
}
