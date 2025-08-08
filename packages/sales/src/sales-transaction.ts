import { Db } from "@gnd/db";
import { SalesPaymentStatus } from "./constants";
import { formatMoney, sum } from "@gnd/utils";

export async function calculateSalesDueAmount(db: Db, salesId: number) {
  const order = await db.salesOrders.findUniqueOrThrow({
    where: {
      id: salesId,
    },
    select: {
      amountDue: true,
      grandTotal: true,
      id: true,
      payments: {
        where: {
          status: "success" as SalesPaymentStatus,
          deletedAt: null,
        },
        select: {
          amount: true,
          transaction: {
            where: {
              deletedAt: null,
            },
            select: {
              amount: true,
              type: true,
            },
          },
        },
      },
    },
  });
  const totalPaid = formatMoney(sum(order.payments, "amount"));
  const amountDue = formatMoney(order.grandTotal! - totalPaid);
  if (amountDue !== order.amountDue) {
    await db.salesOrders.update({
      where: { id: order.id },
      data: {
        amountDue,
      },
    });
    //    __salesPaymentUpdated();
    return true;
  }
  return false;
}
