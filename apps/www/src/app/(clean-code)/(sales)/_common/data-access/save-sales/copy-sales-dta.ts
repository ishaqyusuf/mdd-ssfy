import { prisma } from "@/db";
import { SalesIncludeAll } from "../../utils/db-utils";
import { generateSalesId } from "./sales-id-dta";
import { authId } from "@/app/(v1)/_actions/utils";

export async function copySalesDta(orderId, as) {
    const sale = await prisma.salesOrders.findFirst({
        where: {
            orderId,
        },
        include: SalesIncludeAll,
    });
    let response: {
        error?;
        id?;
        slug?;
        isDyke?: boolean;
    } = {};
    const newSales = await prisma
        .$transaction((async (tx: typeof prisma) => {
            function connectOr(id) {
                return !id
                    ? undefined
                    : {
                          connect: {
                              id,
                          },
                      };
            }
            const orderId = await generateSalesId(as);
            const newSales = await tx.salesOrders.create({
                data: {
                    orderId,
                    slug: orderId,
                    type: as,
                    meta: sale.meta,
                    shippingAddress: connectOr(sale.shippingAddressId),
                    billingAddress: connectOr(sale.billingAddressId),
                    customer: connectOr(sale.customerId),
                    salesRep: connectOr(await authId()),
                    amountDue: sale.grandTotal,
                    deliveryOption: sale.deliveryOption,
                    grandTotal: sale.grandTotal,
                    salesProfile: connectOr(sale.customerProfileId),
                    title: sale.title,
                    tax: sale.tax,
                    subTotal: sale.subTotal,
                    isDyke: sale.isDyke,
                    taxPercentage: sale.taxPercentage,
                    taxes: {
                        createMany: {
                            data: sale.taxes.map(
                                ({ tax, taxCode, taxxable }) => ({
                                    taxCode,
                                    taxxable,
                                    tax,
                                })
                            ),
                        },
                    },
                },
            });
            const items = await Promise.all(
                sale.items.map(
                    async ({
                        description,
                        discount,
                        discountPercentage,
                        dykeDescription,
                        dykeProduction,
                        multiDyke,
                        multiDykeUid,
                        qty,
                        rate,
                        formSteps,
                        housePackageTool: hpt,
                        meta,
                        price,
                        swing,
                        salesDoors,
                        total,
                        taxPercenatage,
                        tax,
                    }) => {
                        const newItem = await tx.salesOrderItems.create({
                            data: {
                                description,
                                discount,
                                discountPercentage,
                                dykeDescription,
                                dykeProduction,
                                multiDyke,
                                multiDykeUid,
                                qty,
                                rate,
                                salesOrderId: newSales.id,
                                formSteps: !formSteps?.length
                                    ? undefined
                                    : {
                                          createMany: {
                                              data: formSteps.map(
                                                  ({
                                                      basePrice,
                                                      meta,
                                                      price,
                                                      prodUid,
                                                      qty,
                                                      stepId,
                                                      value,
                                                      componentId,
                                                      priceId,
                                                  }) => ({
                                                      basePrice,
                                                      componentId,
                                                      meta,
                                                      priceId,
                                                      price,
                                                      prodUid,
                                                      qty,
                                                      stepId,
                                                      value,
                                                      salesId: newSales.id,
                                                  })
                                              ),
                                          },
                                      },
                                housePackageTool: !hpt
                                    ? undefined
                                    : {
                                          create: {
                                              doorId: hpt.doorId,
                                              moldingId: hpt.moldingId,
                                              dykeDoorId: hpt.dykeDoorId,
                                              meta: hpt.meta,
                                              totalPrice: hpt.totalPrice,

                                              salesOrderId: newSales.id,
                                              doorType: hpt.doorType,
                                              stepProductId: hpt.stepProductId,
                                              doors: !hpt.doors?.length
                                                  ? undefined
                                                  : {
                                                        createMany: {
                                                            data: hpt.doors.map(
                                                                (d) => ({
                                                                    dimension:
                                                                        d.dimension,
                                                                    salesOrderId:
                                                                        newSales.id,
                                                                    stepProductId:
                                                                        d.stepProductId,
                                                                    lhQty: d.lhQty,
                                                                    rhQty: d.rhQty,
                                                                    totalQty:
                                                                        d.totalQty,
                                                                    lineTotal:
                                                                        d.lineTotal,
                                                                    jambSizePrice:
                                                                        d.jambSizePrice,
                                                                    doorPrice:
                                                                        d.doorPrice,
                                                                    meta: d.meta,
                                                                    unitPrice:
                                                                        d.unitPrice,
                                                                    swing: d.swing,
                                                                    doorType:
                                                                        d.doorType,
                                                                })
                                                            ),
                                                        },
                                                    },
                                          },
                                      },
                                meta,
                                price,
                                swing,
                                // salesDoors,
                                total,
                                taxPercenatage,
                                tax,
                            },
                        });
                        return newItem;
                    }
                )
            );
            response = {
                id: newSales.id,
                slug: newSales.slug,
                isDyke: newSales.isDyke,
            };
        }) as any)
        .catch((error) => {
            console.log(error);
            response = {
                error: error.message,
            };
        });

    return response;
}
