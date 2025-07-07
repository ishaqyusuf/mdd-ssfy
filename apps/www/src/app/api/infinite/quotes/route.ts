import {
    getSalesOrdersDta,
    getSalesQuotesDta,
} from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import { SalesType } from "@/app/(clean-code)/(sales)/types";

import {
    searchParamsCache,
    SearchParamsType,
} from "@/components/(clean-code)/data-table/search-params";
import { generateRandomString } from "@/lib/utils";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));
    const search = {
        ...Object.fromEntries(_search),
        "sales.type": "quote",
    } as SearchParamsType;
    return Response.json(await getSalesQuotesDta(search as any));
}
