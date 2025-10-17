"use server";

import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { Customers, prisma } from "@/db";

export async function mergeCustomersAction(customerIds) {
    const mergeToCustomerId = customerIds.sort((a, b) => a - b)?.[0];

    const duplicateIds = customerIds.filter((id) => id != mergeToCustomerId);

    let customer = await prisma.customers.findFirst({
        where: { id: mergeToCustomerId },
        include: {
            wallet: true,
        },
    });
    const wallet =
        customer?.wallet ||
        (await prisma.customerWallet.create({
            data: {
                balance: 0,
                meta: {},
                customer: {
                    connect: {
                        id: mergeToCustomerId,
                    },
                },
            },
        }));
    if (!customer || !wallet) throw Error();

    const where = { customerId: { in: duplicateIds } };
    const update = {
        where,
        data: { customerId: mergeToCustomerId, updateAt: new Date() },
    };
    const getIds = async (table) => {
        return (await table.findMany({ where })).map(({ id }) => id);
    };
    const updateCustomerId = async (table) => {
        const ids = await getIds(table);
        await table.updateMany({
            where: { id: { in: ids } },
            data: { customerId: mergeToCustomerId, updatedAt: new Date() },
        });
    };
    await updateCustomerId(prisma.addressBooks);
    await updateCustomerId(prisma.salesOrders);
    await updateCustomerId(prisma.salesPayments);
    // await prisma.salesOrders.updateMany(update);
    // await prisma.salesPayments.updateMany(update);

    const wallets = await prisma.customerWallet.findMany({
        where: {
            customer: {
                id: { in: duplicateIds },
            },
        },
    });
    const dupWalIds = wallets.map(({ id }) => id);
    // await prisma.customerTransaction.updateMany({
    //     where: {
    //         id: { in: dupWalIds },
    //     },
    //     data: {
    //         walletId: wallet.id as any,
    //     },
    // });
    // await prisma.customerWallet
    // await prisma.customers.updateMany({
    //     where: {
    //         id: { in: duplicateIds },
    //     },
    //     data: {
    //         walletId: null,
    //     },
    // });
    let amount = 0;
    wallets.map(({ balance }) => (amount += balance || 0));
    await prisma.customerWallet.update({
        where: { id: wallet.id as any },
        data: {
            balance: {
                increment: amount,
            },
        },
    });
    await prisma.customerTransaction.deleteMany({
        where: {
            walletId: { in: dupWalIds },
        },
    });
    await prisma.customers.updateMany({
        where: { id: { in: duplicateIds } },
        data: {
            deletedAt: new Date(),
        },
    });
    _revalidate("customers");
}
