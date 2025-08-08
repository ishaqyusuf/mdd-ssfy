import { authId, userId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { SalesPaymentStatus } from "../../../types";
import { getCustomerWallet } from "@gnd/sales/wallet";
export async function getCustomerWalletDta(accountNo) {
    return await getCustomerWallet(prisma, accountNo);
}
export async function fundCustomerWalletDta({
    accountId,
    amount,
    paymentMethod,
    description,
    squarePaymentId = null,
    checkNo = null,
}) {
    const tx = await prisma.customerTransaction.create({
        data: {
            amount,
            // walletId: accountId,
            wallet: {
                connect: {
                    id: accountId,
                },
            },
            author: {
                connect: {
                    id: await userId(),
                },
            },
            paymentMethod,
            description,
            meta: {
                checkNo,
            },
            status: "success" as SalesPaymentStatus,
            // squarePID: squarePaymentId ? squarePaymentId : undefined,
            squarePayment: squarePaymentId
                ? {
                      connect: {
                          id: squarePaymentId,
                      },
                  }
                : undefined,
        },
    });
    return tx;
}
export async function getCustomerWalletInfoDta(accountId) {
    const wallet = await getCustomerWallet(prisma, accountId);
    return {
        id: wallet.id,
        customerBalance: wallet.balance,
    };
}
export async function applyPaymentDta(
    walletId,
    transactionIds,
    paymentMethod,
    checkNo?,
) {
    const transactions = await prisma.salesPayments.findMany({
        where: {
            id: {
                in: transactionIds,
            },
        },
        select: {
            amount: true,
            orderId: true,
        },
    });
    const total = sum(transactions, "amount") * -1;

    const customerTx = await prisma.customerTransaction.create({
        data: {
            amount: total,
            walletId,
            authorId: await authId(),
            paymentMethod,
            status: "success" as SalesPaymentStatus,
            meta: {
                checkNo,
            },
        },
    });
    await prisma.salesPayments.updateMany({
        where: {
            id: { in: transactionIds },
        },
        data: {
            transactionId: customerTx.id,
            status: "success" as SalesPaymentStatus,
        },
    });
    await Promise.all(
        transactions.map(async (tx) => {
            await prisma.salesOrders.update({
                where: { id: tx.orderId },
                data: {
                    amountDue: {
                        decrement: tx.amount,
                    },
                },
            });
        }),
    );
}
