"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma } from "@/db";
import { whereSales } from "@/utils/db/where.sales";
import { getCustomerPendingSales as apiGetCustomerPendingSales } from "@api/db/queries/customer";

export async function getCustomerPendingSales(accountNo) {
    return apiGetCustomerPendingSales({ db: prisma }, accountNo);
}
