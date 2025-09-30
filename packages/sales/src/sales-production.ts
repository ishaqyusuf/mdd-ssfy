import { Db, Prisma } from "@gnd/db";
import { SalesProductionQueryParams, SalesQueryParamsSchema } from "./schema";
import { whereSales } from "./utils/where-queries";
import { composeQueryData, PageDataMeta } from "@gnd/utils/query-response";
import { RenturnTypeAsync, sum } from "@gnd/utils";
import {
  composeSalesStatKeyValue,
  dueDateAlert,
  overallStatus,
  statToKeyValue,
} from "./utils/utils";

export async function getSalesProductions(
  db: Db,
  query: SalesProductionQueryParams
) {
  const excludes: (keyof SalesProductionQueryParams)[] = [
    "sort",
    "size",
    "cursor",
    "workerId",
  ];
  const q = Object.entries(query)?.filter(
    ([a, b]) => b && !excludes.includes(a as any)
  );
  const queryCount = q?.length;
  const assignedToId = query.workerId || query.assignedToId;
  const getDueToday = async () =>
    await getProductionListAction(db, {
      salesType: "order",
      "production.assignedToId": assignedToId,
      "production.status": "due today",
      size: 99,
    });
  const getPastDue = async () =>
    await getProductionListAction(db, {
      salesType: "order",
      "production.assignedToId": assignedToId,
      "production.status": "past due",
      size: 99,
    });
  switch (query.show) {
    case "due-today":
      return await getDueToday();
      break;
    case "past-due":
      return await getPastDue();
      break;
  }

  const dueToday =
    !query.cursor && !queryCount ? (await getDueToday())?.data : [];

  const pastDue = !query.cursor && !queryCount ? (await getPastDue()).data : [];
  const customs = [...dueToday, ...pastDue].filter((a) => !a.completed);
  const excludesIds = customs.map((a) => a.id);
  if (!queryCount)
    return {
      data: customs,
      meta: {
        count: customs.length,
      } as PageDataMeta,
    };
  return await getProductionListAction(db, {
    ...query,
    salesType: "order",
    //   "production.status": "part assigned",
  });
  //   const others = prodList.filter((p) => !excludesIds?.includes(p.id));
}
async function getProductionListAction(db: Db, query: SalesQueryParamsSchema) {
  const where = whereSales(query);

  const whereAssignments: Prisma.OrderItemProductionAssignmentsWhereInput[] = (
    Array.isArray(where?.AND)
      ? where.AND?.map((a) => a.assignments?.some).filter(Boolean)
      : where?.assignments
        ? [where?.assignments]
        : []
  ) as any;
  const { response, searchMeta, queryProps } = await composeQueryData(
    query,
    where,
    db.salesOrders
  );
  const data = await db.salesOrders.findMany({
    ...queryProps,
    select: select(whereAssignments),
  });
  return response(data.map(transformProductionList));
}
const select = (whereAssignments?) =>
  ({
    customer: true,
    billingAddress: true,
    id: true,
    orderId: true,
    salesRep: {
      select: { name: true },
    },
    stat: true,
    itemControls: {
      select: {
        qtyControls: true,
        assignments: {
          select: {
            id: true,
          },
        },
      },
    },
    assignments: {
      where: {
        deletedAt: null,
        AND: whereAssignments?.length > 1 ? whereAssignments : undefined,
        ...(whereAssignments?.length == 1 ? whereAssignments[0] : {}),
      },
      select: {
        submissions: {
          where: {
            deletedAt: null,
          },
          select: {
            lhQty: true,
            qty: true,
            rhQty: true,
          },
        },
        lhQty: true,
        rhQty: true,
        qtyAssigned: true,
        dueDate: true,
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
    },
  }) satisfies Prisma.SalesOrdersSelect;
function transformProductionList(
  item: Prisma.SalesOrdersGetPayload<{
    select: ReturnType<typeof select>;
  }>

  //RenturnTypeAsync<typeof getProductionListAction>[number]
) {
  // item.assignments;
  const dueDate = item.assignments.map((d) => d.dueDate).filter(Boolean);

  const alert = dueDateAlert(dueDate);

  const totalAssigned = sum(
    item.assignments.map((p) => p.qtyAssigned || sum([p.lhQty, p.rhQty]))
  );
  const stats = composeSalesStatKeyValue(item.stat);

  const totalCompleted = sum(
    item.assignments.map((a) =>
      sum(a.submissions.map((s) => s.qty || sum([s.lhQty, s.rhQty])))
    )
  );
  const completed = totalAssigned == totalCompleted;
  // if (completed) alert.date = null;

  return {
    completed,
    totalAssigned,
    totalCompleted,
    orderId: item.orderId,
    alert,
    customer: item.customer?.name || item.customer?.businessName,

    salesRep: item?.salesRep?.name,
    assignedTo: Array.from(
      new Set(item.assignments.map((a) => a.assignedTo?.name))
    )
      .filter((a) => !!a)
      .join(" & "),
    uuid: item.orderId,
    id: item.id,
    stats,
    status: overallStatus(item.stat),
  };
}
