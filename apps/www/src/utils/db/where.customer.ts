import { Prisma } from "@/db";

import { CustomersQueryParams } from "../../app/(clean-code)/(sales)/_common/data-access/customer.dta";
import { composeQuery } from "../../app/(clean-code)/(sales)/_common/utils/db-utils";

export function whereCustomers(query: CustomersQueryParams) {
    const whereAnd: Prisma.CustomersWhereInput[] = [];
    if (query.search)
        whereAnd.push({
            OR: [
                { name: { contains: query.search } },
                { businessName: { contains: query.search } },
                { phoneNo: { contains: query.search } },
                { email: { contains: query.search } },
            ],
        });
    return composeQuery(whereAnd);
}
