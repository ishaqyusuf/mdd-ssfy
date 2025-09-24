import { composeQuery } from "@api/query-response";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import {
  consoleLog,
  dateQuery,
  formatMoney,
  sum,
  timeLog,
  transformFilterDateToQuery,
} from "@gnd/utils";
import { composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import type { HousePackageToolMeta } from "@sales/types";

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
  const { response, searchMeta, meta, where } = await composeQueryData(
    query,
    whereStat(query),
    db.dykeStepProducts
  );
  const dateFilter = {
    createdAt: transformFilterDateToQuery(query.dateRange as any),
  };
  consoleLog("WHERE", { where, meta });

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
      product: { select: { title: true, productCode: true, img: true } },
      stepForms: {
        where: {
          price: { gt: 0 },
          basePrice: { gt: 0 },
        },
      },
      housePackageTools: {
        where: {
          moldingId: { not: null },
          ...dateFilter,
        },
        select: {
          // molding: {
          //   select: {
          //     qty: true,
          //     price: true,
          //   },
          // },

          meta: true,
          salesOrderItem: {
            select: {
              qty: true,
            },
          },
        },
      },
      salesDoors: {
        select: {
          totalQty: true,
          jambSizePrice: true,
        },
        where: {
          deletedAt: null,
          ...dateFilter,
        },
      },
      _count: {
        select: {
          // salesDoors: {
          //   where: {
          //     deletedAt: null,
          //   }
          // },
          stepForms: {
            where: {
              ...dateFilter,
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
    data.map((d) => {
      const productCode = d.product?.productCode;
      const isMolding =
        // ?.filter((a) => a?.molding)
        !!d?.housePackageTools?.length;
      const doorsCount = d?.salesDoors?.length;
      const hpts = d.housePackageTools
        .map((a) => ({
          ...a,
          meta: a.meta as HousePackageToolMeta,
        }))
        .map((a) => {
          const m = a.meta?.priceTags?.moulding;
          const overridePrice = m?.overridePrice || (m as any)?.overridPrice;
          const qty = a?.salesOrderItem?.qty;
          const salesPrice = overridePrice || m?.salesPrice || m?.price;
          return {
            qty,
            salesPrice,
            m: !salesPrice ? m : undefined,
            costPrice: overridePrice || m?.basePrice || salesPrice,
          };
        });

      const units = doorsCount
        ? sum(d?.salesDoors || [], "totalQty")
        : isMolding
          ? sum(hpts.map((a) => a?.qty))
          : d?._count.stepForms;
      const salesPrice = doorsCount
        ? formatMoney(sum(d.salesDoors, "jambSizePrice"))
        : isMolding
          ? formatMoney(sum(hpts.map((a) => a.salesPrice)) * units)
          : formatMoney(sum(d.stepForms, "price"));
      const costPrice = doorsCount
        ? formatMoney(sum(d.salesDoors, "jambSizePrice"))
        : isMolding
          ? formatMoney(sum(hpts.map((a) => a?.costPrice)) * units)
          : formatMoney(sum(d.stepForms, "basePrice"));

      consoleLog("Search Result:", {
        isMolding,
        productCode,
        doorsCount,
        // hpts,
        units: hpts.filter((a) => String(a.qty).includes(".")),
      });
      return {
        name: d.name || d.product?.title,
        category: d.step?.title,
        units,
        revenue: 0,
        salesPrice,
        costPrice,
        img: d.img || d.product?.img,
        date: d.createdAt,
        productCode,
      };
    })
  );
}
function whereStat(query: ProductReportSchema) {
  const where: Prisma.DykeStepProductsWhereInput[] = [
    // {
    //   name: {
    //     not: null,
    //   },
    //   //   // OR: [
    //   //   //   {
    //   //   //     door: {
    //   //   //       ...dateQuery({
    //   //   //         from: "01/01/2025",
    //   //   //       }),
    //   //   //     },
    //   //   //   },
    //   //   //   {
    //   //   //     product: {
    //   //   //       ...dateQuery({
    //   //   //         from: "01/01/2025",
    //   //   //       }),
    //   //   //     },
    //   //   //   },
    //   //   //   {
    //   //   //     product: null,
    //   //   //     door: null,
    //   //   //   },
    //   //   // ],
    //   //   step: {
    //   //     deletedAt: null,
    //   //     title: "Door", //query.reportCategory || undefined,
    //   //     // priceSystem: {
    //   //     //   some: {
    //   //     //     deletedAt: null,
    //   //     //     price: {
    //   //     //       gt: 0,
    //   //     //     },
    //   //     //   },
    //   //     // },
    //   //   },
    //   // OR: [
    //   //   {
    //   //     stepForms: {
    //   //       some: {
    //   //         deletedAt: null,
    //   //         // price: {
    //   //         //   gt: 0,
    //   //         // },
    //   //         salesOrderItem: {
    //   //           salesOrder: {
    //   //             type: "order",
    //   //           },
    //   //         },
    //   //       },
    //   //     },
    //   //   },
    //   //   {
    //   //     salesDoors: {
    //   //       some: {},
    //   //     },
    //   //   },
    //   //   {
    //   //     housePackageTools: {
    //   //       some: {
    //   //         molding: {},
    //   //       },
    //   //     },
    //   //   },
    //   // ],
    // },
  ];
  if (query.reportCategory) {
    where.push({
      step: {
        title: query.reportCategory,
      },
    });
  }
  if (query.dateRange) {
    const dateFilter = {
      createdAt: transformFilterDateToQuery(query.dateRange as any),
    };
    where.push({
      OR: [
        {
          stepForms: {
            some: {
              ...dateFilter,
            },
          },
        },
        {
          housePackageTools: {
            some: {
              ...dateFilter,
            },
          },
        },
      ],
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
          product: {
            title: contains,
          },
        },
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
