import { composeQuery } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { dateQuery, formatMoney, sum, timeLog } from "@gnd/utils";
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
    // where: {
    //   step: {
    //     title: {
    //       contains: query.reportCategory,
    //     },
    //   },
    // },
    ...searchMeta,
    // include: SalesListInclude,
    // orderBy: {
    //   updatedAt: "desc",
    // },
    select: {
      createdAt: true,
      img: true,
      id: true,
      name: true,
      step: {
        select: {
          title: true,
        },
      },
      stepForms: {
        where: {
          price: { gt: 0 },
          basePrice: { gt: 0 },
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
  timeLog(JSON.stringify(where)?.replaceAll('"', "'"));
  return await response(
    data.map((d) => ({
      name: d.name,
      category: d.step?.title,
      units: d?._count.stepForms,
      revenue: 0,
      salesPrice: formatMoney(sum(d.stepForms, "price")),
      costPrice: formatMoney(sum(d.stepForms, "basePrice")),
      img: d.img,
      date: d.createdAt,
    }))
  );
}
function whereStat(query: ProductReportSchema) {
  // if (query.q)
  //   return {
  //     step: {
  //       title: {
  //         contains: query.q,
  //         // mode: "insensitive",
  //       },
  //     },
  //   };
  // if (query.reportCategory)
  //   return {
  //     step: {
  //       title: {
  //         contains: query.reportCategory,
  //         // mode: "insensitive",
  //       },
  //     },
  //   };
  // return {};
  // return {
  //   step: {
  //     title: {
  //       contains: "Moulding",
  //     },
  //   },
  // };
  const where: Prisma.DykeStepProductsWhereInput[] = [
    {
      name: {
        not: null,
      },
      // OR: [
      //   {
      //     door: {
      //       ...dateQuery({
      //         from: "01/01/2025",
      //       }),
      //     },
      //   },
      //   {
      //     product: {
      //       ...dateQuery({
      //         from: "01/01/2025",
      //       }),
      //     },
      //   },
      //   {
      //     product: null,
      //     door: null,
      //   },
      // ],
      step: {
        deletedAt: null,
        title: query.reportCategory || undefined,
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
          price: {
            gt: 0,
          },
          salesOrderItem: {
            salesOrder: {
              type: "order",
            },
          },
        },
      },
    },
  ];
  // if (query.reportCategory) {
  //   where.push({
  //     step: {
  //       title: query.reportCategory,
  //     },
  //   });
  // }
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
