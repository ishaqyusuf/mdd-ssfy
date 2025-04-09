import { CustomerTransactionType } from "@/actions/get-customer-tx-action";
import { composeQuery } from "@/app/(clean-code)/(sales)/_common/utils/db-utils";
import { PaymentMethods } from "@/app/(clean-code)/(sales)/types";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { Prisma } from "@/db";

export function whereSalesPayment(query: SearchParamsType) {
    const whereAnd: Prisma.SalesPaymentsWhereInput[] = [];
    if (query["account.no"]) {
        whereAnd.push({
            transaction: {
                wallet: {
                    accountNo: query["account.no"],
                },
            },
        });
    }
    if (query["order.no"])
        whereAnd.push({
            order: {
                orderId: query["order.no"],
            },
        });
    if (query["customer.tx.id"])
        whereAnd.push({
            transactionId: query["customer.tx.id"],
        });
    return composeQuery(whereAnd);
}
