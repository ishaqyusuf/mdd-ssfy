import type { TRPCContext } from "../../trpc/init";
import { z } from "zod";
import { composeQueryData, composeQuery } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import type { Prisma } from "@gnd/db";
import { transformFilterDateToQuery } from "@gnd/utils";

export const getCustomerServicesSchema = z
  .object({
    q: z.string().optional(),
    dateRange: z.string().optional(),
    // Add other filter properties here
  })
  .extend(paginationSchema.shape);

export type GetCustomerServicesSchema = z.infer<
  typeof getCustomerServicesSchema
>;

export async function getCustomerServices(
  ctx: TRPCContext,
  query: GetCustomerServicesSchema
) {
  const { db } = ctx;
  const model = db.workOrders;

  const { response } = await composeQueryData(query, whereStat(query), model);

  const data = await model.findMany({
    where: whereStat(query),
    // select: {}
    // include: {}
    include: {
      tech: true,
    },
  });

  return await response(
    data.map((item) => {
      return {
        ...item,
      };
    })
  );
}

function whereStat(query: GetCustomerServicesSchema) {
  const where: Prisma.WorkOrdersWhereInput[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;

    switch (k as keyof GetCustomerServicesSchema) {
      case "q":
        // where.push({
        //   OR: [
        //     { name: { contains: v, mode: 'insensitive' } },
        //   ],
        // });
        break;
      case "dateRange":
        where.push({
          createdAt: transformFilterDateToQuery(query.dateRange),
        });
        break;
    }
  }
  return composeQuery(where);
}
