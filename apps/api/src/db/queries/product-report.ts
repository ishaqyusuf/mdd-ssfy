import { composeQuery } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { timeLog } from "@gnd/utils";
import { composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";

import { z } from "zod";

/*
salesStatistics: publicProcedure
      .input(salesStatisticschema)
      .query(async (props) => {
        return salesStatistics(props.ctx.db, props.input);
      }),
*/
export const productReportSchema = z
  .object({
    q: z.string().optional().nullable(),
    dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
    reportCategory: z.string().optional().nullable(),
  })
  .merge(paginationSchema);
export type ProductReportSchema = z.infer<typeof productReportSchema>;

export async function getProductReport(
  { db }: TRPCContext,
  query: ProductReportSchema
) {
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereStat(query),
    db.dykeStepProducts
  );
  const data = await db.dykeStepProducts.findMany({
    where,
    ...searchMeta,
    // include: SalesListInclude,
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      img: true,
      id: true,
      name: true,
      step: {
        select: {
          title: true,
        },
      },
      _count: {
        select: {
          stepForms: {
            where: {
              salesOrderItem: {
                salesOrder: {
                  type: "order",
                },
              },
            },
          },
        },
      },
    },
  });

  return await response(
    data.map((d) => ({
      name: d.name,
      category: d.step?.title,
      units: d?._count.stepForms,
      revenue: 0,
      costPrice: 0,
      salesPrice: 0,
      img: d.img,
    }))
  );
}
function whereStat(query: ProductReportSchema) {
  const where: Prisma.DykeStepProductsWhereInput[] = [
    {
      name: {
        not: null,
      },
      step: {
        deletedAt: null,
        priceSystem: {
          some: {
            deletedAt: null,
            price: {
              gt: 0,
            },
          },
        },
      },
      stepForms: {
        some: {
          deletedAt: null,
          salesOrderItem: {
            salesOrder: {
              type: "order",
            },
          },
        },
      },
    },
  ];
  if (query.reportCategory) {
    where.push({
      step: {
        title: query.reportCategory,
      },
    });
  }
  if (query.q) {
    const contains = {
      contains: query.q,
      // mode: "insensitive",
    };
    where.push({
      OR: [
        { name: contains },
        {
          step: {
            title: contains,
          },
        },
      ],
    });
  }
  return composeQuery(where);
}
