import type {
  ControlProjection,
  DispatchControlField,
  SalesControlStatistic,
} from "../domain/types";

export const DISPATCH_LIST_MINIMAL_FIELDS: DispatchControlField[] = [
  "dispatchStatus",
  "packed",
  "pendingPacking",
];

export function projectDispatchListControl(
  statistic: SalesControlStatistic,
  fields: DispatchControlField[],
): ControlProjection<DispatchControlField> {
  const projection: ControlProjection<DispatchControlField> = {
    selectedFields: fields,
  };

  for (const field of fields) {
    switch (field) {
      case "dispatchStatus":
        projection.dispatchStatus = statistic.dispatchStatus;
        break;
      case "packables":
        projection.packables = statistic.packables;
        break;
      case "pendingPacking":
        projection.pendingPacking = statistic.pendingPacking;
        break;
      case "packed":
        projection.packed = statistic.packed;
        break;
      case "dispatchAssigned":
        projection.dispatchAssigned = statistic.dispatchAssigned;
        break;
      case "dispatchInProgress":
        projection.dispatchInProgress = statistic.dispatchInProgress;
        break;
      case "dispatchCompleted":
        projection.dispatchCompleted = statistic.dispatchCompleted;
        break;
    }
  }

  return projection;
}

