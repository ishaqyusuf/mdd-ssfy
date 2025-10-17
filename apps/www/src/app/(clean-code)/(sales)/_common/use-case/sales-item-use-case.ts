"use server";

import { AsyncFnType } from "@/app/(clean-code)/type";
import { getSalesItemOverviewDta } from "../data-access/sales-dta";

export type GetSalesOverview = AsyncFnType<typeof getSalesItemOverviewUseCase>;
export async function getSalesItemOverviewUseCase(slug, type) {
    return await getSalesItemOverviewDta(slug, type);
}
