import type {
  ControlProjection,
  SalesControlField,
  SalesControlStatistic,
} from "../domain/types";

export const SALES_LIST_MINIMAL_FIELDS: SalesControlField[] = [
  "productionStatus",
  "dispatchStatus",
  "packables",
  "pendingDispatch",
];

export function projectSalesListControl(
  statistic: SalesControlStatistic,
  fields: SalesControlField[],
): ControlProjection<SalesControlField> {
  const projection: ControlProjection<SalesControlField> = {
    selectedFields: fields,
  };

  for (const field of fields) {
    switch (field) {
      case "productionStatus":
        projection.productionStatus = statistic.productionStatus;
        break;
      case "dispatchStatus":
        projection.dispatchStatus = statistic.dispatchStatus;
        break;
      case "packables":
        projection.packables = statistic.packables;
        break;
      case "pendingDispatch":
        projection.pendingDispatch = statistic.pendingDispatch;
        break;
      case "pendingPacking":
        projection.pendingPacking = statistic.pendingPacking;
        break;
      case "packed":
        projection.packed = statistic.packed;
        break;
      case "prodAssigned":
        projection.prodAssigned = statistic.prodAssigned;
        break;
      case "prodCompleted":
        projection.prodCompleted = statistic.prodCompleted;
        break;
    }
  }

  return projection;
}

