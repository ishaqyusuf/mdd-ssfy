import { composeQuery } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const getBacklogsSchema = z
  .object({
    q: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type GetBacklogsSchema = z.infer<typeof getBacklogsSchema>;
export async function getBacklogs(ctx: TRPCContext, query: GetBacklogsSchema) {
  const { db } = ctx;
  // const query = {};
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereBacklog(query),
    db.backlogs
  );

  const data = await db.backlogs.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
    },
  });

  return await response(
    data.map((d) => ({
      ...d,
    }))
  );
}
function whereBacklog(query: GetBacklogsSchema) {
  const where: Prisma.BacklogsWhereInput[] = [];
  if (query.q) {
    where.push({});
  }
  return composeQuery(where);
}
