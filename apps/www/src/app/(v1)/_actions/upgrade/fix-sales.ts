"use server";

import { prisma } from "@/db";
import { ISalesOrderItemMeta } from "@/types/sales";

export async function salesSuppliers() {
    const salsItems = await prisma.salesOrderItems.findMany({
        where: {
            supplier: null,
        },
    });
    const inserts: any = {};
    await Promise.all(
        salsItems.map(async (i) => {
            const m: ISalesOrderItemMeta = i.meta as any;

            const supplier = m?.supplier?.replace('"')?.trim()?.toUpperCase();

            if (supplier) {
                inserts[supplier] = [...(inserts?.[supplier] || []), i.id];
            }
        })
    );
    return await Promise.all(
        Object.entries(inserts)
            .map<any>(async ([k, v]) => {
                return `UPDATE SalesOrderItems SET supplier="${k}" WHERE id in (${(
                    v as any
                ).join(",")});`;
            })
            .join("\n")
    );
}

export async function fixSales() {
    //
    const p = await prisma.salesOrders.findMany({
        where: { deletedAt: null, amountDue: 0 },
        include: {
            payments: true,
        },
    });
    console.log(p.length);
}
