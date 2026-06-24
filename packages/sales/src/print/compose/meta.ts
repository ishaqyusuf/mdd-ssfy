import type { PageMeta, PrintMode } from "../types";
import type { PrintSalesData } from "../query";
import { formatDate } from "@gnd/utils/dayjs";
import { formatCurrency } from "@gnd/utils";
import { calculatePaymentChannelCharge } from "../../payment-system/domain/payment-channel-charge";

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
  const totalCharge = calculatePaymentChannelCharge({
    paymentMethod:
      typeof meta?.payment_option === "string" ? meta.payment_option : null,
    paymentAmount: sale.grandTotal,
    cccPercentage: meta?.ccc_percentage,
  });
  const balanceCharge = calculatePaymentChannelCharge({
    paymentMethod:
      typeof meta?.payment_option === "string" ? meta.payment_option : null,
    paymentAmount: sale.amountDue,
    cccPercentage: meta?.ccc_percentage,
  });

  return {
    title: modeTitles[mode],
    salesNo,
    date: formatDate(sale.createdAt),
    rep: sale.salesRep?.name ?? undefined,
    po: meta?.po ?? undefined,
    status,
    balanceDue:
      !hideBalanceDue && !isPaid
        ? `$${formatCurrency(balanceCharge.chargeAmount)}`
        : undefined,
    dueDate: hideBalanceDue ? undefined : dueDate,
    total: `$${formatCurrency(totalCharge.chargeAmount)}`,
    paymentDate,
    goodUntil:
      isQuote && sale.goodUntil ? formatDate(sale.goodUntil) : undefined,
  };
}
