import { NextRequest } from "next/server";
import { getCustomerTransactionsAction } from "@/actions/get-customer-tx-action";
import { getSalesOrdersDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-dta";
import {
    searchParamsCache,
    SearchParamsType,
} from "@/components/(clean-code)/data-table/search-params";

export async function GET(req: NextRequest) {
    const _search: Map<string, string> = new Map();
    req.nextUrl.searchParams.forEach((value, key) => _search.set(key, value));
    const search = {
        ...Object.fromEntries(_search),
    } as SearchParamsType;

    return Response.json(await getCustomerTransactionsAction(search as any));
}
