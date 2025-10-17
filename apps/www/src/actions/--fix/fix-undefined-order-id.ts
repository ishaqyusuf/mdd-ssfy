"use server";

import { prisma } from "@/db";
import { redirect } from "next/navigation";

export async function fixUndefinedOrderIdAction(slug, type) {
    if (slug?.endsWith("undefined")) {
        const rep = await prisma.salesOrders.findFirst({
            where: {
                orderId: slug,
            },
            select: {
                type: true,
                id: true,
                salesRep: {
                    select: {
                        name: true,
                    },
                },
            },
        });
        let initals = rep.salesRep?.name
            ?.split(" ")
            ?.map((a) => a?.[0]?.toUpperCase())
            ?.filter(Boolean);
        if (initals.length) {
            let orderId = slug?.replace("undefined", initals.join(""));
            await prisma.salesOrders.update({
                where: {
                    id: rep.id,
                },
                data: {
                    slug: orderId,
                    orderId,
                },
            });
            redirect(`/sales-book/edit-${rep.type}/${orderId}`);
        }
        // redirect()
    }
}
