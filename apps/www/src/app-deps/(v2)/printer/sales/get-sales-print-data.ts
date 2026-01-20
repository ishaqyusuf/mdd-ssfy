"use server";

import { getDispatchCompletetionNotes } from "@sales/sales-control/actions";
import { composeSalesItems } from "../../(loggedIn)/sales-v2/_utils/compose-sales-items";
import { viewSale } from "../../(loggedIn)/sales-v2/overview/_actions/get-sales-overview";
import { composePrint } from "./compose-print";
import { prisma } from "@/db";
import { SalesPrinterProps } from "../type";

export async function getSalesPrintData(
    slug,
    query: SalesPrinterProps["searchParams"],
) {
    const order = await viewSale(query?.mode, slug, query.deletedAt);

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
