"use server";

import { prisma } from "@/db";
import { toFixed } from "@/lib/use-number";
import { ISalesSetting } from "@/types/post";
import { ISalesPayment } from "@/types/sales";

import {
    creditTransaction,
    debitTransaction,
} from "../../../_actions/customer-wallet/transaction";
import { getCustomerWallet } from "../../../_actions/customer-wallet/wallet";
import { getSettingAction } from "../../../_actions/settings";

export interface PaymentOrderProps {
    id;
    amountDue;
    amountPaid;
    grandTotal;
    customerId;
    orderId;
    paymentOption;
    checkNo;
    salesRepId;
}
export interface ApplyPaymentProps {
    orders: PaymentOrderProps[];
    credit;
    debit;
    balance?;
}
export async function applyPaymentAction({
    orders,
    credit,
    debit,
    balance,
}: ApplyPaymentProps) {
    const settings: ISalesSetting = await getSettingAction("sales-settings");

    const wallet = await getCustomerWallet(orders[0]?.customerId);
    await creditTransaction(wallet.id, credit, "credit");

    const transaction = await debitTransaction(
        wallet.id,
        debit,
        `Payment for order: ${orders.map((o) => o.orderId)}`,
    );
    let commissionPercentage = settings?.meta?.commission?.percentage || 0;
    await Promise.all(
        orders.map(async (o) => {
            let commission =
                commissionPercentage > 0
                    ? (commissionPercentage / 100) * o.grandTotal
                    : null;

            const payments = await prisma.salesPayments.create({
                data: {
                    transactionId: transaction.id,
                    amount: +o.amountPaid,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    orderId: o.id,
                    // customerId: o.customerId,
                    //   order: {
                    //     connect: o.orderId,
                    //   },
                    meta: {
                        paymentOption: o.paymentOption,
                        checkNo: o.checkNo,
                    },
                    commissions: commission
                        ? {
                              create: {
                                  amount: commission,
                                  createdAt: new Date(),
                                  updatedAt: new Date(),
                                  status: "",
                                  user: {
                                      connect: {
                                          id: o.salesRepId,
                                      },
                                  },
                                  order: {
                                      connect: { id: o.id },
                                  },
                              },
                          }
                        : undefined,
                },
            });
        }),
    );
    await Promise.all(
        orders.map(async ({ id, amountDue }) => {
            await prisma.salesOrders.update({
                where: {
                    id,
                },
                data: {
                    amountDue,
                    updatedAt: new Date(),
                },
            });
        }),
    );
    return true;
}
export async function deleteSalesPayment({
    id,
    amount,
    orderId,
    amountDue,
    refund,
}) {
    await prisma.salesPayments.delete({
        where: { id },
    });

    const sales = await prisma.salesOrders.update({
        where: {
            id: orderId,
        },
        data: {
            amountDue,
        },
        include: {
            customer: true,
        },
    });
    const wallet = await getCustomerWallet(sales.customerId);
    await creditTransaction(
        wallet.id,
        refund ? amount : 0,
        refund
            ? `Sales Payment deleted and refunded (${sales.orderId})`
            : `Sales Payment deleted with no refund (${sales.orderId}). $${amount}`,
    );
}
export async function fixPaymentAction({
    amountDue,
    id,
}: {
    id: number;
    amountDue: number;
}) {
    await prisma.salesOrders.update({
        where: { id },
        data: {
            amountDue,
        },
    });
}
export async function fixSalesPaymentAction(id) {
    const order = await prisma.salesOrders.findUnique({
        where: {
            id,
        },
        include: {
            payments: true,
        },
    });
    let totalPaid = 0;
    order?.payments?.map((p) => {
        totalPaid += p.amount || 0;
    });

    let amountDue = (order?.grandTotal || 0) - totalPaid;
    await fixPaymentAction({
        id,
        amountDue: +toFixed(amountDue),
    });
}
export async function updatePaymentTerm(id, paymentTerm, goodUntil) {
    await prisma.salesOrders.update({
        where: { id },
        data: {
            paymentTerm,
            goodUntil,
        },
    });
    // const d = await prisma.salesOrders.findUnique({
    //   where: { id },
    // });
    // if (!d) throw new Error("Order Not Found");
    // const meta: ISalesOrderMeta = d.meta as any;
    // meta.pa
}
