"use server";

import { SquarePaymentStatus } from "@/_v2/lib/square";
import { prisma } from "@/db";
import { CustomerTransactionType } from "./get-customer-tx-action";

export async function getCustomerWalletAction(accountNo) {
    const wallet = await prisma.customerWallet.upsert({
        where: {
            accountNo,
        },
        update: {},
        create: {
            balance: 0,
            accountNo,
        },
    });
    const balance = await prisma.customerTransaction.aggregate({
        _sum: {
            amount: true,
        },
        where: {
            walletId: wallet?.id,
            OR: [
                // {
                //     status: "CANCELED" as SquarePaymentStatus,
                //     statusNote: "Refund Wallet",
                // },
                {
                    type: "wallet" as CustomerTransactionType,
                    status: "success", // as SquarePaymentStatus,
                },
                // {
                //     status: "canceled",
                //     statusReason: "refund-wallet",
                // },
            ],
        },
    });
    const walletBalance = balance._sum.amount;
    return {
        ...wallet,
        walletBalance,
    };
}
