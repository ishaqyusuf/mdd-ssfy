import { SalesListInclude } from "@api/utils/sales";
import type {
  AddressBookMeta,
  QtyControlType,
  SalesDispatchStatus,
  SalesMeta,
  SalesType,
} from "@api/type";
import {
  composeSalesStat,
  dispatchTitle,
  overallStatus,
  salesAddressLines,
  salesLinks,
} from "@api/utils/sales";
import type { Prisma } from "@gnd/db";
import { deriveOrderProductionGateState } from "@gnd/sales/production-gate";
import { getNameInitials, sum, toNumber } from "@gnd/utils";

import { timeAgo } from "@gnd/utils/dayjs";
import type { DeliveryOption } from "@gnd/utils/sales";
import {
	getSalesPriorityLabel,
	normalizeSalesPriority,
} from "@sales/priority";
import { getPrintPaymentFooterState } from "@gnd/sales/print/payment-footer-state";
export type Item = Prisma.SalesOrdersGetPayload<{
  include: typeof SalesListInclude;
}> & {
  payments?: Array<{
    amount: number | null;
    status: string | null;
    deletedAt: Date | null;
    createdAt: Date | null;
    meta?: unknown;
    transaction?: { meta?: unknown; paymentMethod?: string | null } | null;
    squarePayments?: { meta?: unknown; paymentMethod?: string | null } | null;
  }>;
};
export function salesOrderDto(data: Item, bin?: boolean) {
  const deliveryOption: DeliveryOption =
    (data?.deliveryOption as any) || "pickup";
  const deliveriesWithItems =
    data?.deliveries?.filter((delivery) => !!delivery?._count?.items) || [];
  const prioritizedDelivery =
    deliveriesWithItems.find((delivery) => delivery.status === "completed") ||
    deliveriesWithItems[0];
  let deliveryStatus = prioritizedDelivery?.status as
    | SalesDispatchStatus
    | undefined;
  const d = data?.stat?.find(
    (d) => d.type == ("dispatchCompleted" as QtyControlType),
  );
  const status = overallStatus(data.stat);
  if (d?.percentage == 100 || deliveryStatus == "completed") {
    deliveryStatus = "completed";
    status.production.scoreStatus = null!;
    status.production.status = "completed";
  } else {
    deliveryStatus = status.delivery?.status as any;
  }

  // if (data.orderId == "04780AD") {

  // }
  let due = toNumber(data.amountDue);
  if (due <= 0) due = 0;
  const customer = data.customer;
  return {
    ...commonListData(data, bin),
    deliveryOption,
    deliveryStatus,
    dispatchList: data.deliveries?.map((d) => {
      return {
        title: dispatchTitle(d.id),
        id: d.id,
      };
    }),
    due,
    stats: statToKeyValueDto(data.stat),
    status,
    addressData: {
      shipping: getAddressDto(
        data.shippingAddress || data.billingAddress,
        customer,
        "Shipping Address",
      ),
      billing: getAddressDto(data.billingAddress, customer, "Billing Address"),
    },
    statList: data.stat,
  };
}
export function salesQuoteDto(data: Item, bin?: boolean) {
  return {
    ...commonListData(data, bin),
  };
}
function resolveSalesPaymentMethod(meta: unknown) {
  const record =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as SalesMeta & Record<string, unknown>)
      : null;
  const newSalesForm =
    record?.newSalesForm &&
    typeof record.newSalesForm === "object" &&
    !Array.isArray(record.newSalesForm)
      ? (record.newSalesForm as Record<string, unknown>)
      : null;
  const form =
    newSalesForm?.form &&
    typeof newSalesForm.form === "object" &&
    !Array.isArray(newSalesForm.form)
      ? (newSalesForm.form as Record<string, unknown>)
      : null;
  const paymentMethod = form?.paymentMethod;
  const legacyPaymentMethod = record?.payment_option || record?.paymentOption;

  if (typeof paymentMethod === "string") return paymentMethod;
  return typeof legacyPaymentMethod === "string" ? legacyPaymentMethod : null;
}
function getAddressDto(
  data: Item["shippingAddress"],
  customer: Item["customer"],
  title,
) {
  if (!data) return { title, address: "No address set" };
  const meta: AddressBookMeta = data?.meta as any;
  return {
    id: data.id,
    title,
    name: data.name || customer?.businessName || customer?.name,
    phone: data.phoneNo || customer?.phoneNo,
    email: data.email || customer?.email,
    address: [data.address1 || customer?.address, meta?.zip_code]
      ?.filter(Boolean)
      .join(" "),
    lines: salesAddressLines(data as any, customer as any),
  };
}

