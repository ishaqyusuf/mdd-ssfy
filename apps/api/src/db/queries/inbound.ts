import type {
  InboundQuerySchema,
  SalesQueryParamsSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { InboundFilterStatus, NoteTagNames } from "@gnd/utils/constants";
import { getSales } from "./sales";
import type { PageFilterData } from "@api/type";

export async function getInboundStatuses(
  ctx: TRPCContext,
  salesIds?: number[],
) {
  const notes = await ctx.db.notePad.findMany({
    where: {
      AND: [
        {
          tags: {
            some: {
              tagName: "salesId",
              ...(salesIds?.length && {
                tagValue: {
                  in: salesIds.map((a) => String(a)),
                },
              }),
            },
          },
        },
        {
          tags: {
            some: {
              tagName: "inboundStatus",
            },
          },
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      tags: {
        select: {
          tagName: true,
          tagValue: true,
        },
        where: {
          tagName: {
            in: ["salesId", "inboundStatus"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
  const statuses = notes
    .map((n) => {
      const s = n.tags.find(
        (a) => (a.tagName as NoteTagNames) === "inboundStatus",
      );
      const orderId = Number(
        n.tags.find((a) => (a.tagName as NoteTagNames) === "salesId")?.tagValue,
      );
      return {
        orderId,
        status: s?.tagValue as InboundFilterStatus,
      };
    })
    .filter((s) => s.orderId);
  return statuses.filter(
    (a, i) => i == statuses?.findIndex((s) => s.orderId == a.orderId),
  );
}

export async function getInbounds(ctx: TRPCContext, query: InboundQuerySchema) {
  const status = query.status;
  const salesQuery: SalesQueryParamsSchema = {
    salesType: "order",
    q: query?.q,
  };

  let statusList: any = null;
  if (status != "total" && status) {
    statusList = await getInboundStatuses(ctx);

    const matchingSales = statusList.filter((a) => a.status === status);
    const salesIds = matchingSales.map((a) => a.orderId);
    salesQuery.salesIds = salesIds;
    if (!salesIds.length)
      return {
        data: [],
        meta: {
          count: 0,
          cursor: null,
        },
      };
  }

  const sales = await getSales(ctx, salesQuery);
  if (!statusList)
    statusList = await getInboundStatuses(
      ctx,
      sales.data.map((a) => a.id),
    );
  // console.log(sales.meta);
  return {
    ...sales,
    data: sales.data.map((sale) => ({
      ...sale,
      inboundStatus: statusList?.find((a) => a.orderId == sale?.id)?.status,
    })),
  };
}
export async function getInboundSummary(
  ctx: TRPCContext,
  query: InboundQuerySchema,
) {
  const data = await getInboundStatuses(ctx);
  switch (query.status) {
    case "total":
      return data.length;
      break;
    default:
      return data.filter((a) => a?.status === query.status)?.length;
  }
}

export async function getInboundFilters(ctx: TRPCContext) {
  type FilterData = PageFilterData<keyof InboundQuerySchema>;
  const resp = [
    {
      label: "Search",
      type: "input",
      value: "q",
    },
  ] as FilterData[];
}
