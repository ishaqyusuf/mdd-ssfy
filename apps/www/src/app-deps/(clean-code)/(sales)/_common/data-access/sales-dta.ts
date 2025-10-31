import { AsyncFnType, PageBaseQuery } from "@/app/(clean-code)/type";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { whereSales } from "@/utils/db/where.sales";

import { getPageInfo, pageQueryFilter } from "../../../_common/utils/db-utils";
import {
    DykeDoorType,
    SalesItemMeta,
    SalesMeta,
    SalesType,
    TypedAddressBook,
} from "../../types";
import { SalesListInclude, SalesOverviewIncludes } from "../utils/db-utils";
import { salesOverviewDto } from "./dto/sales-item-dto";
import { salesOrderDto, salesQuoteDto } from "./dto/sales-list-dto";
import { salesShippingDto } from "./dto/sales-shipping-dto";
import { statMismatchDta } from "./sales-progress.dta";
import { salesNotesCount } from "@/actions/sales-note-count";

// import { unstable_noStore } from "next/cache";

export interface GetSalesListQuery extends PageBaseQuery {
    _type?: SalesType;
    dealerId?;
    id?;
    orderId?;
    po?;
    customer?;
    phone?;
    rep?;
}
export type GetSalesQuotesDta = AsyncFnType<typeof getSalesQuotesDta>;
export async function getSalesQuotesDta(query: SearchParamsType) {
    const resp = await getSalesListDta(query);

    return {
        ...resp,
        data: resp.data.map(salesQuoteDto),
    };
}
export type GetSalesOrdersDta = AsyncFnType<typeof getSalesOrdersDta>;
export type SalesListItem = GetSalesOrdersDta["data"][number];
export async function getSalesOrdersDta(query: SearchParamsType) {
    const resp = await getSalesListDta(query);

    return {
        ...resp,
        data: resp.data.map(salesOrderDto),
    };
}

export type GetSalesListDta = AsyncFnType<typeof getSalesListDta>;
export async function getSalesListDta(query: SearchParamsType) {
    const where = whereSales(query);

    const data = await prisma.salesOrders.findMany({
        where,
        ...pageQueryFilter(query),
        include: SalesListInclude,
    });
    const pageInfo = await getPageInfo(query, where, prisma.salesOrders);
    const notCounts = await salesNotesCount(data?.map((a) => a.id));

    return {
        pageCount: pageInfo.pageCount,
        pageInfo,
        data: data.map((data) => {
            const deliveryOption =
                data?.deliveries?.[0]?.status || data?.deliveryOption;
            return {
                ...data,
                ...(notCounts[data.id.toString()] || {}),
                deliveryOption,
            };
        }),
        meta: {
            totalRowCount: pageInfo.totalItems,
        },
    };
}
export async function getSalesListDataByIdDta(id) {
    const data = await getSalesListDta({
        id,
    });
    return data.data?.[0];
}
export type GetFullSalesDataDta = AsyncFnType<typeof typedFullSale>;
export async function getFullSaleById(id) {
    const sale = await prisma.salesOrders.findFirstOrThrow({
        where: {
            id,
        },
        include: SalesOverviewIncludes,
    });
    return sale;
}
export async function getFullSaleBySlugType(slug, type) {
    const include = SalesOverviewIncludes;

    const sale = await prisma.salesOrders.findFirstOrThrow({
        where: {
            OR: [{ slug }, { orderId: slug }],
            type,
        },
        include,
    });
    return sale;
}
export function typedFullSale(sale: AsyncFnType<typeof getFullSaleById>) {
    const shippingAddress = {
        ...(sale.shippingAddress || {}),
    } as any as TypedAddressBook;
    const billingAddress = {
        ...(sale.billingAddress || {}),
    } as any as TypedAddressBook;
    return {
        ...sale,
        items: sale.items.map(({ meta, ...rest }) => ({
            ...rest,
            meta: meta as any as SalesItemMeta,
            housePackageTool: rest.housePackageTool
                ? {
                      ...rest.housePackageTool,
                      doorType: rest.housePackageTool.doorType as DykeDoorType,
                  }
                : null,
        })),
        type: sale.type as SalesType,
        meta: sale.meta as any as SalesMeta,
        shippingAddress,
        billingAddress,
    };
}

export type GetSalesItemOverviewDta = AsyncFnType<
    typeof getSalesItemOverviewDta
>;
export async function getSalesItemOverviewDta(slug, type, retries = 0) {
    const sale = isNaN(Number(slug))
        ? await getFullSaleBySlugType(slug, type)
        : await getFullSaleById(slug);
    const data = typedFullSale(sale);
    const overview = salesOverviewDto(data);
    const resp = {
        ...overview,
        shipping: salesShippingDto(overview, data),
        retries,
        salesInfo: salesOrderDto(data as any),
        meta: sale.meta as any as SalesMeta,
    };
    if ((await statMismatchDta(resp)) && retries < 1) {
        return await getSalesItemOverviewDta(slug, type, retries + 1);
    }
    return resp;
}
export async function getSalesCustomerIdDta(id) {
    return (
        await prisma.salesOrders.findFirstOrThrow({
            where: { id },
            select: {
                customerId: true,
            },
        })
    )?.customerId;
}
export async function getSaleByOrderIdDta(orderId) {
    return await prisma.salesOrders.findFirstOrThrow({
        where: {
            orderId,
        },
    });
}
export async function deleteSalesByOrderId(orderId) {
    const data = await getSaleByOrderIdDta(orderId);
    await deleteSalesDta(data.id);
}
export async function deleteSalesDta(id) {
    return await prisma.salesOrders.update({
        where: {
            id,
        },
        data: {
            deletedAt: new Date(),
        },
    });
}
export async function restoreDeleteDta(id) {
    return await prisma.salesOrders.update({
        where: { id, deletedAt: {} },
        data: {
            deletedAt: null,
        },
    });
}
