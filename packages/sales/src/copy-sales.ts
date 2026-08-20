import type { Db, TransactionClient } from "@gnd/db";
import { queueSalesInventoryLineItemsSync } from "./sales-inventory-sync-job";
import type { SalesType } from "./types";
import { generateSalesSlug } from "./utils/utils";

interface Props {
  db: Db;
  salesUid: string;
  as: SalesType;
  type: SalesType;
  author?: {
    name: string;
    id: number;
  };
  deferPostCommit?: (promise: Promise<unknown>) => void;
}

type CopySalesWriteClient = Db | TransactionClient;
type SalesOrdersDelegate = CopySalesWriteClient["salesOrders"];
const MAX_HISTORY_SLUG_COLLISION_RETRIES = 20;
const SALES_COPY_SOURCE_SELECT = {
  id: true,
  meta: true,
  shippingAddressId: true,
  billingAddressId: true,
  customerId: true,
  customerProfileId: true,
  grandTotal: true,
  deliveryOption: true,
  title: true,
  tax: true,
  subTotal: true,
  isDyke: true,
  taxPercentage: true,
  salesRep: { select: { id: true, name: true } },
  extraCosts: {
    select: {
      amount: true,
      label: true,
      percentage: true,
      tax: true,
      taxxable: true,
      totalAmount: true,
      type: true,
    },
  },
  taxes: {
    where: { deletedAt: null },
    select: { tax: true, taxCode: true, taxxable: true },
  },
  items: {
    where: { deletedAt: null },
    select: {
      description: true,
      discount: true,
      discountPercentage: true,
      dykeDescription: true,
      dykeProduction: true,
      multiDyke: true,
      multiDykeUid: true,
      qty: true,
      rate: true,
      meta: true,
      price: true,
      swing: true,
      total: true,
      taxPercenatage: true,
      tax: true,
      formSteps: {
        where: { deletedAt: null },
        select: {
          basePrice: true,
          meta: true,
          price: true,
          prodUid: true,
          qty: true,
          stepId: true,
          value: true,
          componentId: true,
          priceId: true,
        },
      },
      housePackageTool: {
        where: { deletedAt: null },
        select: {
          doorId: true,
          moldingId: true,
          dykeDoorId: true,
          meta: true,
          totalPrice: true,
          doorType: true,
          stepProductId: true,
          doors: {
            where: { deletedAt: null },
            select: {
              dimension: true,
              stepProductId: true,
              lhQty: true,
              rhQty: true,
              totalQty: true,
              lineTotal: true,
              jambSizePrice: true,
              doorPrice: true,
              meta: true,
              unitPrice: true,
              swing: true,
              doorType: true,
            },
          },
        },
      },
    },
  },
} as const;

export type CopySalesResult = {
  error?: string;
  id?: number;
  slug?: string;
  isDyke?: boolean;
};

export type CopySalesInTransactionProps = Omit<Props, "db"> & {
  db: CopySalesWriteClient;
};

async function getNextHistorySlugSequence(
  salesOrders: SalesOrdersDelegate,
  slug: string,
) {
  const prefix = `${slug}-hx`;
  const histories = await salesOrders.findMany({
    where: {
      deletedAt: {},
      orderId: {
        startsWith: prefix,
      },
    },
    select: {
      orderId: true,
    },
  });

  return (
    histories.reduce((highest, history) => {
      const suffix = history.orderId.slice(prefix.length);
      if (!/^\d+$/.test(suffix)) return highest;
      return Math.max(highest, Number(suffix));
    }, 0) + 1
  );
}

function formatHistorySlug(slug: string, sequence: number) {
  return `${slug}-hx${sequence.toString().padStart(2, "0")}`;
}

function isSalesOrderIdentityCollision(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  if (error.code !== "P2002") return false;

  const meta = "meta" in error ? error.meta : undefined;
  const target =
    meta && typeof meta === "object" && "target" in meta ? meta.target : "";
  const targetText = Array.isArray(target) ? target.join(",") : String(target);

  return targetText.includes("orderId") && targetText.includes("type");
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
    select: SALES_COPY_SOURCE_SELECT,
  });
  const isQuoteToInvoice = props.type === "quote" && as === "order";
  if (isQuoteToInvoice) {
    await db.$queryRaw`SELECT id FROM SalesOrders WHERE id = ${sale.id} FOR UPDATE`;
    const existing = await db.salesOrders.findFirst({
      where: {
        type: "order",
        deletedAt: null,
        meta: {
          path: "$.copySource.salesOrderId",
          equals: sale.id,
        },
      },
      select: { id: true, slug: true, isDyke: true },
    });
    if (existing) {
      return {
        id: existing.id,
        slug: existing.slug,
        isDyke: existing.isDyke ?? undefined,
      };
    }
  }
  const isHx = props.as?.endsWith("-hx");
  const salesRep = isHx ? (sale.salesRep ?? props.author) : props.author;
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

  let historySequence = isHx
    ? await getNextHistorySlugSequence(db.salesOrders, props.salesUid)
    : null;
  let orderId =
    historySequence === null
      ? await generateSalesSlug(as, db.salesOrders, salesRep.name)
      : formatHistorySlug(props.salesUid, historySequence);

  const createSalesOrder = (newOrderId: string) =>
    db.salesOrders.create({
      data: {
        orderId: newOrderId,
        slug: newOrderId,
        type: as,
        meta: {
          ...(sale.meta &&
          typeof sale.meta === "object" &&
          !Array.isArray(sale.meta)
            ? sale.meta
            : {}),
          ...(isQuoteToInvoice
            ? {
                copySource: {
                  salesOrderId: sale.id,
                  type: "quote",
                  kind: "quote-to-invoice",
                },
              }
            : {}),
        } as never,
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
              }),
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

  let newSales: Awaited<ReturnType<typeof createSalesOrder>>;
  for (let attempt = 0; ; attempt += 1) {
    try {
      newSales = await createSalesOrder(orderId);
      break;
    } catch (error) {
      if (
        historySequence === null ||
        !isSalesOrderIdentityCollision(error) ||
        attempt >= MAX_HISTORY_SLUG_COLLISION_RETRIES
      ) {
        throw error;
      }

      historySequence += 1;
      orderId = formatHistorySlug(props.salesUid, historySequence);
    }
  }

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
                      }),
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
      },
    ),
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
    const inventorySync = queueSalesInventoryLineItemsSync({
      salesOrderId: response.id,
      source: "copy-sales",
      triggeredByUserId: props.author?.id ?? null,
    });
    if (props.deferPostCommit) {
      props.deferPostCommit(inventorySync);
    } else {
      await inventorySync;
    }
  }
  return response;
}
