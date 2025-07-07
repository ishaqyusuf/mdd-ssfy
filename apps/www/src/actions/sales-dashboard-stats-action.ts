"use server";

import { prisma } from "@/db";

export async function getSalesDahboardStatsAction() {
    const salesByMonthAndYear = await prisma.salesPayments.aggregate({
        where: {
            // order
        },

        // by: ["createdAt"],
        // where: {
        //     deletedAt: null,
        // },
        // _sum: {
        //     amount: true,
        // },
        // orderBy: {
        //     createdAt: "asc",
        // },
    });

    // const formattedData = salesByMonthAndYear.map((item) => ({
    //     year: item.createdAt.getFullYear(),
    //     month: item.createdAt.getMonth() + 1, // getMonth() is 0-based
    //     value: item._sum.amount ?? 0,
    // }));

    // console.log(formattedData);
}
