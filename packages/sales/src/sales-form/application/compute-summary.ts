import type {
  CalculateSalesFormSummaryInput,
  SalesFormSummaryResult,
} from "../contracts/types";
import { calculateSalesFormSummary } from "../domain/costing";

export function computeSalesFormSummary(
  input: CalculateSalesFormSummaryInput,
): SalesFormSummaryResult {
  return calculateSalesFormSummary(input);
}
