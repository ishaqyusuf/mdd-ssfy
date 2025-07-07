import { getCustomersDta } from "@/app/(clean-code)/(sales)/_common/data-access/customer.dta";

import {
    SearchParamsType,
    searchParamsCache,
} from "@/components/(clean-code)/data-table/search-params";
import { apiParamsTokV } from "@/utils/api-params-to-kv";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const search: SearchParamsType = apiParamsTokV(req.nextUrl.searchParams);

    // const search = searchParamsCache.parse(_ as any);

    return Response.json(await getCustomersDta(search as any));
}
