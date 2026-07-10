import type { Db, TransactionClient } from "@gnd/db";
import { queueSalesInventoryLineItemsSync } from "./sales-inventory-sync-job";
import type { SalesType } from "./types";
import { SalesIncludeAll, generateSalesSlug } from "./utils/utils";

interface Props {
  db: Db;
  salesUid: string;
  as: SalesType;
  type: SalesType;
  author?: {
    name: string;
    id: number;
  };
}

type CopySalesWriteClient = Db | TransactionClient;
type SalesOrdersDelegate = CopySalesWriteClient["salesOrders"];

export type CopySalesResult = {
  error?: string;
  id?: number;
  slug?: string;
  isDyke?: boolean;
};

export type CopySalesInTransactionProps = Omit<Props, "db"> & {
  db: CopySalesWriteClient;
};

async function generateHistorySlugForSalesOrders(
  salesOrders: SalesOrdersDelegate,
  slug: string,
) {
  const count = await salesOrders.count({
    where: {
      deletedAt: {},
      orderId: {
        startsWith: `${slug}-hx`,
      },
    },
  });
  return `${slug}-hx${(count + 1)?.toString()?.padStart(2, "0")}`;
}

export async function copySalesInTransaction(
  props: CopySalesInTransactionProps,
): Promise<CopySalesResult> {
  const { db, salesUid, as } = props;
  const sale = await db.salesOrders.findFirstOrThrow({
    where: {
      orderId: salesUid,
      type: props.type,
    },
    include: SalesIncludeAll,
  });
  const isHx = props.as?.endsWith("-hx");
  const salesRep = isHx ? sale.salesRep : props.author;
  if (!salesRep) {
    throw new Error("Sales rep is required to copy this sales document.");
  }

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
    ? await generateHistorySlugForSalesOrders(db.salesOrders, props.salesUid)
    : await generateSalesSlug(as, db.salesOrders, salesRep.name);

  const newSales = await db.salesOrders.create({
    data: {
      orderId,
      slug: orderId,
      type: as,
      meta: sale.meta as never,
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

  await Promise.all(
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
        const newItem = await db.salesOrderItems.create({
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
                } as never),
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
                } as never),
            meta: meta as never,
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

  return {
    id: newSales.id,
    slug: newSales.slug,
    isDyke: newSales.isDyke as boolean | undefined,
  };
}

export async function copySales(props: Props) {
  const { db } = props;
  let response: CopySalesResult = {};

  try {
    response = await db.$transaction((tx) =>
      copySalesInTransaction({
        ...props,
        db: tx,
      }),
    );
  } catch (error) {
    response = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (!response.error && response.id) {
    await queueSalesInventoryLineItemsSync({
      salesOrderId: response.id,
      source: "copy-sales",
      triggeredByUserId: props.author?.id ?? null,
    });
  }
  return response;
}
