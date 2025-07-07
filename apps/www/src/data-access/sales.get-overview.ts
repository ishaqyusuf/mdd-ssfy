import { SalesIncludeAll } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";
import {
    composeSalesCostBreakdown,
    composeSalesInformation,
} from "@/data/compose-sales";
import { prisma } from "@/db";
import { IAddressMeta, ISalesOrderMeta, ISalesType } from "@/types/sales";

export type IGetFullSale = Awaited<ReturnType<typeof getSale>>;

export async function getSalesOverviewPage(type: ISalesType, slug) {
    const sale = await getSale(type, slug);

    return {
        breakdown: composeSalesCostBreakdown(sale),
        info: composeSalesInformation(sale),
    };
}
export async function getSale(type: ISalesType, slug) {
    console.log({ slug, type });

    const sale = await prisma.salesOrders.findFirstOrThrow({
        where: {
            type,
            slug,
        },
        include: SalesIncludeAll,
    });
    const shippingAddress = {
        ...(sale.shippingAddress || {}),
        meta: sale.shippingAddress?.meta as any as IAddressMeta,
    };
    const billingAddress = {
        ...(sale.billingAddress || {}),
        meta: sale.billingAddress?.meta as any as IAddressMeta,
    };
    return {
        ...sale,
        type: sale.type as ISalesType,
        meta: sale.meta as any as ISalesOrderMeta,
        shippingAddress,
        billingAddress,
    };
}
