import { SalesStat } from "@/db";
import { timeAgo } from "@/lib/use-day";
import { toNumber } from "@/lib/utils";
import { getNameInitials } from "@/utils/get-name-initials";
import { composeSalesStat, salesAddressLines } from "@/utils/sales-utils";

import {
    AddressBookMeta,
    QtyControlType,
    SalesMeta,
    SalesType,
} from "../../../types";
import { GetSalesListDta } from "../sales-dta";
import { salesLinks } from "./links-dto";
import { dispatchTitle } from "./sales-shipping-dto";
import { overallStatus, statToKeyValueDto } from "./sales-stat-dto";

export type Item = GetSalesListDta["data"][number];
export function salesOrderDto(data: Item) {
    let due = toNumber(data.amountDue);
    if (due <= 0) due = 0;
    const customer = data.customer;
    return {
        ...commonListData(data),
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
                "Shipping Address",
            ),
            billing: getAddressDto(
                data.billingAddress,
                customer,
                "Billing Address",
            ),
        },
        statList: data.stat,
    };
}
function getAddressDto(
    data: Item["shippingAddress"],
    customer: Item["customer"],
    title,
) {
    // console.log(data);
    if (!data) return { title, address: "No address set" };
    const meta: AddressBookMeta = data?.meta as any;
    return {
        id: data.id,
        title,
        name: data.name || customer?.businessName || customer?.name,
        phone: data.phoneNo || customer.phoneNo,
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
        netTerm: data.paymentTerm,
        accountNo,
        dueDate: data.paymentDueDate,
        id: data.id,
        orderId: data.orderId?.toUpperCase(),
        uuid: data.orderId,
        isDyke: data.isDyke,
        slug: data.slug,
        salesStat,
        address:
            data.shippingAddress?.address1 || data.billingAddress?.address1,
        displayName:
            data.customer?.name ||
            data.customer?.businessName ||
            data?.shippingAddress?.name,
        email: data.customer?.email,
        customerId: data.customer?.id,
        isBusiness: data.customer?.businessName,
        salesRep: data.salesRep?.name,
        salesRepInitial: getNameInitials(data.salesRep?.name),
        poNo: meta?.po,
        deliveryOption: data?.deliveryOption,
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
            paid: data.grandTotal - data.amountDue,
            pending: data.amountDue,
        },
    };
}
export function salesStatisticDto(data: Item) {}
export function salesQuoteDto(data: Item) {
    return {
        ...commonListData(data),
    };
}
