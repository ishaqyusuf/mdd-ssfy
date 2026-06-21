import type { SalesDocumentListItem } from "./sales-document-list";

export type RecentDashboardSale = {
  id?: string | number | null;
  orderId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  total?: number | null;
  due?: number | null;
  paid?: number | null;
  createdAt?: string | null;
  deliveryOption?: string | null;
};

export function toRecentSalesDocumentItem(
  sale: RecentDashboardSale,
): SalesDocumentListItem {
  const total = Number(sale.total || 0);
  const due = Number(sale.due || 0);
  const paid = Number(sale.paid ?? total - due);

  return {
    id: sale.id,
    orderId: sale.orderId,
    displayName: sale.customerName,
    customerPhone: sale.customerPhone,
    deliveryOption: sale.deliveryOption,
    salesDate: formatRecentSaleDate(sale.createdAt),
    invoice: {
      total,
      paid,
      pending: due,
    },
  };
}

export function formatRecentSaleDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
