import { unstable_cache } from "next/cache";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import {
    FilterKeys,
    SearchParamsType,
} from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { whereSales } from "@/utils/db/where.sales";

export const getNotes = async () => {
    return unstable_cache(async () => {}, ["notes"], {
        tags: ["notes_${}"],
        revalidate: 3600,
    });
};
export const getSalesPageQueryData = async (params?: SearchParamsType) => {
    return unstable_cache(
        async (params) => {
            const where = whereSales(params || {});
            const sales = await prisma.salesOrders.findMany({
                where,
                // where: {
                //     type: "order" as SalesType,
                // },
                select: {
                    orderId: true,
                    meta: true,
                    customer: {
                        select: {
                            businessName: true,
                            name: true,
                            phoneNo: true,
                            address: true,
                        },
                    },
                    billingAddress: {
                        select: {
                            name: true,
                            phoneNo: true,
                            address1: true,
                        },
                    },
                    salesRep: {
                        select: {
                            name: true,
                        },
                    },
                },
            });
            const result: Partial<{ [k in FilterKeys]: any }> = {
                "order.no": sales.map((s) => s.orderId),
                phone: [
                    ...new Set(
                        sales
                            .map((s) => [
                                s.customer?.phoneNo,
                                s.billingAddress?.phoneNo,
                            ])
                            .flat()
                            .filter(Boolean),
                    ),
                ],
                "customer.name": [
                    ...new Set(
                        sales
                            .map((s) =>
                                [s.customer?.name, s.customer?.businessName]
                                    .flat()
                                    .filter(Boolean),
                            )
                            .flat(),
                    ),
                ],
                "sales.rep": [
                    ...new Set(
                        sales.map((s) => s.salesRep?.name)?.filter(Boolean),
                    ),
                ],
                po: [
                    ...new Set(
                        sales.map((s) => (s.meta as any)?.po).filter(Boolean),
                    ),
                ],
            };
            return result;
        },
        ["sales_queries"],
        {
            tags: [`sales_queries`],
            revalidate: 3600,
        },
    )(params);
};
