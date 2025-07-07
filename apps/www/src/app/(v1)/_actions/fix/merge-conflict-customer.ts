"use server";

import { prisma } from "@/db";

export async function _mergeConflictCustomers() {
    return await _mergeConflicts();
    // const customers = await prisma.customers.findMany({
    //     where: {
    //         deletedAt: null
    //     },
    //     include: {
    //         wallet: true
    //     }
    // });
    // console.log(customers.length);
    // let customerByName: any = {};
    // customers.map(c => {
    //     let _name = c.name || c.businessName;
    //     let nameSlug: any = _name?.toLowerCase();
    //     if (!customerByName[nameSlug])
    //         customerByName[nameSlug] = {
    //             id: c.id,
    //             ids: [],
    //             walletId: c.walletId,
    //             walletIds: [],
    //             balance: c.wallet?.balance || 0
    //         };
    //     else {
    //         customerByName[nameSlug].ids.push(c.id);
    //         customerByName[nameSlug].walletIds.push(c.walletId);
    //         customerByName[nameSlug].balance = c.wallet?.balance || 0;
    //     }
    // });
    // const _dups = Object.values(customerByName).filter(b => b.ids.length > 1);
    // console.log(_dups);
    // console.log(_dups.length);
    // // return;
    // let cids: any = [];
    // await Promise.all(
    //     _dups.map(async ({ id, ids, balance, walletIds }) => {
    //         await Promise.all(
    //             [
    //                 prisma.salesPayments,
    //                 prisma.salesOrders,
    //                 prisma.addressBooks
    //             ].map(
    //                 async table =>
    //                     await (table as any).updateMany({
    //                         where: { customerId: { in: ids } },
    //                         data: { customerId: id }
    //                     })
    //             )
    //         );
    //         let wallet = await prisma.customerWallet.findFirst({
    //             where: {
    //                 customer: {
    //                     id
    //                 }
    //             }
    //         });
    //         if (!wallet)
    //             wallet = await prisma.customerWallet.create({
    //                 data: {
    //                     balance,
    //                     createdAt: new Date(),
    //                     customer: {
    //                         connect: { id }
    //                     },
    //                     meta: {},
    //                     updatedAt: new Date()
    //                 }
    //             });
    //         else
    //             await prisma.customerWallet.update({
    //                 where: {
    //                     id: wallet.id
    //                 },
    //                 data: {
    //                     balance
    //                 }
    //             });

    //         walletIds = walletIds.filter(w => w != wallet?.id).filter(Boolean);
    //         const u = await prisma.customerTransaction.updateMany({
    //             where: {
    //                 walletId: {
    //                     in: walletIds
    //                 }
    //                 // salesPayments: {
    //                 //     some: {
    //                 //         customerId: id
    //                 //     }
    //                 // }
    //             },
    //             data: {
    //                 walletId: wallet.id
    //             }
    //         });

    //         cids.push(...ids);
    //         console.log(u);
    //         // await prisma.customerWallet.update({
    //         //     where: {id: wallet.id},
    //         //     data: {
    //         //         transactions: {
    //         //             disconnect: {

    //         //             }
    //         //         }
    //         //     }
    //         // })
    //         // await prisma.customers.updateMany({
    //         //     where: {
    //         //         id: { in: ids }
    //         //     },
    //         //     data: {
    //         //         walletId: null,
    //         //         customerTypeId: null
    //         //     }
    //         // });

    //         console.log(
    //             await prisma.customerTransaction.count({
    //                 where: {
    //                     // wallet: {
    //                     //     customer: {
    //                     //         id: { in: ids }
    //                     //     }
    //                     // }
    //                     walletId: {
    //                         in: walletIds
    //                     }
    //                 }
    //             })
    //         );
    //         // await prisma.customerWallet.updateMany({
    //         //     where: {
    //         //         id: {
    //         //             in: walletIds
    //         //         }
    //         //     },
    //         //     data: {

    //         //     }
    //         // });
    //         await prisma.customers.updateMany({
    //             where: {
    //                 id: { in: ids }
    //             },
    //             data: {
    //                 deletedAt: new Date()
    //             }
    //         });
    //         // await prisma.salesPayments.updateMany({
    //         //     where: {customerId: {in: ids}},
    //         //     data: {customerId: id}
    //         // })
    //         // await prisma.salesOrders.updateMany({
    //         //     where: {customerId: {in: ids}},
    //         //     data: {customerId: id}
    //         // })
    //         // await prisma.addressBooks.updateMany({
    //         //     where: {customerId: {in: ids}},
    //         //     data: {customerId: id}
    //         // })
    //     })
    // );

    // console.log(customerByName);
}
export async function _mergeConflicts() {
    // const duplicates = await findDuplicates();
    // console.log(duplicates);
    // const gator = duplicates.find(f => f.id == 103);
    // console.log(gator);
}
async function findDuplicates() {
    const customers = await prisma.customers.findMany({
        where: {
            deletedAt: null
        },
        include: {
            wallet: true
        }
    });
    let customerByName: any = {};
    customers.map(c => {
        let _name = c.name || c.businessName;
        let nameSlug: any = _name?.toLowerCase();
        if (!customerByName[nameSlug])
            customerByName[nameSlug] = {
                id: c.id,
                ids: [],
                walletId: c.walletId,
                walletIds: [],
                balance: c.wallet?.balance || 0
            };
        else {
            customerByName[nameSlug].ids.push(c.id);
            customerByName[nameSlug].walletIds.push(c.walletId);
            customerByName[nameSlug].balance = c.wallet?.balance || 0;
        }
    });
    // const _dups = Object.values(customerByName).filter(b => b.ids.length > 1);
    // return _dups;
    return [];
}
