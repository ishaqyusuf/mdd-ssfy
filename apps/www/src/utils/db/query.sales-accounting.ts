import { prisma } from "@/db";
import { composeQueryData } from "../query-response";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { whereCustomerTx } from "./where.customer-transactions";

export async function salesAccountingQueryMetaData(query: SearchParamsType) {
    const model = prisma.customerTransaction;
    const qd = await composeQueryData(query, whereCustomerTx(query), model);
    return {
        ...qd,
        model,
    };
}
