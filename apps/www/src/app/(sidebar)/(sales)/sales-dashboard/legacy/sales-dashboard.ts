"use server";

import { withDeleted } from "@/app/(v1)/_actions/action-utils";
import { prisma, Prisma } from "@/db";
import { composeBar } from "@/lib/chart";
import { capitalizeFirstLetter, sum } from "@/lib/utils";
import { ISalesDashboard } from "@/types/dashboard";
import { ISalesType } from "@/types/sales";

interface Props {}
export async function salesDashboardAction(): Promise<ISalesDashboard> {
    // const salesByMonthAndYear: any[] = await prisma.$queryRaw`
    // SELECT
    //   EXTRACT(YEAR FROM createdAt) as year,
    //   EXTRACT(MONTH FROM createdAt) as month,
    //  SUM(amount) as value
    // -- ROUND(SUM(amount)::numeric, 2) as value
    // FROM
    //   SalesPayments
    // WHERE
    //     deletedAt IS NULL
    // GROUP BY
    //   year,
    //   month
    // ORDER BY
    //   year, month;`;
    const salesByMonthAndYear: any[] = await prisma.$queryRaw`
    SELECT
      EXTRACT(YEAR FROM sp.createdAt) as year,
      EXTRACT(MONTH FROM sp.createdAt) as month,
      SUM(sp.amount) as value
    FROM
      SalesPayments sp
    JOIN 
      SalesOrders o ON sp.orderId = o.id
    WHERE 
      sp.deletedAt IS NULL
      AND o.deletedAt IS NULL
    GROUP BY
      year,
      month
    ORDER BY
      year, month;
`;

    let bar = composeBar(salesByMonthAndYear);

    await prisma.salesPayments.aggregate({
        _sum: {
            amount: true,
        },
    });
    const sales = await prisma.salesOrders.findMany({
        where: { deletedAt: null, type: "order" },
        select: {
            amountDue: true,
            prodQty: true,
            builtQty: true,
            prodStatus: true,
        },
        // include: {
        //     doors: true
        // }
    });
    const payments = await prisma.salesPayments.findMany({
        where: {},
        select: {
            amount: true,
        },
    });
    const response: ISalesDashboard = {
        bar,
    } as any;
    response.totalSales = sum(payments, "amount");
    response.amountDue = sum(sales, "amountDue");
    let pd = (response.pendingDoors = sum(sales, "builtQty")) || 0;
    let td = (response.totalDoors = sum(sales, "prodQty")) || 0;
    response.completedDoors = td - pd;
    let pendingCompletion = sales?.filter(
        (s) => s.prodStatus != "Completed",
    ).length;
    response.pendingOrders = pendingCompletion;
    response.totalOrders = await prisma.salesOrders.count({
        where: {
            type: "order" as ISalesType,
        },
    });
    response.completedOrders = sales?.filter(
        (s) => s.prodStatus == "Completed",
    ).length;
    const recentSales = await prisma.salesOrders.findMany({
        take: 5,
        where: {
            type: "order",
            deletedAt: null,
        },
        orderBy: {
            updatedAt: "desc",
        },
        include: {
            customer: true,
        },
        // where: {}
    });
    response.recentSales = recentSales as any;
    return response;
    const prismaKeys = {
        tableCounts: {},
        imports: [],
    };
    let _count = 0;
    let _group = [];
    async function getCount(table, _withDeleted = true) {
        try {
            return await (prisma?.[table] as any)?.count({
                where: _withDeleted
                    ? {
                          ...withDeleted,
                      }
                    : undefined,
            });
        } catch (error) {
            return await getCount(table, false);
        }
    }
    await Promise.all(
        Object.keys(prisma).map(async (k) => {
            //
            if (!k?.startsWith("$")) {
                const count = await getCount(k);
                if (count) {
                    prismaKeys.tableCounts[capitalizeFirstLetter(k)] = count;
                }
            }
        }),
    );
    Object.entries(prismaKeys.tableCounts).map(([k, count]) => {
        if (_count + (count as any) > 40000) {
            const tables = _group.map((g) => `'${g}'`).join(",");
            prismaKeys.imports.push({
                tables,
                _count,
            });
            _group = [];
            _count = 0;
        }
        _count += count as any;
        _group.push(k);
    });
    if (_group.length) {
        const tables = _group.map((g) => `'${g}'`).join(",");
        prismaKeys.imports.push({
            tables,
            _count,
        });
    }

    (response as any).prismaKeys = prismaKeys;

    return response;
}
