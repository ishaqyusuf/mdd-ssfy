import { prisma } from "@/db";
import { SalesType } from "../../types";
import { FilterKeys } from "@/components/(clean-code)/data-table/search-params";
const type = "sales-page-setting";

export async function truncateSalesPageDataDta() {
    await prisma.settings.deleteMany({
        where: {
            type,
        },
    });
}
export async function getSalesPageQueryDataDta() {
    // return {};
    const pageCache = await prisma.settings.findMany({
        where: {
            type,
            // createdAt: {
            //     gte: dayjs().add(5,'hour')
            // }
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    if (pageCache.length > 1)
        await prisma.settings.deleteMany({
            where: {
                id: {
                    in: pageCache.filter((p, i) => i > 0).map((p, i) => p.id),
                },
            },
        });
    // if (pageCache?.meta) return pageCache?.meta as any;
    const sales = await prisma.salesOrders.findMany({
        where: {
            type: "order" as SalesType,
        },
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
                    .filter(Boolean)
            ),
        ],
        "customer.name": [
            ...new Set(
                sales
                    .map((s) =>
                        [s.customer?.name, s.customer?.businessName]
                            .flat()
                            .filter(Boolean)
                    )
                    .flat()
            ),
        ],
        "sales.rep": [
            ...new Set(sales.map((s) => s.salesRep?.name)?.filter(Boolean)),
        ],
        po: [...new Set(sales.map((s) => (s.meta as any)?.po).filter(Boolean))],
    };
    const eId = pageCache[0]?.id;
    await prisma.settings.upsert({
        create: {
            type,
            meta: result,
        },
        update: {
            meta: result,
        },
        where: { id: eId },
    });

    return result;
}
