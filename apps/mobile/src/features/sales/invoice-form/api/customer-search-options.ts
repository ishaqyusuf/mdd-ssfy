import type { NewSalesFormType } from "../types";

export function buildCustomerSearchInput(input: {
  query?: string | null;
  type?: NewSalesFormType | null;
}) {
  const query = String(input.query || "").trim();
  return {
    query,
    recent: !query,
    type: input.type || "order",
    limit: 10,
  };
}
