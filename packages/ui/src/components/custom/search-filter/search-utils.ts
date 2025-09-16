import { IconKeys } from "../icons";

export const searchIcons: Partial<{
  [id in string]: IconKeys;
}> = {
  orderNo: "orders",
  salesNo: "orders",
  "customer.name": "user",
  phone: "phone",
  search: "Search",
  "production.assignedToId": "production",
  "production.assignment": "production",
  "production.status": "production",
  production: "production",
  "production.dueDate": "calendar",
  po: "inbound",
  "sales.rep": "user",
  invoice: "communityInvoice",
  "salesRep.id": "user",
  "dispatch.status": "Export",
  status: "Status",
  dateRange: "calendar",
};

export function isSearchKey(k) {
  return k == "q" || k == "search" || k?.startsWith("_q");
}
export function getSearchKey(filters) {
  return Object.entries(filters || {}).find(([k, v]) => isSearchKey(k))?.[0];
}
