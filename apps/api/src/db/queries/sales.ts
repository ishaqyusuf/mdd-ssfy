import { salesOrderDto } from "@api/dto/sales-dto";
import { whereSales } from "@api/prisma-where";
import { composeQueryData } from "@api/query-response";
import type { SalesQueryParamsSchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";

export async function getSales(
  ctx: TRPCContext,
  query: SalesQueryParamsSchema,
) {
  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSales(query),
    db.salesOrders,
  );

  const data = await db.salesOrders.findMany({
    where,
    ...searchMeta,
    include: SalesListInclude,
  });
  const notCounts = await salesNotesCount(
    data?.map((a) => a.id),
    ctx.db,
  );

  return await response(
    data.map(salesOrderDto).map((d) => ({
      ...d,
      ...(notCounts[d.id.toString()] || {}),
    })),
  );
}
export const SalesListInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      businessName: true,
      phoneNo: true,
      email: true,
      address: true,
    },
  },
  billingAddress: true,
  shippingAddress: true,
  salesRep: {
    select: {
      name: true,
    },
  },
  deliveries: true,
  stat: true,
  extraCosts: true,
} satisfies Prisma.SalesOrdersInclude;

export async function salesNotesCount(salesIds: number[], prisma) {
  if (!salesIds || salesIds.length === 0) return {};
  const notes = await prisma.notePad.findMany({
    where: {
      deletedAt: null,
      OR: salesIds?.map((v) => ({
        AND: [
          {
            tags: {
              some: {
                tagName: "salesId",
                deletedAt: null,
                tagValue: v?.toString(),
              },
            },
          },
          {
            tags: {
              some: {
                OR: [
                  {
                    tagName: "type",
                    deletedAt: null,
                    tagValue: "production",
                  },
                  {
                    tagName: "type",
                    deletedAt: null,
                    tagValue: "general",
                  },
                ],
              },
            },
          },
        ],
      })),
    },
    select: {
      id: true,
      tags: {
        where: {
          tagName: "salesId",
          tagValue: {
            in: salesIds.map((a) => String(a)),
          },
        },
        select: {
          tagValue: true,
        },
      },
    },
  });

  const resp: {
    [id in string]: {
      noteCount?: number;
    };
  } = {};

  salesIds.forEach((s) => {
    const noteCount = notes?.filter((a) =>
      a.tags?.some((t) => t.tagValue === String(s)),
    )?.length;
    if (noteCount)
      resp[String(s)] = {
        noteCount,
      };
  });
  return resp;
}
