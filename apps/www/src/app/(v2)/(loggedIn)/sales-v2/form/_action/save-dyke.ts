"use server";

import { saveSalesComponentPricingDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-form-dta";
import { saveSalesTaxDta } from "@/app/(clean-code)/(sales)/_common/data-access/sales-tax.persistent";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { dealerSession } from "@/app/(v1)/_actions/utils";
import {
    ComponentPrice,
    DykeSalesDoors,
    HousePackageTools,
    prisma,
    Prisma,
} from "@/db";
import { lastId } from "@/lib/nextId";

import { generateSalesIdDac } from "../../../sales/_data-access/generate-sales-id.dac";
import { DykeForm } from "../../type";

export async function saveDykeSales(data: DykeForm) {
    const dealerMode = await dealerSession();
    const tx =
        // await prisma.$transaction(
        async (tx) => {
            const {
                id,
                customerId,
                shippingAddressId,
                salesRepId,
                pickupId,
                prodId,
                billingAddressId,
                customerProfileId,
                // salesProfileId,
                ...rest
            } = data.order;
            // console.log(rest);
            // delete (rest as any).customer;
            function connect(id) {
                if (!id) return undefined;
                return { connect: { id } };
            }
            // if (data.order.id) {
            //     await prisma.salesOrderItems.updateMany({
            //         where: {
            //             salesOrderId: data.order.id,
            //             id: {
            //                 notIn: data.itemArray
            //                     ?.filter((i) => i.item?.id)
            //                     .map((i) => i.item.id),
            //             },
            //         },
            //         data: {
            //             deletedAt: new Date(),
            //         },
            //     });
            // }
            const order = data.order.id
                ? await prisma.salesOrders.update({
                      where: { id: data.order.id },
                      data: {
                          ...rest,
                          customerProfileId,
                          updatedAt: new Date(),
                          status: dealerMode ? "Evaluating" : rest.status,
                      } as any,
                  })
                : await prisma.salesOrders.create({
                      data: {
                          ...(rest as any),
                          //   customerProfileId,
                          salesProfile: connect(customerProfileId),
                          // salesRepId: data.salesRep?.id,
                          ...(await generateSalesIdDac(rest)),
                          updatedAt: new Date(),
                          customer: connect(customerId),
                          salesRep: connect(data.salesRep?.id),
                          billingAddress: connect(billingAddressId),
                          shippingAddress: connect(shippingAddressId),
                      },
                  });
            let lastItemId = await lastId(tx.salesOrderItems);
            let latOldItemId = lastItemId;
            let lastHptId = await lastId(tx.housePackageTools);
            let lastDoorId = await lastId(tx.dykeSalesDoors);
            let lastShelfItemId = await lastId(tx.dykeSalesShelfItem);
            let lastStepFormId = await lastId(tx.dykeStepForm);
            const createItems: any[] = [];
            const createShelfItems: any[] = [];
            const createStepForms: any[] = [];
            const createHpts: Partial<HousePackageTools>[] = [];
            const createDoors: Partial<DykeSalesDoors>[] = [];
            const createPrices: Partial<ComponentPrice>[] = [];

            const ids = {
                itemIds: [] as number[],
                shelfIds: [] as number[],
                stepFormsIds: [] as number[],
                doorsIds: [] as number[],
                housePackageIds: [] as number[],
            };
            const itemIds = [];
            await Promise.all(
                data.itemArray.map(async (arr, index) => {
                    const isShelfItem = arr.item.meta.doorType == "Shelf Items";
                    let {
                        formStepArray,
                        shelfItemArray,
                        id: itemId,
                        housePackageTool,
                        ...item
                    } = arr.item;
                    if (!housePackageTool) housePackageTool = {} as any;
                    // arr.item.shelfItemArray[0].
                    const newItem = !itemId;

                    item.meta.lineIndex = index;
                    if (!itemId) itemId = ++lastItemId;
                    else {
                        itemIds.push(itemId);
                    }
                    const shelfMode = !housePackageTool?.doorType;
                    if (newItem) {
                        createItems.push({
                            ...item,
                            id: itemId,
                            salesOrderId: order.id,
                        });
                    } else {
                        await prisma.salesOrderItems.update({
                            where: { id: itemId },
                            data: {
                                ...item,
                                deletedAt: null,
                                updatedAt: new Date(),
                            } as any,
                        });
                    }
                    ids.itemIds.push(itemId);
                    if (isShelfItem) {
                        await Promise.all(
                            shelfItemArray.map(
                                async ({
                                    // categoryIds,
                                    productArray,
                                    // categoryId,
                                }) => {
                                    await Promise.all(
                                        productArray.map(
                                            async ({
                                                item: { id: prodId, ...shelf },
                                            }) => {
                                                const newShelf = !prodId;
                                                if (!prodId)
                                                    prodId = ++lastShelfItemId;
                                                // shelf.meta.categoryIds =
                                                // categoryIds;
                                                // shelf.categoryId = categoryId;
                                                shelf.salesOrderItemId = itemId;

                                                if (newShelf) {
                                                    createShelfItems.push({
                                                        id: prodId,
                                                        ...shelf,
                                                    });
                                                } else {
                                                    await prisma.dykeSalesShelfItem.update(
                                                        {
                                                            where: {
                                                                id: prodId,
                                                            },
                                                            data: {
                                                                ...shelf,
                                                                deletedAt: null,
                                                                updatedAt:
                                                                    new Date(),
                                                            } as any,
                                                        },
                                                    );
                                                }
                                                ids.shelfIds.push(prodId);
                                            },
                                        ),
                                    );
                                },
                            ),
                        );
                    } else {
                        let {
                            id: hptId,
                            doors,
                            door,
                            molding,
                            salesOrderId,
                            orderItemId,
                            _doorForm = {},
                            _doorFormDefaultValue,
                            doorId,
                            stepProduct,
                            priceData,
                            ...hptData
                        } = housePackageTool; // || ({} as any as typeof<housePackageTool>);

                        doors = []; //Object.values(_doorForm);
                        Object.entries(_doorForm).map(
                            ([
                                dimension,
                                { priceData: doorPriceData, ...doorData },
                            ]) => {
                                if (doorData && typeof doorData == "object") {
                                    createPrices.push({
                                        ...doorPriceData,
                                        salesItemId: itemId,
                                        salesId: order.id,
                                    });
                                    doors?.push({
                                        ...(doorData || {}),
                                        dimension,
                                        doorType: item?.meta?.doorType,
                                    } as any);
                                }
                            },
                        );

                        if (doors?.length || hptData?.doorType == "Moulding") {
                            const newHpt = !hptId;

                            if (!hptId && newHpt) hptId = ++lastHptId;
                            hptData.meta = hptData.meta || {};
                            createPrices.push({
                                ...priceData,
                                salesItemId: itemId,
                                salesId: order.id,
                            });
                            if (newHpt) {
                                createHpts.push({
                                    ...hptData,
                                    id: hptId,
                                    salesOrderId: order.id,
                                    orderItemId: itemId,
                                    meta: hptData.meta as any,
                                });
                            } else {
                                await prisma.housePackageTools.update({
                                    where: { id: hptId },
                                    data: {
                                        ...(hptData as any),
                                        deletedAt: null,
                                        updatedAt: new Date(),
                                    },
                                });
                            }
                            await Promise.all(
                                (doors || [])?.map(async (door) => {
                                    if (!door.lhQty && !door.rhQty) return null;
                                    door.meta = door.meta || {};
                                    // console.log("YES DOOR");
                                    door.salesOrderId = order.id;
                                    door.salesOrderItemId = itemId;
                                    let {
                                        id: doorId,
                                        housePackageToolId,
                                        ...doorData
                                    } = door;
                                    let newDoor = !doorId;
                                    if (newDoor) doorId = ++lastDoorId;
                                    // console.log({ doorId, newDoor });
                                    // if (!doorData.lhQty) doorData.lhQty = 0;
                                    // if (!doorData.rhQty) doorData.rhQty = 0;
                                    if (newDoor)
                                        createDoors.push({
                                            ...doorData,
                                            housePackageToolId: hptId,
                                        });
                                    else {
                                        // console.log(doorId);
                                        await prisma.dykeSalesDoors.update({
                                            where: { id: doorId },
                                            data: {
                                                ...(doorData as any),
                                                deletedAt: null,
                                                updatedAt: new Date(),
                                            },
                                        });
                                    }
                                    ids.doorsIds.push(doorId);
                                }),
                            );
                            if (hptId) ids.housePackageIds.push(hptId as any);
                        }
                    }
                    await Promise.all(
                        formStepArray.map(
                            async ({
                                item: {
                                    id: stepFormId,
                                    priceData,
                                    priceId,
                                    ...stepForm
                                },
                                step,
                            }) => {
                                const newStep = !stepFormId;
                                if (newStep) stepFormId = ++lastStepFormId;
                                stepForm.salesId = order.id;
                                stepForm.salesItemId = itemId;
                                // stepForm.price
                                if (!newStep) {
                                    await prisma.dykeStepForm.update({
                                        where: { id: stepFormId },
                                        data: {
                                            ...(stepForm as any),
                                            deletedAt: null,
                                            updatedAt: new Date(),
                                        },
                                    });
                                } else {
                                    createStepForms.push({
                                        id: stepFormId,
                                        ...stepForm,
                                    });
                                }
                                ids.stepFormsIds.push(stepFormId);
                            },
                        ),
                    );
                }),
            );
            // console.log(ids.doorsIds);
            // console.log({ createDoors });
            const _items = await prisma.salesOrderItems.findMany({
                where: {
                    salesOrderId: order.id,
                    deletedAt: {
                        not: null,
                    },

                    // id: {
                    //     notIn: itemIds,
                    // },
                },
            });

            async function _deleteWhere(
                t,
                notIn: number[] = [],
                items = false,
            ) {
                // return;
                const where: any = items
                    ? { salesOrderId: order.id }
                    : {
                          salesOrderItem: {
                              salesOrderId: order.id,
                          },
                      };
                where.id = {
                    notIn,
                };
                // console.log(where);
                await t.updateMany({
                    where,
                    data: {
                        deletedAt: new Date(),
                    },
                });
            }

            await _deleteWhere(tx.dykeStepForm, ids.stepFormsIds);

            await _deleteWhere(tx.dykeSalesShelfItem, ids.shelfIds);

            await _deleteWhere(tx.dykeSalesDoors, ids.doorsIds);

            await _deleteWhere(tx.housePackageTools, ids.housePackageIds);

            await _deleteWhere(tx.salesOrderItems, ids.itemIds, true);
            // console.log("INSERTING>>>>>>");
            // console.log(createItems);

            await Promise.all(
                [
                    {
                        t: prisma.salesOrderItems,
                        data: createItems,
                        ids: ids.itemIds,
                        where: { salesOrderId: order.id },
                    },
                    {
                        t: prisma.dykeStepForm,
                        data: createStepForms,
                        ids: ids.stepFormsIds,
                        where: { salesId: order.id },
                    },
                    {
                        t: prisma.dykeSalesShelfItem,
                        data: createShelfItems,
                        ids: ids.shelfIds,
                        where: {
                            salesOrderItem: {
                                salesOrderId: order.id,
                            },
                        },
                    },
                    {
                        t: prisma.housePackageTools,
                        data: createHpts,
                        ids: ids.housePackageIds,
                        where: {
                            salesOrderItem: {
                                salesOrderId: order.id,
                            },
                        },
                    },
                    {
                        t: prisma.dykeSalesDoors,
                        data: createDoors,
                        ids: ids.doorsIds,
                        where: {
                            salesOrderItem: {
                                salesOrderId: order.id,
                            },
                        },
                    },
                ]
                    .filter((p) => p.data.length)
                    .map(async (i, _) => {
                        // await timeout(1000 * (_ + 1));
                        await (i.t as any).createMany({
                            data: i.data,
                        });

                        // await (i.t as any).deleteMany({
                        //     where: {
                        //         id: {
                        //             notIn: i.ids,
                        //         },
                        //         ...i.where,
                        //     },
                        // });
                    }),
            );
            await saveSalesTaxDta(data, order.id);

            await saveSalesComponentPricingDta(createPrices, order.id);
            return { order, createHpts };
        };
    // const resp = await prisma.$transaction(tx, {
    //     maxWait: 5000,
    //     timeout: 15000,
    //     isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    // });
    const resp = await tx(prisma);
    // _revalidate("salesV2Form");
    return resp;
    // return await tx(prisma);
}
