import { getDispatchListActions } from "@/app/(clean-code)/(sales)/_common/data-actions/dispatch-actions/dispatch-list-action";

import {
    SearchParamsType,
    searchParamsCache,
} from "@/components/(clean-code)/data-table/search-params";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));
    const _ = {
        ...Object.fromEntries(_search),
        "sales.type": "order",
    } as SearchParamsType;
    const search = searchParamsCache.parse(_ as any);

    return Response.json(await getDispatchListActions(search as any));
}
