"use server";

import { composeSalesItems } from "../../(loggedIn)/sales-v2/_utils/compose-sales-items";
import { viewSale } from "../../(loggedIn)/sales-v2/overview/_actions/get-sales-overview";
import { composePrint } from "./compose-print";
import { SalesPrintProps } from "./page";

export async function getSalesPrintData(
    slug,
    query: SalesPrintProps["searchParams"],
) {
    const order = await viewSale(null, slug, query.deletedAt);

    const salesitems = composeSalesItems(order);

    return composePrint(
        {
            order,
            ...salesitems,
        },
        query,
    );
}
