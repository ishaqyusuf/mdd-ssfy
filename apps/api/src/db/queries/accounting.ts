import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const accountingIndexSchema = z.object({}).merge(paginationSchema);
export type AccountingIndex = z.infer<typeof accountingIndexSchema>;

export async function accountingIndex(
  ctx: TRPCContext,
  query: AccountingIndex
) {
  const { db } = ctx;
  const where = whereAccounting(query);
  const params = await composeQueryData(query, where, db.customerTransaction);
  const data = await db.customerTransaction.findMany({
    ...params.queryProps,
  });
  const response = await params.response(
    data.map((item) => {
      return item;
    })
  );
  return response;
}

function whereAccounting(query: AccountingIndex) {
  const wheres: Prisma.CustomerTransactionWhereInput[] = [];
  return composeQuery(wheres);
}
