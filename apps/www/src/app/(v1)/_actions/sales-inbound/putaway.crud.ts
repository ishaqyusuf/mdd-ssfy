"use server";

import { prisma, Prisma } from "@/db";
import { whereQuery } from "@/lib/db-utils";
import { BaseQuery } from "@/types/action";

import { getPageInfo, queryFilter } from "../action-utils";

interface PutawayQueryParams extends Omit<BaseQuery, "status"> {
    status: "All" | "Pending" | "Stored" | "Pending Arrival";
}
export async function getPutwaysAction(query: PutawayQueryParams) {
    // if (!query.status) query.status = "Arrived Warehouse";
    const where = wherePutaway(query);

    return {
        pageInfo: {},
        data: [] as any,
    };
}
function wherePutaway(query: PutawayQueryParams) {
    return {};
}
export async function _updateInboundItemLocation(id, data) {}
