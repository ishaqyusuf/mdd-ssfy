import { getSalesDispatchDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dispatch-dta";
import {
    SearchParamsType,
    searchParamsCache,
} from "@/components/(clean-code)/data-table/search-params";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));
    const search = {
        ...Object.fromEntries(_search),
        "sales.type": "order",
        // pk: generateRandomString(),
        // delivery: "delivery" as DeliveryOption,
    };

    return Response.json(await getSalesDispatchDta(search as any));
}
