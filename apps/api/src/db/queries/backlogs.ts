import { composeQuery } from "@gnd/utils/query-response";
import { publicProcedure, type TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const getBacklogsSchema = z
  .object({
    q: z.string().optional().nullable(),
  })
  .extend(paginationSchema.shape);
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

export const backlogFormSchema = z.object({
  id: z.number(),
});
export type BacklogFormSchema = z.infer<typeof backlogFormSchema>;
export const backlogForm = publicProcedure
  .input(backlogFormSchema)
  .query(async (props) => {
    const {
      ctx: { db },
    } = props;
    const task = await db.backlogs.findFirst({
      where: {
        id: props.input.id,
      },
    });
    return {
      id: task?.id,
      // title: task?.title || "",
      description: task?.description || "",
    };
  });

export const saveBacklogSchema = z.object({
  id: z.number().optional().nullable(),
  title: z.string(),
  description: z.string().optional().nullable(),
});
export type SaveBacklogSchema = z.infer<typeof saveBacklogSchema>;
export const saveBacklog = publicProcedure
  .input(saveBacklogSchema)
  .mutation(async (props) => {
    return __saveBacklog(props.ctx, props.input);
  });
export async function __saveBacklog(
  ctx: TRPCContext,
  query: SaveBacklogSchema
) {
  const { db } = ctx;
}
