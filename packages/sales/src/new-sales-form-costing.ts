export {
  calculateSalesFormSummary as calculateNewSalesFormSummary,
  calculateSalesFormSummary,
} from "./sales-form/domain/costing";

export type {
  CalculateSalesFormSummaryInput as CalculateNewSalesFormSummaryInput,
  NewSalesFormCostingStrategy,
  SalesFormSummaryResult as NewSalesFormSummaryResult,
} from "./sales-form/contracts/types";
