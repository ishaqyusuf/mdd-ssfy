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
import { getNameInitials, toNumber } from "@gnd/utils";

import { timeAgo } from "@gnd/utils/dayjs";
export type Item = Prisma.SalesOrdersGetPayload<{
  include: typeof SalesListInclude;
}> &
  Partial<{}>;
export function salesOrderDto(data: Item) {
  const deliveryOption = data?.deliveryOption;
  let deliveryStatus = data?.deliveries?.[0]?.status as SalesDispatchStatus;
  const d = data?.stat?.find(
    (d) => d.type == ("dispatchCompleted" as QtyControlType)
  );
  if (d?.percentage == 100) deliveryStatus = "completed";
  // if (data.orderId == "04780AD") {

  // }
  let due = toNumber(data.amountDue);
  if (due <= 0) due = 0;
  const customer = data.customer;
  return {
    ...commonListData(data),
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
    status: overallStatus(data.stat),
    addressData: {
      shipping: getAddressDto(
        data.shippingAddress || data.billingAddress,
        customer,
        "Shipping Address"
      ),
      billing: getAddressDto(data.billingAddress, customer, "Billing Address"),
    },
    statList: data.stat,
  };
}
export function salesQuoteDto(data: Item) {
  return {
    ...commonListData(data),
  };
}
function getAddressDto(
  data: Item["shippingAddress"],
  customer: Item["customer"],
  title
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
function commonListData(data: Item) {
  const meta = (data.meta || {}) as any as SalesMeta;
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
    uuid: data.orderId,
    isDyke: data.isDyke,
    slug: data.slug,
    salesStat,
    address: data.shippingAddress?.address1 || data.billingAddress?.address1,
    displayName:
      data.customer?.name ||
      data.customer?.businessName ||
      data?.shippingAddress?.name,
    email: data.customer?.email,
    customerId: data.customer?.id,
    isBusiness: data.customer?.businessName,
    salesRep: data.salesRep?.name,
    salesRepInitial: getNameInitials(data.salesRep?.name!),
    poNo: meta?.po,
    deliveryOption: data?.deliveryOption,
    costLines: data.extraCosts,
    customerPhone:
      data.billingAddress?.phoneNo ||
      data.customer?.phoneNo ||
      data.shippingAddress?.phoneNo,
    salesDate: timeAgo(data.createdAt),
    links: salesLinks(data),
    shippingId: data.shippingAddressId,
    type: data.type as SalesType,
    isQuote: (data.type as SalesType) == "quote",
    invoice: {
      total: data.grandTotal,
      paid: data.grandTotal! - data.amountDue!,
      pending: data.amountDue,
    },
  };
}
export function statToKeyValueDto(
  dataStats: Prisma.SalesStatGetPayload<{}>[],
  reset = false
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