function commonListData(data: Item, bin?: boolean) {
  const meta = (data.meta || {}) as any as SalesMeta;
  const gateState = deriveOrderProductionGateState({
    gate: data.productionGate,
    order: data,
  });
  const costLines: {
    label: string | null | undefined;
    amount: number | null | undefined;
  }[] = [];
  const _cost = (label, amount) => costLines.push({ label, amount });
  const paid = sum([data.grandTotal! - data.amountDue!]);
  const creditCardFee = toNumber(meta?.ccc);
  const creditCardFeePercentage = toNumber(meta?.ccc_percentage);
  const paymentMethod = resolveSalesPaymentMethod(meta);
  const paymentState = Array.isArray(data.payments)
    ? getPrintPaymentFooterState(data as any)
    : null;
  _cost("Sub total", data.subTotal);
  data.extraCosts.map((e) => {
    _cost(e.label, e.totalAmount || e.amount);
  });
  data.taxes.map((t) => _cost(t.taxConfig?.title, t.tax));
  if (paymentState?.kind === "unpaid-card-estimate") {
    const charge = paymentState.estimatedDueCharge;
    _cost("Order Due Amount", paymentState.amountDue);
    if (charge?.cccAmount) _cost("C.C.C", charge.cccAmount);
    _cost(
      "Total Due With C.C.C",
      charge?.customerChargedAmount ?? paymentState.amountDue,
    );
  } else if (paymentState?.kind === "paid-single-full-card") {
    const charge = paymentState.recordedCardCharges[0];
    if (charge?.cccAmount) _cost("C.C.C", charge.cccAmount);
    _cost(
      charge?.customerChargedAmount ? "Charged to Card" : "Paid",
      charge?.customerChargedAmount ?? paymentState.principalPaid,
    );
    _cost("Total Due", 0);
  } else if (paymentState?.kind === "paid-single-full-non-card") {
    _cost("Paid", paymentState.principalPaid);
    _cost("Total Due", 0);
  } else if (paymentState?.kind === "partial-or-mixed") {
    _cost("Order Total", paymentState.orderTotal);
    _cost("Paid Toward Order", paymentState.principalPaid);
    for (const charge of paymentState.recordedCardCharges) {
      _cost("Card Payment", charge.principalAmount);
      _cost("C.C.C on Card Payment", charge.cccAmount);
      _cost("Charged to Card", charge.customerChargedAmount);
    }
    _cost("Balance Due", paymentState.amountDue);
  } else if (creditCardFee > 0) {
    _cost(
      creditCardFeePercentage > 0
        ? `Credit Card Fee (${creditCardFeePercentage}%)`
        : "Credit Card Fee",
      creditCardFee,
    );
    _cost("Total Invoice", data.grandTotal);
    _cost("Paid", paid);
    _cost("Due Amount", data.amountDue);
  } else {
    _cost("Total Invoice", data.grandTotal);
    _cost("Paid", paid);
    _cost("Due Amount", data.amountDue);
  }

  const customerId = data?.customer?.id;
  let accountNo = data.customer?.phoneNo
    ? data.customer?.phoneNo
    : !customerId
      ? null
      : `cust-${customerId}`;
  const salesStat = composeSalesStat(data.stat);
  return {
    // noteCount: data.noteCount,
    netTerm: data.paymentTerm,
    accountNo,
    createdAt: data?.createdAt,
    dueDate: data.paymentDueDate,
    id: data.id,
    orderId: data.orderId?.toUpperCase(),
    inboundStatus: data.inventoryStatus,
    isDealerSale: Number(data.dealerAuthId || 0) > 0,
    uuid: data.orderId,
    isDyke: data.isDyke,
    slug: data.slug,
    salesStat,
    address:
      data.shippingAddress?.address1 ||
      data.shippingAddress?.address2 ||
      data.billingAddress?.address1 ||
      data.billingAddress?.address2,
    displayName:
      data.customer?.businessName ||
      data.customer?.name ||
      data?.shippingAddress?.name,
    email: data.customer?.email,
    customerId: data.customer?.id,
    isBusiness: data.customer?.businessName,
    salesRep: data.salesRep?.name,
    salesRepInitial: getNameInitials(data.salesRep?.name!),
    poNo: meta?.po,
    paymentMethod,
    priority: normalizeSalesPriority(data.priority),
    priorityLabel: getSalesPriorityLabel(data.priority),
    deliveryOption: data?.deliveryOption,
    // taxes: data.taxes,
    // costLines: data.extraCosts,
    costLines,
    customerPhone:
      data.billingAddress?.phoneNo ||
      data.customer?.phoneNo ||
      data.shippingAddress?.phoneNo,
    salesDate: timeAgo(data.createdAt),
    links: salesLinks(data),
    shippingId: data.shippingAddressId,
    type: data.type as SalesType,
    isQuote: (data.type as SalesType) == "quote",
    productionGate: data.productionGate,
    hasProductionDefinition: gateState.hasProductionDefinition,
    productionGateStatus: gateState.productionGateStatus,
    productionGateTriggered: gateState.productionGateTriggered,
    invoice: {
      total: data.grandTotal,
      paid,
      pending: data.amountDue,
    },
  };
}
export function statToKeyValueDto(
  dataStats: Prisma.SalesStatGetPayload<{}>[],
  reset = false,
) {
  // const dataStats = data.stat;
  const k: { [k in QtyControlType]: Prisma.SalesStatGetPayload<{}> } =
    {} as any;
  dataStats?.map(({ score, percentage, total, ...rest }) => {
    if (reset) {
      score = percentage = total = 0;
    }
    k[rest.type] = {
      ...rest,
      score,
      percentage,
      total,
    };
  });
  return k;
}
