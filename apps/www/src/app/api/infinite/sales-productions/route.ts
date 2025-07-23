import { NextRequest } from "next/server";

import { getProductionListPageAction } from "@/app/(clean-code)/(sales)/_common/data-actions/production-actions/productions-list-action";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

export async function GET(req: NextRequest) {
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));
    const search = {
        ...Object.fromEntries(_search),
        "sales.type": "order",
    } as SearchParamsType;

    return Response.json(
        await getProductionListPageAction(search as any, true),
    );
}
