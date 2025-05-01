import { NextRequest } from "next/server";
import { getProductionTasksListPageAction } from "@/app/(clean-code)/(sales)/_common/data-actions/production-actions/productions-list-action";
import { authId } from "@/app/(v1)/_actions/utils";
import {
    searchParamsCache,
    SearchParamsType,
} from "@/components/(clean-code)/data-table/search-params";

export async function GET(req: NextRequest) {
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));

    const _ = {
        ...Object.fromEntries(_search),
        "sales.type": "order",
        "production.assignedToId": await authId(),
    } as SearchParamsType;
    const search = searchParamsCache.parse(_ as any);

    return Response.json(await getProductionTasksListPageAction(search as any));
}
