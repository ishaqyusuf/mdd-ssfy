"use server";

import {
    SalesPaymentStatus,
    SalesType,
} from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { PageFilterData } from "@/types/type";
import { paymentMethods, salesHaving } from "@/utils/constants";
import { unstable_cache } from "next/cache";

export async function salesPaymentResoltionFilters() {
    const fn = async () => {
        const [] = await Promise.all([]);
        const response: PageFilterData[] = [
            {
                value: "search",
                icon: "Search",
                type: "input",
            },
        ];
        return response;
        response.push({
            value: "status",
            type: "checkbox",
            label: "Payment Status",
            icon: "save",
            options: ["Success", "Cancelled"].map((a) => ({
                label: a,
                value: a,
            })),
        });
        response.push({
            value: "payment.type",
            type: "checkbox",
            label: "Payment Type",
            icon: "pickup",
            options: paymentMethods.map((a) => ({
                label: a,
                value: a,
            })),
        });
        const salesReps = await prisma.users.findMany({
            where: {
                reppedProductions: {
                    some: {
                        type: "order" as SalesType,
                        deletedAt: null,
                    },
                },
            },
            select: {
                id: true,
                name: true,
            },
        });
        response.push({
            value: "salesRep.id",
            label: "Sales Rep",
            type: "checkbox",
            icon: "user",
            options: salesReps.map((s) => ({
                label: s.name,
                value: s.id?.toString(),
            })),
        });
        response.push({
            value: "sales.having",
            label: "Sales Having",
            type: "checkbox",
            options: salesHaving.map((s) => ({
                label: s,
                value: s,
            })),
        });
        const salesIds = await prisma.salesOrders.findMany({
            where: {
                type: "order" as SalesType,
            },
            select: {
                orderId: true,
            },
        });
        response.push({
            value: "order.no",
            label: "Order No",
            type: "checkbox",
            options: salesIds.map((a) => ({
                label: a?.orderId?.toUpperCase(),
                value: a.orderId,
            })),
        });
        return response;
    };

    const tags = [`sales-accounting-filter`];
    return unstable_cache(fn, tags, { tags })();
}
