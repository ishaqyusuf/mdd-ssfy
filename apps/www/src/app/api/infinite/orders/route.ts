import { getSalesOrdersDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));

    const _ = {
        ...Object.fromEntries(_search),
        "sales.type": "order",
    } as SearchParamsType;
    if (
        Object.entries(_)
            .filter(([a, b]) => !!b)
            .every(([a]) => ["sales.type", "start"].includes(a))
    ) {
        _["production.status"] = "not completed";
    } else {
    }
    return Response.json(await getSalesOrdersDta(_ as any));
}
