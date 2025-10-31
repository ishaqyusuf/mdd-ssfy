"use server";

import { getSales } from "@/data-access/sales";
import { Prisma } from "@/db";
import { BaseQuery } from "@/types/action";
import { DeliveryOption, ISalesType } from "@/types/sales";

export interface SalesQueryParams extends BaseQuery {
    type: ISalesType;
    deliveryOption: DeliveryOption;
}

export type GetSalesAction = Awaited<ReturnType<typeof getSalesAction>>;
export async function getSalesAction(query: SalesQueryParams) {
    return await getSales(query);
}
