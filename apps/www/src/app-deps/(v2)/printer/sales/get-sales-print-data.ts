"use server";

import { getDispatchCompletetionNotes } from "@sales/sales-control/actions";
import { composeSalesItems } from "../../(loggedIn)/sales-v2/_utils/compose-sales-items";
import { viewSale } from "../../(loggedIn)/sales-v2/overview/_actions/get-sales-overview";
import { composePrint } from "./compose-print";
import { SalesPrintProps } from "./page";
import { prisma } from "@/db";

export async function getSalesPrintData(
    slug,
    query: SalesPrintProps["searchParams"],
) {
    const order = await viewSale(null, slug, query.deletedAt);

    const salesitems = composeSalesItems(order);
    const dispatchId = query?.dispatchId;
    return composePrint(
        {
            order,
            ...salesitems,
            dispatchNote: dispatchId
                ? await getDispatchCompletetionNotes(prisma, dispatchId)
                : null,
        },
        query,
    );
}
