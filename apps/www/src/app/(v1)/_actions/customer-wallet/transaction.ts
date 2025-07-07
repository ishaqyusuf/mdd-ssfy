"use server";

import { prisma } from "@/db";
import { userId } from "../utils";
import { transformData } from "@/lib/utils";
import { getCustomerWallet } from "./wallet";

export async function creditTransaction(walletId, amount, description?) {
    //  const wallet = await getCustomerWallet(customerId);
    const tx = await prisma.customerTransaction.create({
        data: {
            // type: 'debit'
            ...transformData({}),
            amount,
            description,
            authorId: await userId(),
            walletId
            //   wallet: {
            //     connect: {
            //       id: walletId,
            //     },
            //   },
        }
    });
    await prisma.$queryRaw`UPDATE CustomerWallet SET balance=balance+${amount} WHERE id=${walletId}`;
    return tx;
}
export async function debitTransaction(walletId, amount, description?) {
    await prisma.$queryRaw`UPDATE CustomerWallet SET balance=balance-${amount} WHERE id=${walletId}`;
    console.log("DEBIT", amount);
    return await prisma.customerTransaction.create({
        data: {
            // type: 'debit'
            ...transformData({}),
            amount: amount * -1,
            description,
            authorId: await userId(),
            walletId
            //   wallet: {
            //     connect: {
            //       id: walletId,
            //     },
            //   },
        }
    });
}
