import { SalesStat } from "@/db";
import { timeAgo } from "@/lib/use-day";
import { toNumber } from "@/lib/utils";
import { getNameInitials } from "@/utils/get-name-initials";

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
                "Shipping Address",
            ),
            billing: getAddressDto(data.billingAddress, "Billing Address"),
        },
    };
}
function getAddressDto(data: Item["shippingAddress"], title) {
    // console.log(data);
    if (!data) return {};
    const meta: AddressBookMeta = data?.meta as any;
    return {
        id: data.id,
        title,
        name: data.name,
        phone: data.phoneNo,
        email: data.email,
        address: [data.address1, meta?.zip_code]?.filter(Boolean).join(" "),
    };
}
function getSalesOrderStatus(stats: SalesStat[]) {
    const _stat: { [id in QtyControlType]: SalesStat } = {} as any;
    stats.map((s) => (_stat[s.type] = s));
    return _stat;
    // return {
    //     status: "-",
    //     date: undefined,
    // };
}
function commonListData(data: Item) {
    const meta = (data.meta || {}) as any as SalesMeta;
    const customerId = data?.customer?.id;
    let accountNo = data.customer?.phoneNo
        ? data.customer?.phoneNo
        : !customerId
          ? null
          : `cust-${customerId}`;
    return {
        netTerm: data.paymentTerm,
        accountNo,
        dueDate: data.paymentDueDate,
        id: data.id,
        orderId: data.orderId?.toUpperCase(),
        uuid: data.orderId,
        isDyke: data.isDyke,
        slug: data.slug,
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
            data.shippingAddress?.phoneNo ||
            data.billingAddress?.phoneNo ||
            data.customer?.phoneNo,
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
