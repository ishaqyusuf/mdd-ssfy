import {
    QtyControlType,
    TypedSalesStat,
} from "@/app/(clean-code)/(sales)/types";
import { GetAllSales, SalesItem } from "@/data-access/sales";
import { IGetFullSale } from "@/data-access/sales.get-overview";
import { SalesStat } from "@/db";
import { sum } from "@/lib/utils";
import { capitalize } from "lodash";

import { dateData, infoData } from "./data-util";

export function composeSalesCostBreakdown(data: IGetFullSale) {
    if (data.type != "order") return null;
    return {};
}

export function composeSalesInformation(data: IGetFullSale) {
    return {
        list: [
            infoData(capitalize(`${data.type} #`), data.orderId),
            dateData(capitalize(`${data.type} Date`), data.createdAt),
            infoData("Sales Rep", data.salesRep?.name),
            infoData("P.O No", data.meta?.po),
        ],
        stats: composeSalesStatKeyValue(data.stat),
        address: composeSalesAddress(data),
    };
}
export function composeSalesAddress(data: IGetFullSale) {
    return {
        businessName: data.customer?.businessName,
        customerName: data.customer?.name,
        customerId: data.customerId,
        shipTo: {
            id: data.shippingAddressId,
            name: data.shippingAddress?.name,
            phone: data.shippingAddress?.phoneNo,
            address: [
                data.shippingAddress.address1,
                data.shippingAddress.state,
                data.shippingAddress.city,
                data.shippingAddress.meta.zip_code,
            ],
        },
    };
}
export function composeSalesStatus(data: IGetFullSale) {
    const statsKv = composeSalesStatKeyValue(data.stat);
    return statsKv;
}
export function composeTotalDeliverables(item: SalesItem) {
    if (item.isDyke)
        return sum([
            ...item.doors?.map((d) => sum([d.lhQty, d.rhQty])),
            ...item.items.filter((i) => i.dykeProduction).map((i) => i.qty),
        ]);
    return sum(item.items.filter((i) => i.swing).map((i) => i.qty));
}
export function composeSalesStatKeyValue(stats: SalesStat[]) {
    const resp: { [id in QtyControlType]: TypedSalesStat } = {} as any;

    stats.map((stat) => (resp[stat.type] = stat));

    return resp;
}

export function composeListOrders(item: GetAllSales["data"][number]) {
    return {
        id: item.id,
        slug: item.slug,
        orderId: item.orderId,
        salesRep: item.salesRep?.name || "-",
    };
}
