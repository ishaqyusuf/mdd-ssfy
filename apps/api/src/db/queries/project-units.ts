import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { transformFilterDateToQuery } from "@gnd/utils";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const invoiceFilter = [
  //   "part paid",
  //   "full paid",
  "no payment",
  "has payment",
] as const;
export type INVOICE_TYPES = (typeof invoiceFilter)[number];

export const communityProductionFilter = [
  "started",
  "queued",
  "idle",
  "completed",
  "sort",
] as const;
export type CommunityProductionFilter =
  (typeof communityProductionFilter)[number];
export const communityInstllationFilters = [
  "Submitted",
  "No Submission",
] as const;
export type CommunityInstllationFilters =
  (typeof communityInstllationFilters)[number];
export const getProjectUnitsSchema = z
  .object({
    builderSlug: z.string().optional().nullable(),
    projectSlug: z.string().optional().nullable(),
    production: z.enum(communityProductionFilter).optional().nullable(),
    invoice: z.enum(invoiceFilter).optional().nullable(),
    installation: z.enum(communityInstllationFilters).optional().nullable(),
    dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
  })
  .merge(paginationSchema);
export type GetProjectUnitsSchema = z.infer<typeof getProjectUnitsSchema>;

export async function getProjectUnits(
  ctx: TRPCContext,
  query: GetProjectUnitsSchema
) {
  const { db } = ctx;
  const model = db.homes;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereProjectUnits(query),
    model
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
    }))
  );
}
function whereProjectUnits(query: GetProjectUnitsSchema) {
  const where: Prisma.HomesWhereInput[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;

    const value = v as any;
    switch (k as keyof GetProjectUnitsSchema) {
      case "q":
        const q = { contains: v as string };
        where.push({
          OR: [
            {
              search: q,
            },
            {
              modelName: q,
            },
          ],
        });
        break;
      case "projectSlug":
        where.push({
          project: {
            slug: value,
          },
        });
        break;
      case "builderSlug":
        where.push({
          project: {
            builder: {
              slug: value,
            },
          },
        });
        break;
      case "invoice":
        switch (query.invoice) {
          case "has payment":
            where.push({
              tasks: {
                some: {
                  taskUid: {
                    not: null,
                  },
                  amountPaid: {
                    gt: 0,
                  },
                },
              },
            });
            break;
          case "no payment":
            where.push({
              tasks: {
                every: {
                  taskUid: {
                    not: null,
                  },
                  OR: [
                    {
                      amountPaid: {
                        equals: 0,
                      },
                    },
                    {
                      amountPaid: null,
                    },
                    {
                      amountPaid: undefined,
                    },
                  ],
                },
              },
            });
            break;
        }
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
