import { Db } from "@gnd/db";
import {
  generateHistorySlug,
  generateSalesSlug,
  SalesIncludeAll,
} from "./utils/utils";
import { SalesType } from "./types";

interface Props {
  db: Db;
  salesUid: string;
  as: SalesType;
  author?: {
    name: string;
    id: number;
  };
}
export async function copySales(props: Props) {
  const { db, salesUid, as } = props;
  const sale = await db.salesOrders.findFirstOrThrow({
    where: {
      orderId: salesUid,
    },
    include: SalesIncludeAll,
  });
  let response: {
    error?;
    id?;
    slug?;
    isDyke?: boolean;
  } = {};
  const isHx = props.as?.endsWith("-hx");
  const salesRep = isHx ? sale?.salesRep! : props.author!;
  const newSales = await db
    .$transaction((async (tx: typeof db) => {
      function connectOr(id) {
        return !id
          ? undefined
          : {
              connect: {
                id,
              },
            };
      }

      const orderId = isHx
        ? await generateHistorySlug(db, props.salesUid)
        : await generateSalesSlug(as, db.salesOrders, salesRep.name);

      const newSales = await tx.salesOrders.create({
        data: {
          orderId,
          slug: orderId,
          type: as,
          meta: sale.meta as any,
          shippingAddress: connectOr(sale.shippingAddressId),
          billingAddress: connectOr(sale.billingAddressId),
          customer: connectOr(sale.customerId),
          salesRep: connectOr(salesRep.id),
          amountDue: sale.grandTotal,
          deliveryOption: sale.deliveryOption,
          grandTotal: sale.grandTotal,
          salesProfile: connectOr(sale.customerProfileId),
          title: sale.title,
          tax: sale.tax,
          subTotal: sale.subTotal,
          isDyke: sale.isDyke,
          taxPercentage: sale.taxPercentage,
          extraCosts: {
            createMany: {
              data: sale.extraCosts.map(
                ({
                  amount,
                  label,
                  percentage,
                  tax,
                  taxxable,
                  totalAmount,
                  type,
                }) => ({
                  amount,
                  label,
                  percentage,
                  tax,
                  taxxable,
                  totalAmount,
                  type,
                })
              ),
            },
          },
          taxes: {
            createMany: {
              data: sale.taxes.map(({ tax, taxCode, taxxable }) => ({
                taxCode,
                taxxable,
                tax,
              })),
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
                  : ({
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
                    } as any),
                housePackageTool: !hpt
                  ? undefined
                  : ({
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
                                data: hpt.doors.map((d) => ({
                                  dimension: d.dimension,
                                  salesOrderId: newSales.id,
                                  stepProductId: d.stepProductId,
                                  lhQty: d.lhQty,
                                  rhQty: d.rhQty,
                                  totalQty: d.totalQty,
                                  lineTotal: d.lineTotal,
                                  jambSizePrice: d.jambSizePrice,
                                  doorPrice: d.doorPrice,
                                  meta: d.meta,
                                  unitPrice: d.unitPrice,
                                  swing: d.swing,
                                  doorType: d.doorType,
                                })),
                              },
                            },
                      },
                    } as any),
                meta: meta as any,
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
        isDyke: newSales.isDyke as any,
      };
    }) as any)
    .catch((error) => {
      response = {
        error: error.message,
      };
    });
  return response;
}
