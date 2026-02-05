import { Db, Prisma } from "@gnd/db";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import z from "zod";

export const getBuildersSchema = z.object({}).extend(paginationSchema.shape);
export type GetBuildersSchema = z.infer<typeof getBuildersSchema>;
export async function getBuilders(db: Db, query: GetBuildersSchema) {
  //   const { db } = ctx;
  const model = db.builders;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereBuilders(query),
    model,
  );

  const data = await model.findMany({
    where,
    ...searchMeta,
    select: {
      id: true,
    },
  });

  return await response(
    data.map((d) => ({
      ...d,
    })),
  );
}
function whereBuilders(query: GetBuildersSchema) {
  const where: Prisma.BuildersWhereInput[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;
    const value = v as any;
    switch (k as keyof GetBuildersSchema) {
      case "q":
        const q = { contains: v as string };
        where.push({
          OR: [],
        });
        break;
    }
  }
  return composeQuery(where);
}
