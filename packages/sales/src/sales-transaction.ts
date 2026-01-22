import { Db } from "@gnd/db";
import { SalesPaymentStatus } from "./constants";
import { consoleLog, formatMoney, sum } from "@gnd/utils";

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
          // deletedAt: null,
          // transaction: {
          //   status: "success" as SalesPaymentStatus,
          // },
        },
        select: {
          amount: true,
          status: true,
          transaction: {
            where: {
              status: {
                in: ["completed", "success"] as SalesPaymentStatus[],
              },
              deletedAt: null,
            },
            select: {
              amount: true,
              type: true,
              status: true,
              // salesPayments: {}
            },
          },
        },
      },
    },
  });
  const totalPaid = formatMoney(sum(order.payments, "amount"));
  // consoleLog(
  //   "payments...",
  //   order.payments.map(({ transaction: tx }) => tx),
  // );
  // return false;

  const amountDue = formatMoney(order.grandTotal! - totalPaid);
  if (amountDue !== order.amountDue) {
    await db.salesOrders.update({
      where: { id: order.id },
      data: {
        amountDue,
      },
    });
    return true;
  }
  return false;
}
