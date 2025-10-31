"use server";

import { prisma } from "@/db";
import { DeliveryOption, ISalesType } from "@/types/sales";
import { PageTab } from "../../../sales-v2/dealers/type";

export type SalesTabs =
    | "Orders"
    | "Quotes"
    | "Delivery"
    | "Pickup"
    | "Productions"
    | "Pending Evaluation";
export async function getSalesTabAction(): Promise<PageTab[]> {
    // auto convert SalesTabs to list of string
    let tabNames: SalesTabs[] = [
        "Orders",
        "Quotes",
        // "Productions",
        "Delivery",
        "Pickup",
        "Pending Evaluation",
    ];

    const s = await prisma.salesOrders.findMany({
        select: {
            id: true,
            type: true,
            deliveryOption: true,
            status: true,
            assignments: {
                include: {
                    _count: true,
                },
            },
        },
    });
    type SaleType = Omit<(typeof s)[number], "deliveryOption"> & {
        deliveryOption: DeliveryOption;
        type: ISalesType;
    };
    let ls: SaleType[] = s as any;

    let tabs: PageTab[] = tabNames.map((t) => {
        let count = ls.filter((o) => {
            switch (t) {
                case "Orders":
                    return o.type == "order";
                case "Quotes":
                    return o.type == "quote";
                case "Delivery":
                    return o.type == "order" && o.deliveryOption == "delivery";
                case "Pickup":
                    return o.type == "order" && o.deliveryOption == "pickup";
                case "Productions":
                    return o.type == "order" && o.assignments?.length;
                case "Pending Evaluation":
                    return o.status == "Evaluating";
                default:
                    return false;
            }
        }).length;
        const url = (
            {
                Delivery: "/sales/dashboard/delivery",
                Orders: "/sales/dashboard/orders",
                Pickup: "/sales/dashboard/pickup",
                Quotes: "/sales/dashboard/quotes",
                Productions: "/sales/dashboard/productions",
                "Pending Evaluation": "/sales/dashboard/pending-evaluation",
            } as { [id in SalesTabs]: string }
        )[t];
        return {
            count,
            title: t,
            params: {},
            url,
            // url: "",
        };
    });

    return tabs;
}
