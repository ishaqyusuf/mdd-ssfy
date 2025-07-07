import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { Prisma } from "@/db";

import { composeQuery } from "../../app/(clean-code)/(sales)/_common/utils/db-utils";

export function whereDispatch(query: SearchParamsType) {
    const wheres: Prisma.OrderDeliveryWhereInput[] = [];
    if (query["sales.id"])
        wheres.push({
            salesOrderId: query["sales.id"],
        });
    return composeQuery(wheres);
}
