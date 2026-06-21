import type { NewSalesFormType } from "../types";

export function normalizeRouteParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeSalesFormTypeParam(
  value?: string | string[],
): NewSalesFormType {
  return normalizeRouteParam(value) === "quote" ? "quote" : "order";
}
