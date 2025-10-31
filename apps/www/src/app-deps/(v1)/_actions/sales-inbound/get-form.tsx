"use server";

import { prisma } from "@/db";
import { uniqueBy } from "@/lib/utils";
import { IInboundOrder } from "@/types/sales-inbound";

import { InboundOrderableItemQueryParamProps } from "./get-orderable-items";

export interface GetInboundFormReponse {
    form;
    suppliers: string[];
    list;
}
export async function getInboundForm(
    slug = null,
    query: InboundOrderableItemQueryParamProps,
): Promise<GetInboundFormReponse> {
    // let form: IInboundOrder = slug
    //     ? await prisma.salesItemSupply.findUnique({
    //           where: {
    //               id: Number(slug)
    //           },
    //           include: {}
    //       })
    //     : ({} as any);
    // const salesItemIds = form?.inboundItems?.map(i => i.salesOrderItemId);
    // query.salesOrderItemIds = salesItemIds;
    // const orderables = await getOrderableItems(query);
    // const suppliers = await prisma.salesOrderItems.findMany({
    //     distinct: "supplier",
    //     where: {
    //         supplier: {
    //             not: null
    //         }
    //     },
    //     select: {
    //         supplier: true
    //     }
    // });
    return {} as any;
}
