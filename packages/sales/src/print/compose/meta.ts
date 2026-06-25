import type { PageMeta, PrintMode } from "../types";
import type { PrintSalesData } from "../query";
import { formatDate } from "@gnd/utils/dayjs";
import { formatCurrency } from "@gnd/utils";
import { getPrintPaymentFooterState } from "./payment-footer-state";

function calculatePaymentTerm(
  paymentTerm: string,
  createdAt: Date,
): string | null {
  const t = Number.parseInt(paymentTerm?.replace("Net", ""));
  if (!t) return null;
  const d = new Date(createdAt);
  d.setDate(d.getDate() + t);
  return d.toISOString();
}

const modeTitles: Record<PrintMode, string> = {
  invoice: "Invoice",
  quote: "Quote",
  production: "Production",
  "packing-slip": "Packing Slip",
  "order-packing": "Invoice",
};

export function composeMeta(sale: PrintSalesData, mode: PrintMode): PageMeta {
  const isQuote = mode === "quote";
  const hideBalanceDue = mode === "production" || mode === "packing-slip";
  const salesNo = sale.orderId
    ?.toUpperCase()
    .replace(/(\d+)([A-Za-z]+)/, "$1-$2");

  const isPaid = (sale.amountDue ?? 0) <= 0;
  const status: PageMeta["status"] = isPaid ? "paid" : "pending";

  let paymentDate: string | undefined;
  if (isPaid) {
    const pd = sale.payments?.[0]?.createdAt;
    if (pd) paymentDate = formatDate(pd);
  }

  let dueDate: string | undefined;
  if (!isPaid) {
    let { goodUntil, paymentTerm, createdAt } = sale;
    if (paymentTerm && paymentTerm !== "None" && createdAt) {
      const calc = calculatePaymentTerm(paymentTerm, createdAt);
      if (calc) goodUntil = new Date(calc);
    } else if (!goodUntil) {
      goodUntil = (sale as any).paymentDueDate ?? createdAt;
    }
    dueDate = goodUntil ? formatDate(goodUntil) : undefined;
  }

  const meta: any = sale.meta;
  const paymentState = getPrintPaymentFooterState(sale);
  if (isPaid && paymentState.latestPaymentDate) {
    paymentDate = formatDate(paymentState.latestPaymentDate);
  }
  const headerTotal =
    paymentState.kind === "unpaid-card-estimate"
      ? paymentState.estimatedDueCharge?.customerChargedAmount
      : paymentState.kind === "paid-single-full-card"
        ? paymentState.recordedCardCharges[0]?.customerChargedAmount
        : paymentState.orderTotal;
  const headerBalanceDue =
    paymentState.kind === "unpaid-card-estimate"
      ? paymentState.estimatedDueCharge?.customerChargedAmount
      : paymentState.amountDue;

  return {
    title: modeTitles[mode],
    salesNo,
    date: formatDate(sale.createdAt),
    rep: sale.salesRep?.name ?? undefined,
    po: meta?.po ?? undefined,
    status,
    balanceDue:
      !hideBalanceDue && !isPaid
        ? `$${formatCurrency(headerBalanceDue || 0)}`
        : undefined,
    dueDate: hideBalanceDue ? undefined : dueDate,
    total: `$${formatCurrency(headerTotal || 0)}`,
    paymentDate,
    goodUntil:
      isQuote && sale.goodUntil ? formatDate(sale.goodUntil) : undefined,
  };
}
