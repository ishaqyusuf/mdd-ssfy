"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { AsyncFnType } from "@/types";
import { __getPaymentCountBySales } from "./cached-sales-accounting";
import { getSalesResolvables } from "./cache/get-sales-resolvables";
import { PageDataMeta } from "@/types/type";

export type GetSalesResolutions = AsyncFnType<typeof getSalesResolutions>;
export async function getSalesResolutions(query: SearchParamsType) {
    const resolvables = await getSalesResolvables();

    const {
        start = 0,
        size = 10,
        status,
        "date.filter": dateFilter,
        "date.from": dateFrom,
        "date.to": dateTo,
        search,
    } = query;
    const meta: PageDataMeta = {};
    const data = resolvables.filter((a, i) => i >= start);
    let filteredResolvables = [...resolvables];
    switch (status) {
        case "Resolved":
            filteredResolvables = filteredResolvables?.filter(
                (a) => a.status == "resolved",
            );
            break;
        case "Resolved Today":
            break;
        case "Unresolved":
            break;
    }
    switch (dateFilter) {
        case "resolvedAt":
            break;
    }
    if (search) {
        const s = search?.toLocaleLowerCase();
        filteredResolvables = filteredResolvables.filter((a) => {
            const searchFields = [
                a.orderId,
                a?.customer?.name,
                a?.customer?.businessName,
                a?.salesRep,
                a?.accountNo,
            ]
                .filter(Boolean)
                .map((field) => field.toString().toLocaleLowerCase());

            // Split search into words and require all to match (AND search)
            const searchWords = s.split(/\s+/).filter(Boolean);

            return searchWords.every((word) => {
                try {
                    const regex = new RegExp(word, "i");
                    return searchFields.some((field) => regex.test(field));
                } catch {
                    // fallback to simple includes if regex fails
                    return searchFields.some((field) => field.includes(word));
                }
            });
        });
        console.log(
            "Filtered resolvables by search:",
            filteredResolvables?.length,
        );
    }
    meta.count = resolvables
        .filter((a) => a.status)
        .filter((a) => a.status != "resolved").length;
    let nextStart;
    if (data.length > size) nextStart = size + start;
    meta.next = {
        size: 20,
        start: nextStart,
    };
    return {
        meta,
        data: data.filter((a, i) => i < size),
    };
}
