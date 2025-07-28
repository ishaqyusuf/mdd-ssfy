import { sum } from "@gnd/utils";
import { Db, Qty, SalesInfoItem, SalesInformation } from "../types";
import { Prisma } from "@prisma/client";
import { updateSalesItemStats } from "./update-sales-item-stat";
import { updateSalesStatAction } from "./update-sales-stat";

interface CreateSalesAssignmentProps {
  submit?: boolean;
  salesId: number;
  assignedToId?: number;
  authorId: number;
  updateStats?: boolean;
  dueDate?;
  items: {
    itemInfo: SalesInfoItem;
    qty: Qty;
  }[];
}
export async function createSalesAssignmentAction(
  db: Db,
  //   saleData: SalesInformation,
  args: CreateSalesAssignmentProps
) {
  await db.orderItemProductionAssignments.createMany({
    data: args.items.map(
      (item) =>
        ({
          laborCost: item.itemInfo.unitLabor,
          shelfItemId: item.itemInfo.shelfId || undefined,
          salesDoorId: item.itemInfo.doorId || undefined,
          orderId: args.salesId,
          lhQty: item.qty.lh,
          rhQty: item.qty.rh,
          qtyAssigned: item.qty.qty || sum([item.qty.lh, item.qty.rh]),
          assignedToId: args.assignedToId || undefined,
          dueDate: args.dueDate,
          assignedById: args.authorId,
          itemId: item.itemInfo.itemId!,
          salesItemControlUid: item.itemInfo.controlUid,
        }) satisfies Prisma.OrderItemProductionAssignmentsCreateManyInput
    ),
  });
  if (args.updateStats) {
    await Promise.all(
      args.items.map(async (item) => {
        await updateSalesItemStats(
          {
            uid: item.itemInfo.controlUid,
            salesId: args.salesId,
            type: "prodAssigned",
            itemTotal: item.itemInfo.analytics?.stats?.qty?.qty,
            qty: {
              ...item.qty,
            },
          },
          db
        );
      })
    );
    await updateSalesStatAction(
      {
        salesId: args.salesId,
        types: ["prodAssigned"],
      },
      db
    );
  }
}
interface CreateSalesAssignmentSubmissionProps {
  salesId: number;
  authorId: number;
  updateStats?: boolean;
  items: {
    itemInfo: SalesInfoItem;
    assignmentId: number;
    qty: Qty;
  }[];
}
export async function createSalesAssignmentSubmission(db: Db) {}
