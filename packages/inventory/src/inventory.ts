import { Prisma } from "@gnd/db";
import type { Db } from "@gnd/db";
import type {
  GetInventoryCategories,
  InventoryCategories,
  InventoryCategoryForm,
  InventoryForm,
  InventoryProductKind,
  InventoryProductKindReview,
  StockAllocationReview,
  ApproveStockAllocation,
  RejectStockAllocation,
  BulkApproveStockAllocation,
  InboundItemIssueForm,
  ResolveInboundItemIssue,
  InventorySupplierForm,
  InventorySuppliers,
  SupplierVariantForm,
  InventoryList,
  UpdateCategoryVariantAttribute,
  UpdateSubComponent,
  UpdateCategoryStockMode,
  UpdateInventoryProductKind,
  UpdateCategoryProductKind,
  VariantForm,
} from "./schema";
import {
  composeQuery,
  composeQueryData,
  queryBuilder,
} from "@gnd/utils/query-response";
import { INVENTORY_STATUS } from "./constants";
import type { StockModes } from "./constants";
import {
  formatMoney,
  generateRandomNumber,
  generateRandomString,
  sum,
} from "@gnd/utils";
import { TABLE_NAMES } from "./application/import/strategies/handcrafted-importer";
import { z } from "zod";
import { formatDate } from "@gnd/utils/dayjs";
import type { StepMeta } from "./types";
import { queueInventoryToDykeSync } from "./application/sync/inventory-to-dyke-sync-job";

async function recomputeLineItemComponentFromAllocationState(
  db: Db,
  lineItemComponentId: number,
) {
  const component = await db.lineItemComponents.findUnique({
    where: {
      id: lineItemComponentId,
    },
    select: {
      id: true,
      qty: true,
      inboundDemands: {
        where: {
          deletedAt: null,
          status: {
            not: "cancelled",
          },
        },
        select: {
          qty: true,
          qtyReceived: true,
        },
      },
      stockAllocations: {
        where: {
          deletedAt: null,
          status: {
            in: ["approved", "reserved", "picked", "consumed"],
          },
        },
        select: {
          qty: true,
        },
      },
    },
  });
  if (!component) return null;

  const qtyRequired = Number(component.qty || 0);
  const qtyAllocated = component.stockAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.qty || 0),
    0,
  );
  const qtyInbound = component.inboundDemands.reduce(
    (sum, demand) => sum + Number(demand.qty || 0),
    0,
  );
  const qtyReceived = component.inboundDemands.reduce(
    (sum, demand) => sum + Number(demand.qtyReceived || 0),
    0,
  );

  let status: any = "pending";
  if (qtyRequired <= 0) {
    status = "cancelled";
  } else if (qtyAllocated >= qtyRequired && qtyInbound <= 0) {
    status = "allocated";
  } else if (qtyAllocated > 0 && qtyInbound > 0) {
    status = "partially_allocated";
  } else if (qtyInbound > 0) {
    status = "inbound_required";
  }
  if (qtyReceived > 0 && qtyReceived < qtyInbound) {
    status = "partially_received";
  }
  if (qtyReceived >= qtyInbound && qtyInbound > 0) {
    status = qtyAllocated + qtyReceived >= qtyRequired ? "fulfilled" : "partially_received";
  }

  return db.lineItemComponents.update({
    where: {
      id: component.id,
    },
    data: {
      qtyAllocated,
      qtyInbound,
      qtyReceived,
      status,
    },
  });
}

export async function inventoryList(db: Db, query: InventoryList) {
  const where = whereInventoryProducts(query);
  const params = await composeQueryData(query, where, db.inventory);
  const data = await db.inventory.findMany({
    ...params.queryProps,
    include: {
      inventoryCategory: true,
      images: {
        take: 1,
        select: {
          imageGallery: {
            select: {
              path: true,
              provider: true,
              bucket: true,
            },
          },
        },
        where: {
          primary: true,
        },
      },
      _count: {
        select: {
          variants: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
      variantPricings: {
        select: {
          price: true,
        },
      },
    },
  });
  const response = await params.response(
    data.map((r) => {
      const stockMode = (r.inventoryCategory?.stockMode ||
        r.stockMode ||
        "unmonitored") as StockModes;
      return {
        id: r.id,
        title: r.name,
        uid: r.uid,
        productKind: (r.productKind || "inventory") as InventoryProductKind,
        sourceCustom: !!(r as any).sourceCustom,
        brand: r.inventoryCategory?.type,
        images: [],
        category: r.inventoryCategory?.title,
        variantCount: r._count?.variants,
        totalStocks: "-",
        // stockValue: 500,
        status: (r.status || "draft") as INVENTORY_STATUS,
        stockMode,
        stockMonitored: stockMode == "monitored",
        stockValue: r?.variantPricings?.[0]?.price,
        stockStatus: null,
        // stockStatus: generateRandomNumber(2) > 50 ? "Low Stock" : null,
        img: {
          path: r?.images?.[0]?.imageGallery?.path,
          provider: r?.images?.[0]?.imageGallery?.provider,
          bucket: r?.images?.[0]?.imageGallery?.bucket,
        },
      };
    }),
  );
  return response;
}

function whereInventoryProducts(query: InventoryList) {
  const wheres: Prisma.InventoryWhereInput[] = [];
  if (query.q)
    wheres.push({
      name: {
        contains: query.q,
      },
    });
  if (query.categoryId)
    wheres.push({
      inventoryCategoryId: query.categoryId,
    });
  if (query.productKind)
    wheres.push({
      productKind: query.productKind,
    });
  if (!query.showCustom)
    wheres.push({
      ...({ sourceCustom: false } as any),
    } as any);
  if (query.variantIds)
    wheres.push({
      variants: {
        some: {
          id: {
            in: query.variantIds!,
          },
        },
      },
    });
  if (query.ids)
    wheres.push({
      id: {
        in: query.ids!,
      },
    });
  if (query.subCategoryInvId)
    wheres.push({
      inventoryItemSubCategories: {
        some: {
          value: {
            inventoryId: query.subCategoryInvId,
          },
        },
      },
    });
  return composeQuery(wheres);
}

export async function getInventoryCategoryAttributes(db: Db, categoryId) {
  const attribute = await db.inventoryCategory.findUniqueOrThrow({
    where: {
      id: categoryId,
    },
    include: {
      categoryVariantAttributes: {
        where: {
          deletedAt: null,
        },
        include: {
          valuesInventoryCategory: {
            include: {
              inventories: {
                where: {
                  deletedAt: null,
                },
                select: {
                  id: true,
                  name: true,
                  sourceStepUid: true,
                  sourceComponentUid: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const attributes = attribute.categoryVariantAttributes.map((a) => {
    return {
      attributeId: a.id, //equals: inventoryCategoryVariantAttributeId
      name: a.valuesInventoryCategory.title,
      values: a.valuesInventoryCategory.inventories.map((i) => ({
        id: i.id,
        label: i.name,
        sourceStepUid: (i as any).sourceStepUid || null,
        sourceComponentUid: (i as any).sourceComponentUid || null,
      })),
    };
  });
  return {
    attributes,
  };
}
export async function getInventoryCategoryForm(
  db: Db,
  id,
): Promise<InventoryCategoryForm> {
  const categoryRaw = await db.inventoryCategory.findUniqueOrThrow({
    where: {
      id,
    },
    select: {
      id: true,
      description: true,
      enablePricing: true,
      img: true,
      ...({ productKind: true } as any),
      stockMode: true,
      title: true,
      categoryVariantAttributes: {
        where: {
          deletedAt: {},
        },
        select: {
          id: true,
          // inventoryCategoryId: true,
          valuesInventoryCategoryId: true,
          deletedAt: true,
        },
      },
    },
  });
  const category = categoryRaw as unknown as {
    id: number;
    title: string;
    productKind?: InventoryProductKind | null;
    stockMode?: StockModes | null;
    description?: string | null;
    enablePricing?: boolean | null;
    img?: string | null;
    categoryVariantAttributes?: Array<{
      id?: number | null;
      valuesInventoryCategoryId: number | null;
      deletedAt?: Date | null;
    }>;
  };
  return {
    id: category.id,
    title: category.title,
    productKind: (category.productKind || "inventory") as InventoryProductKind,
    stockMode: (category.stockMode || "unmonitored") as StockModes,
    description: category.description || null,
    enablePricing: category.enablePricing ?? false,
    categoryVariantAttributes: (category.categoryVariantAttributes || []).map(
      (a) => {
        const { deletedAt, ...cva } = a;
        return {
          ...cva,
          active: !deletedAt,
        };
      },
    ),
    categoryIdSelector: null,
  };
}
export async function getInventoryCategories(
  db: Db,
  data: GetInventoryCategories,
) {
  const categories = await db.inventoryCategory.findMany({
    where: {
      deletedAt: null,
      ...(data.productKind
        ? {
            productKind: data.productKind,
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      stockMode: true,
      ...(data.productKind ? ({ productKind: true } as any) : {}),
    },
  });
  return categories;
}
export const GetVariantCostHistorySchema = z.object({
  variantId: z.number().optional().nullable(),
});
export type GetVariantCostHistory = z.infer<typeof GetVariantCostHistorySchema>;
export async function getVariantCostHistories(
  db: Db,
  query: GetVariantCostHistory,
) {
  const qb = queryBuilder(query, [] as Prisma.PriceHistoryWhereInput[]);
  const where = qb._if("variantId", () => {}).compose();
  // const where = {};
  const params = await composeQueryData(query, where, db.inventory);
  const histories = await db.priceHistory.findMany({
    where,
  });
  return await params.response(
    histories?.map((h) => {
      return {
        id: h.id,
        author: h.changedBy,
        date: formatDate(h.createdAt),
        reason: h.changeReason,
        cost: h.newCostPrice,
        source: h.source,
      };
    }),
  );
}
export const inventorySummarySchema = z.object({
  type: z.enum([
    "total_products",
    "inventory_value",
    "stock_level",
    "categories",
  ]),
});
export type InventorySummary = z.infer<typeof inventorySummarySchema>;
export async function inventorySummary(db: Db, data: InventorySummary) {
  switch (data.type) {
    case "total_products":
      const productCount = await db.inventory.count({
        where: {
          variantPricings: {
            some: {
              costPrice: { gt: 0 },
              deletedAt: null,
            },
          },
        },
      });
      const publishedProducts = await db.inventory.count({
        where: {
          variantPricings: {
            some: {
              costPrice: { gt: 0 },
              deletedAt: null,
              inventoryVariant: {
                status: "published",
              },
            },
          },
          status: "published" as INVENTORY_STATUS,
        },
      });
      return {
        value: productCount,
        subtitle: `${publishedProducts} published`,
      };
    case "inventory_value":
    case "stock_level":
      const inv = await db.inventoryVariant.findMany({
        where: {
          inventory: {
            inventoryCategory: {
              stockMode: "monitored" as StockModes,
            },
          },
          lowStockAlert:
            data.type == "inventory_value"
              ? undefined
              : {
                  gt: 0,
                },
          pricing: {
            costPrice: {
              gt: 0,
            },
          },
        },
        select: {
          lowStockAlert: true,
          logs: {
            where: {
              deletedAt: null,
            },
            select: {
              costPrice: true,
              qty: true,
            },
          },
          // stocks: {
          //   select: {
          //     qty: true,
          //     price: true,
          //     logs: {
          //       select: {

          //       }
          //     }
          //   },
          // },
          // pricing: {
          //   select: {
          //     costPrice: true,
          //   },
          // },
        },
      });
      if (data.type == "inventory_value") {
        const value = sum(
          inv.map((a) => sum(a.logs.map((l) => l.costPrice! * l.qty))),
        );
        return {
          value: formatMoney(value),
          subtitle: "Total cost value",
        };
      }
      const lowStockCount = inv.filter((v) => {
        const totalQty = sum(v.logs.map((l) => l.qty));
        return v.lowStockAlert && totalQty <= v.lowStockAlert;
      }).length;
      // const value = sum(inv.map((a) => sum(a.logs.map((l) => l.qty))));
      return {
        value: lowStockCount,
        subtitle: `Products need restocking`,
      };
    case "categories":
      const c = await db.inventoryCategory.count({
        where: {},
      });

      return {
        value: c,
        subtitle: "Active categories",
      };
  }
}
export async function inventoryVariantStockForm(db: Db, inventoryId) {
  const showAllPricedOnly = String(process.env.INVENTORY_SHOW_ALL_PRICED || "")
    .trim()
    .toLowerCase() === "true";
  const inventory = await db.inventory.findUniqueOrThrow({
    where: {
      id: inventoryId,
    },
    include: {
      inventoryItemSubCategories: {
        where: {
          deletedAt: null,
        },
        include: {
          value: {
            select: {
              inventoryId: true,
              inventory: {
                select: {
                  id: true,
                  name: true,
                  inventoryCategory: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      variants: {
        include: {
          attributes: {
            include: {
              value: {
                select: {
                  id: true,
                  name: true,
                  inventoryCategory: {
                    select: {
                      title: true,
                    },
                  },
                  sourceStepUid: true,
                  sourceComponentUid: true,
                },
              },
              inventoryCategoryVariantAttribute: {
                select: {
                  id: true,
                  inventoryCategory: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
            },
          },
          pricing: true,
          supplierVariants: {
            where: {
              deletedAt: null,
            },
            include: {
              supplier: true,
            },
          },
          stockMovements: {
            where: {
              deletedAt: null,
              status: "completed",
            },
            select: {
              changeQty: true,
            },
          },
        },
      },
    },
  });
  const sourceStep = inventory.sourceStepUid
    ? await db.dykeSteps.findFirst({
        where: {
          uid: inventory.sourceStepUid,
          deletedAt: null,
        },
        select: {
          meta: true,
        },
      })
    : null;
  const sourceStepMeta = (sourceStep?.meta || null) as StepMeta | null;
  const doorSizeVariation = Array.isArray(sourceStepMeta?.doorSizeVariation)
    ? sourceStepMeta.doorSizeVariation
    : [];
  const { attributes } = await getInventoryCategoryAttributes(
    db,
    inventory.inventoryCategoryId,
  );
  function cartesianProduct<T>(arr: T[][]): T[][] {
    return arr.reduce((a, b) => a.flatMap((x) => b.map((y) => [...x, y])), [
      [],
    ] as T[][]);
  }

  const allowedValuesByAttribute = inventory.inventoryItemSubCategories.reduce<
    Record<string, Set<number>>
  >((acc, subCategory) => {
    const attributeLabel =
      subCategory.value?.inventory?.inventoryCategory?.title?.trim();
    const valueInventoryId = subCategory.value?.inventoryId;
    if (!attributeLabel || !valueInventoryId) return acc;
    if (!acc[attributeLabel]) {
      acc[attributeLabel] = new Set<number>();
    }
    acc[attributeLabel]!.add(valueInventoryId);
    return acc;
  }, {});

  // Step 1: Get all possible value combos from attributes
  const allCombos = cartesianProduct(
    attributes.map((attr) => {
      const allowedValues = allowedValuesByAttribute[attr.name || ""];
      const values = allowedValues?.size
        ? attr.values.filter((value) => allowedValues.has(value.id))
        : attr.values;
      return values.map((v) => ({
        valueId: v.id,
        valueLabel: v.label,
        attributeId: attr.attributeId,
        attributeLabel: attr.name,
        sourceStepUid: (v as any).sourceStepUid || null,
        sourceComponentUid: (v as any).sourceComponentUid || null,
      }));
    }),
  );
  const variants = inventory.variants;
  const attributeMaps = allCombos
    .map((combo) => {
      const matchedVariant = variants.find((variant) =>
        combo.every((c) =>
          variant.attributes.some(
            (a) =>
              a.valueId === c.valueId &&
              a.inventoryCategoryVariantAttributeId === c.attributeId,
          ),
        ),
      );
      // Merge width + height for title if present
      const widthAttr = combo.find(
        (c) => c.attributeLabel?.toLowerCase() === "width",
      );
      const heightAttr = combo.find(
        (c) => c.attributeLabel?.toLowerCase() === "height",
      );

      let titleParts: string[];
      if (widthAttr && heightAttr) {
        titleParts = [
          `${widthAttr.valueLabel} x ${heightAttr.valueLabel}`,
          ...combo
            .filter(
              (c) =>
                !["width", "height"].includes(c.attributeLabel?.toLowerCase()),
            )
            .map((c) => c.valueLabel),
        ];
      } else {
        titleParts = combo.map((c) => c.valueLabel);
      }
      const preferredSupplierVariant =
        matchedVariant?.supplierVariants?.find((variant) => variant.preferred) ||
        matchedVariant?.supplierVariants?.[0];
      const effectivePrice =
        matchedVariant?.pricing?.price ??
        matchedVariant?.pricing?.costPrice ??
        preferredSupplierVariant?.salesPrice ??
        preferredSupplierVariant?.costPrice ??
        null;
      return {
        variantId: matchedVariant?.id ?? null,
        uid: matchedVariant?.uid || generateRandomString(5),
        price: effectivePrice,
        pricingId: matchedVariant?.pricing?.id,
        status: matchedVariant ? (matchedVariant.status ?? "draft") : "draft",
        attributes: combo,
        title: titleParts.join(" "),
        stockCount: sum(matchedVariant?.stockMovements, "changeQty"),
        lowStock: matchedVariant?.lowStockAlert,
        supplierVariants: matchedVariant?.supplierVariants || [],
        inventoryId,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const matchedVariantIds = new Set(
    attributeMaps
      .map((item) => item.variantId)
      .filter((value): value is number => Number.isFinite(value as number)),
  );

  const unmatchedPersistedVariants = variants
    .filter((variant) => !matchedVariantIds.has(variant.id))
    .map((variant) => {
      const preferredSupplierVariant =
        variant.supplierVariants?.find((row) => row.preferred) ||
        variant.supplierVariants?.[0];
      const effectivePrice =
        variant.pricing?.price ??
        variant.pricing?.costPrice ??
        preferredSupplierVariant?.salesPrice ??
        preferredSupplierVariant?.costPrice ??
        null;
      const attributes = variant.attributes.map((attribute) => ({
        valueId: attribute.valueId,
        valueLabel: attribute.value?.name || "",
        attributeId: attribute.inventoryCategoryVariantAttributeId,
        attributeLabel: attribute.value?.inventoryCategory?.title || "",
        sourceStepUid: attribute.value?.sourceStepUid || null,
        sourceComponentUid: attribute.value?.sourceComponentUid || null,
      }));
      const widthAttr = attributes.find(
        (attribute) => attribute.attributeLabel?.toLowerCase() === "width",
      );
      const heightAttr = attributes.find(
        (attribute) => attribute.attributeLabel?.toLowerCase() === "height",
      );
      const title = widthAttr && heightAttr
        ? [
            `${widthAttr.valueLabel} x ${heightAttr.valueLabel}`,
            ...attributes
              .filter(
                (attribute) =>
                  !["width", "height"].includes(
                    attribute.attributeLabel?.toLowerCase(),
                  ),
              )
              .map((attribute) => attribute.valueLabel)
              .filter(Boolean),
          ].join(" ")
        : attributes
            .map((attribute) => attribute.valueLabel)
            .filter(Boolean)
            .join(" ") || variant.description || variant.uid;

      return {
        variantId: variant.id,
        uid: variant.uid || generateRandomString(5),
        price: effectivePrice,
        pricingId: variant.pricing?.id,
        status: variant.status ?? "draft",
        attributes,
        title,
        stockCount: sum(variant.stockMovements, "changeQty"),
        lowStock: variant.lowStockAlert,
        supplierVariants: variant.supplierVariants || [],
        inventoryId,
      };
    });

  const finalAttributeMaps = [...attributeMaps, ...unmatchedPersistedVariants].sort(
    (a, b) => a.title.localeCompare(b.title),
  );
  const filterParams: Record<
    string,
    Array<{
      label: string;
      value: string;
      sourceStepUid?: string | null;
      sourceComponentUid?: string | null;
    }>
  > = {};
  for (const record of finalAttributeMaps) {
    for (const attr of record.attributes) {
      if (!attr.attributeLabel || !attr.valueLabel) continue;
      if (!filterParams[attr.attributeLabel]) {
        filterParams[attr.attributeLabel] = [];
      }
      if (
        !filterParams[attr.attributeLabel]!.some(
          (option) => option.value === attr.valueLabel,
        )
      ) {
        filterParams[attr.attributeLabel]!.push({
          label: attr.valueLabel,
          value: attr.valueLabel,
          sourceStepUid: attr.sourceStepUid || null,
          sourceComponentUid: attr.sourceComponentUid || null,
        });
      }
    }

    for (const supplierVariant of record.supplierVariants || []) {
      const supplier = supplierVariant?.supplier;
      if (!supplier?.id || !supplier?.name) continue;
      if (!filterParams.Supplier) {
        filterParams.Supplier = [];
      }
      if (
        !filterParams.Supplier.some(
          (option) => option.value === String(supplier.id),
        )
      ) {
        filterParams.Supplier.push({
          label: supplier.name,
          value: String(supplier.id),
        });
      }
    }
  }

  const pricedOnlyAttributeMaps = finalAttributeMaps.filter((item) => {
    const price = Number(item.price || 0);
    return Number.isFinite(price) && price > 0;
  });

  return {
    attributeMaps: showAllPricedOnly ? pricedOnlyAttributeMaps : finalAttributeMaps,
    inventory,
    filterParams: showAllPricedOnly ? {} : filterParams,
    doorSizeVariation,
    showAllPricedOnly,
  };
}

type InventoryItemDashboardSummaryInput = {
  variants: Array<{
    lowStockAlert?: number | null;
    stocks?: Array<{
      qty?: number | null;
      price?: number | null;
    }>;
    stockMovements?: Array<unknown>;
  }>;
  inboundDemands?: Array<{
    qty?: number | null;
    qtyReceived?: number | null;
    status?: string | null;
  }>;
  allocations?: Array<{
    qty?: number | null;
    status?: string | null;
  }>;
  relatedLineItems?: Array<{
    lineItemType?: string | null;
    sale?: {
      type?: string | null;
    } | null;
  }>;
};

function isQuoteInventoryLine(
  line: InventoryItemDashboardSummaryInput["relatedLineItems"][number],
) {
  const lineType = String(line.lineItemType || "").toLowerCase();
  const saleType = String(line.sale?.type || "").toLowerCase();
  return lineType === "quote" || saleType.includes("quote");
}

export function buildInventoryItemDashboardSummary(
  input: InventoryItemDashboardSummaryInput,
) {
  const variantStocks = input.variants.map((variant) => {
    const qty = (variant.stocks || []).reduce(
      (total, stock) => total + Number(stock.qty || 0),
      0,
    );
    const value = (variant.stocks || []).reduce(
      (total, stock) =>
        total + Number(stock.qty || 0) * Number(stock.price || 0),
      0,
    );
    return {
      qty,
      value,
      lowStockAlert: variant.lowStockAlert,
      movementCount: variant.stockMovements?.length || 0,
    };
  });

  const openInboundQty = (input.inboundDemands || []).reduce(
    (total, demand) => {
      if (["received", "cancelled"].includes(String(demand.status || ""))) {
        return total;
      }
      return (
        total +
        Math.max(0, Number(demand.qty || 0) - Number(demand.qtyReceived || 0))
      );
    },
    0,
  );

  const allocationQtyByStatus = (input.allocations || []).reduce(
    (acc, allocation) => {
      const status = String(allocation.status || "unknown");
      acc[status] = (acc[status] || 0) + Number(allocation.qty || 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  const quoteCount = (input.relatedLineItems || []).filter((line) =>
    isQuoteInventoryLine(line),
  ).length;
  const salesCount = (input.relatedLineItems || []).filter(
    (line) => !isQuoteInventoryLine(line),
  ).length;

  return {
    variantCount: input.variants.length,
    totalStockQty: variantStocks.reduce((total, row) => total + row.qty, 0),
    totalStockValue: variantStocks.reduce((total, row) => total + row.value, 0),
    lowStockVariantCount: variantStocks.filter(
      (row) => row.lowStockAlert != null && row.qty <= Number(row.lowStockAlert),
    ).length,
    movementCount: variantStocks.reduce(
      (total, row) => total + row.movementCount,
      0,
    ),
    openInboundQty,
    allocationQtyByStatus,
    activeAllocationQty: Object.entries(allocationQtyByStatus)
      .filter(([status]) => !["cancelled", "released"].includes(status))
      .reduce((total, [, qty]) => total + qty, 0),
    salesCount,
    quoteCount,
  };
}

type InventoryOperationsVariantLike = {
  id: number;
  uid?: string | null;
  sku?: string | null;
  description?: string | null;
  lowStockAlert?: number | null;
  inventory?: {
    id: number;
    name?: string | null;
    stockMode?: string | null;
    inventoryCategory?: {
      title?: string | null;
      stockMode?: string | null;
    } | null;
    defaultSupplier?: {
      id: number;
      name: string;
    } | null;
  } | null;
  stocks?: Array<{
    qty?: number | null;
  }>;
  supplierVariants?: Array<{
    preferred?: boolean | null;
    supplier?: {
      id: number;
      name: string;
    } | null;
    leadTimeDays?: number | null;
  }>;
};

type InventoryOperationsQuantityLike = {
  qty?: number | null;
  qtyReceived?: number | null;
};

function effectiveStockMode(variant: InventoryOperationsVariantLike) {
  return (
    variant.inventory?.inventoryCategory?.stockMode ||
    variant.inventory?.stockMode ||
    "unmonitored"
  );
}

function variantStockQty(variant: InventoryOperationsVariantLike) {
  return (variant.stocks || []).reduce(
    (total, stock) => total + Number(stock.qty || 0),
    0,
  );
}

export function buildInventoryOperationsSummary(input: {
  variants: InventoryOperationsVariantLike[];
  openInboundDemands?: InventoryOperationsQuantityLike[];
  pendingAllocations?: Array<{ qty?: number | null }>;
  backorderLineIds?: number[];
  productionBlockerComponentIds?: number[];
}) {
  const alerts = input.variants
    .map((variant) => {
      const stockQty = variantStockQty(variant);
      const stockMode = effectiveStockMode(variant);
      const preferredSupplier =
        variant.supplierVariants?.find((supplier) => supplier.preferred) ||
        variant.supplierVariants?.[0] ||
        null;
      return {
        inventoryId: variant.inventory?.id ?? null,
        inventoryName: variant.inventory?.name || "Unknown inventory",
        categoryName: variant.inventory?.inventoryCategory?.title || null,
        inventoryVariantId: variant.id,
        variantSku: variant.sku,
        variantUid: variant.uid,
        variantDescription: variant.description,
        stockMode,
        stockQty,
        lowStockAlert: variant.lowStockAlert ?? null,
        supplierId:
          preferredSupplier?.supplier?.id ||
          variant.inventory?.defaultSupplier?.id ||
          null,
        supplierName:
          preferredSupplier?.supplier?.name ||
          variant.inventory?.defaultSupplier?.name ||
          null,
        leadTimeDays: preferredSupplier?.leadTimeDays ?? null,
        isTracked: stockMode === "monitored",
        isLowStock:
          stockMode === "monitored" &&
          variant.lowStockAlert != null &&
          stockQty <= Number(variant.lowStockAlert),
        isOutOfStock: stockMode === "monitored" && stockQty <= 0,
      };
    })
    .filter((alert) => alert.isLowStock || alert.isOutOfStock)
    .sort(
      (a, b) =>
        Number(b.isOutOfStock) - Number(a.isOutOfStock) ||
        a.stockQty - b.stockQty ||
        String(a.inventoryName).localeCompare(String(b.inventoryName)),
    );

  const trackedVariants = input.variants.filter(
    (variant) => effectiveStockMode(variant) === "monitored",
  );
  const trackedItemIds = new Set(
    trackedVariants
      .map((variant) => variant.inventory?.id)
      .filter((id): id is number => typeof id === "number"),
  );
  const allItemIds = new Set(
    input.variants
      .map((variant) => variant.inventory?.id)
      .filter((id): id is number => typeof id === "number"),
  );
  const openInboundQty = (input.openInboundDemands || []).reduce(
    (total, demand) =>
      total +
      Math.max(0, Number(demand.qty || 0) - Number(demand.qtyReceived || 0)),
    0,
  );
  const pendingAllocationQty = (input.pendingAllocations || []).reduce(
    (total, allocation) => total + Number(allocation.qty || 0),
    0,
  );

  return {
    summary: {
      totalVariants: input.variants.length,
      trackedVariants: trackedVariants.length,
      untrackedVariants: input.variants.length - trackedVariants.length,
      trackedItems: trackedItemIds.size,
      untrackedItems: allItemIds.size - trackedItemIds.size,
      lowStockVariants: alerts.filter((alert) => alert.isLowStock).length,
      outOfStockVariants: alerts.filter((alert) => alert.isOutOfStock).length,
      openInboundDemandCount: input.openInboundDemands?.length || 0,
      openInboundQty,
      pendingAllocationCount: input.pendingAllocations?.length || 0,
      pendingAllocationQty,
      backorderedLineCount: new Set(input.backorderLineIds || []).size,
      productionBlockerCount: new Set(input.productionBlockerComponentIds || [])
        .size,
    },
    alerts: alerts.slice(0, 10),
    trackingPolicy: {
      itemLevel: true,
      variantOverride: false,
      thresholdField: "InventoryVariant.lowStockAlert",
      stockModeSource: "InventoryCategory.stockMode || Inventory.stockMode",
    },
  };
}

type InventoryBrowserValidationFixtureKey =
  | "pending_allocation_review"
  | "dispatch_assignable_allocation"
  | "dispatch_packable_allocation"
  | "dispatch_fulfillable_allocation"
  | "open_inbound_demand"
  | "inbound_receiving_shipment"
  | "received_inbound_backorder"
  | "partial_shipment_available"
  | "held_partial_shipment"
  | "low_stock_variant"
  | "safe_stock_adjustment_variant";

type InventoryBrowserValidationFixtureSample = {
  id: number;
  saleId?: number | null;
  orderId?: string | null;
  lineItemId?: number | null;
  inventoryId?: number | null;
  inventoryName?: string | null;
  inventoryVariantId?: number | null;
  variantSku?: string | null;
  status?: string | null;
  qty?: number | null;
  qtyReceived?: number | null;
  stockQty?: number | null;
};

type InventoryBrowserValidationFixtureCountDiagnostic = {
  countSource: "sql_count" | "bounded_application_scan";
  sampleLimit: number;
  scanLimit?: number;
  scannedCount?: number;
  candidateCount?: number;
  complete: boolean;
  note?: string;
};

type InventoryBrowserValidationFixtureInput = Record<
  InventoryBrowserValidationFixtureKey,
  {
    count: number;
    samples?: InventoryBrowserValidationFixtureSample[];
    countDiagnostic?: Partial<InventoryBrowserValidationFixtureCountDiagnostic>;
  }
>;

type InventoryBrowserValidationWorkflowKey =
  | "allocation_approve"
  | "allocation_reject"
  | "allocation_bulk_approve"
  | "dispatch_assign"
  | "dispatch_pack"
  | "dispatch_fulfill"
  | "dispatch_release"
  | "inbound_receive"
  | "received_backorder_release"
  | "partial_ship_available"
  | "partial_hold_until_complete"
  | "stock_adjustment"
  | "low_stock_dashboard";

const INVENTORY_BROWSER_VALIDATION_FIXTURES: Array<{
  key: InventoryBrowserValidationFixtureKey;
  label: string;
  seedFixtureId: string;
  seedPlanHref: string;
  requiredCount: number;
  workspaceHref: string;
  recommendedAction: string;
}> = [
  {
    key: "pending_allocation_review",
    label: "Pending allocation review",
    seedFixtureId: "INV-FIX-ALLOC",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-alloc",
    requiredCount: 3,
    workspaceHref: "/inventory/allocations",
    recommendedAction:
      "Seed or identify at least three sale-line allocations with pending allocation review.",
  },
  {
    key: "dispatch_assignable_allocation",
    label: "Dispatch assignable approved allocation",
    seedFixtureId: "INV-FIX-ALLOC",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-alloc",
    requiredCount: 2,
    workspaceHref: "/inventory/dispatch-mode",
    recommendedAction:
      "Seed or identify at least two approved allocations for dispatch assignment proof without consuming partial-shipment proof.",
  },
  {
    key: "dispatch_packable_allocation",
    label: "Dispatch packable reserved allocation",
    seedFixtureId: "INV-FIX-ALLOC",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-alloc",
    requiredCount: 2,
    workspaceHref: "/inventory/dispatch-mode",
    recommendedAction:
      "Seed or identify at least two reserved allocations for dispatch pack and release proof.",
  },
  {
    key: "dispatch_fulfillable_allocation",
    label: "Dispatch fulfillable picked allocation",
    seedFixtureId: "INV-FIX-ALLOC",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-alloc",
    requiredCount: 1,
    workspaceHref: "/inventory/dispatch-mode",
    recommendedAction: "Seed or identify a picked allocation for fulfillment proof.",
  },
  {
    key: "open_inbound_demand",
    label: "Open inbound demand",
    seedFixtureId: "INV-FIX-INBOUND",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-inbound",
    requiredCount: 1,
    workspaceHref: "/inventory/inbounds",
    recommendedAction: "Seed or identify open line-level inbound demand.",
  },
  {
    key: "inbound_receiving_shipment",
    label: "Inbound shipment ready for receiving",
    seedFixtureId: "INV-FIX-INBOUND",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-inbound",
    requiredCount: 1,
    workspaceHref: "/inventory/inbounds",
    recommendedAction: "Create or identify an inbound shipment with receiveable items.",
  },
  {
    key: "received_inbound_backorder",
    label: "Received inbound backorder release",
    seedFixtureId: "INV-FIX-RECEIVED",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-received",
    requiredCount: 1,
    workspaceHref: "/inventory/backorders",
    recommendedAction: "Seed or identify received inbound demand tied to a backordered line.",
  },
  {
    key: "partial_shipment_available",
    label: "Available partial shipment line",
    seedFixtureId: "INV-FIX-PARTIAL",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-partial",
    requiredCount: 1,
    workspaceHref: "/inventory/partial-shipments",
    recommendedAction: "Seed or identify a partially available line for ship-available proof.",
  },
  {
    key: "held_partial_shipment",
    label: "Held partial shipment line",
    seedFixtureId: "INV-FIX-PARTIAL",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-partial",
    requiredCount: 1,
    workspaceHref: "/inventory/partial-shipments",
    recommendedAction: "Seed or identify a line with hold-until-complete enabled.",
  },
  {
    key: "low_stock_variant",
    label: "Low-stock monitored variant",
    seedFixtureId: "INV-FIX-STOCK-LOW",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-stock-low",
    requiredCount: 1,
    workspaceHref: "/inventory/variants",
    recommendedAction: "Seed or identify a monitored variant below its low-stock threshold.",
  },
  {
    key: "safe_stock_adjustment_variant",
    label: "Safe monitored stock adjustment variant",
    seedFixtureId: "INV-FIX-STOCK-SAFE",
    seedPlanHref:
      "brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md#inv-fix-stock-safe",
    requiredCount: 1,
    workspaceHref: "/inventory/stocks",
    recommendedAction: "Pick a safe monitored variant for stock adjustment proof.",
  },
];

const INVENTORY_BROWSER_VALIDATION_WORKFLOWS: Array<{
  key: InventoryBrowserValidationWorkflowKey;
  phase: string;
  label: string;
  runOrder: number;
  fixtureKeys: InventoryBrowserValidationFixtureKey[];
  primaryFixtureKey?: InventoryBrowserValidationFixtureKey;
  primarySampleIndex?: number;
  workspaceHref: string;
  operatorAction: string;
  operatorGuard: string;
  expectedEvidence: string;
}> = [
  {
    key: "allocation_approve",
    phase: "Allocation Review",
    label: "Approve pending allocation",
    runOrder: 10,
    fixtureKeys: ["pending_allocation_review"],
    primarySampleIndex: 0,
    workspaceHref: "/inventory/allocations",
    operatorAction: "Approve one pending review row and record the allocation id.",
    operatorGuard:
      "Run before bulk approval; use only the primary sample so reject/bulk rows remain pending.",
    expectedEvidence:
      "Allocation status changes from pending_review to approved or reserved without changing unrelated lines.",
  },
  {
    key: "allocation_reject",
    phase: "Allocation Review",
    label: "Reject pending allocation",
    runOrder: 20,
    fixtureKeys: ["pending_allocation_review"],
    primarySampleIndex: 1,
    workspaceHref: "/inventory/allocations",
    operatorAction: "Reject one pending review row with a reason.",
    operatorGuard:
      "Run before bulk approval; use only the primary sample so the bulk row remains pending.",
    expectedEvidence:
      "Allocation leaves the dispatchable queue and the component availability projection refreshes.",
  },
  {
    key: "allocation_bulk_approve",
    phase: "Allocation Review",
    label: "Bulk approve visible allocations",
    runOrder: 30,
    fixtureKeys: ["pending_allocation_review"],
    primarySampleIndex: 2,
    workspaceHref: "/inventory/allocations",
    operatorAction: "Run Approve Visible against the controlled fixture rows.",
    operatorGuard:
      "Run after the single approve and reject checks, with the remaining pending fixture row visible.",
    expectedEvidence:
      "Bulk result reports approved and skipped rows separately, with no duplicate allocation mutation.",
  },
  {
    key: "dispatch_assign",
    phase: "Dispatch",
    label: "Assign dispatch allocation",
    runOrder: 40,
    fixtureKeys: ["dispatch_assignable_allocation"],
    primarySampleIndex: 0,
    workspaceHref: "/inventory/dispatch-mode",
    operatorAction: "Assign one approved allocation from inventory dispatch mode.",
    operatorGuard:
      "Use the primary approved allocation; leave the spare approved row untouched for rerun/recovery.",
    expectedEvidence:
      "Approved allocation moves to reserved and remains tied to the same sale line/component.",
  },
  {
    key: "dispatch_pack",
    phase: "Dispatch",
    label: "Pack reserved allocation",
    runOrder: 50,
    fixtureKeys: ["dispatch_packable_allocation"],
    primarySampleIndex: 0,
    workspaceHref: "/inventory/dispatch-mode",
    operatorAction: "Pack one reserved allocation.",
    operatorGuard:
      "Use the primary reserved allocation; do not pack the release sample.",
    expectedEvidence:
      "Reserved allocation moves to picked and the dispatch row updates without consuming stock yet.",
  },
  {
    key: "dispatch_fulfill",
    phase: "Dispatch",
    label: "Fulfill picked allocation",
    runOrder: 60,
    fixtureKeys: ["dispatch_fulfillable_allocation"],
    primarySampleIndex: 0,
    workspaceHref: "/inventory/dispatch-mode",
    operatorAction: "Fulfill one picked allocation.",
    operatorGuard:
      "Use the primary picked allocation and verify delivery compatibility metadata afterward.",
    expectedEvidence:
      "Picked allocation moves to consumed, shipped quantity increases, and delivery compatibility metadata is written.",
  },
  {
    key: "dispatch_release",
    phase: "Dispatch",
    label: "Release reserved allocation",
    runOrder: 70,
    fixtureKeys: ["dispatch_packable_allocation"],
    primarySampleIndex: 1,
    workspaceHref: "/inventory/dispatch-mode",
    operatorAction: "Release one reserved allocation instead of fulfilling it.",
    operatorGuard:
      "Use the second reserved primary sample so pack and release prove separate rows.",
    expectedEvidence:
      "Reserved allocation moves to released and availability is restored without stock consumption.",
  },
  {
    key: "inbound_receive",
    phase: "Inbound",
    label: "Receive inbound shipment",
    runOrder: 80,
    fixtureKeys: ["inbound_receiving_shipment", "open_inbound_demand"],
    primaryFixtureKey: "inbound_receiving_shipment",
    primarySampleIndex: 0,
    workspaceHref: "/inventory/inbounds",
    operatorAction: "Receive a controlled inbound shipment item against open demand.",
    operatorGuard:
      "Record before quantities first, then repeat the same receive totals to prove retry idempotency.",
    expectedEvidence:
      "Received quantity and stock move by the new delta only; retry does not duplicate receipt.",
  },
  {
    key: "received_backorder_release",
    phase: "Backorders",
    label: "Release received backorder",
    runOrder: 90,
    fixtureKeys: ["received_inbound_backorder"],
    primarySampleIndex: 0,
    workspaceHref: "/inventory/backorders",
    operatorAction: "Allocate or release a received inbound backorder row.",
    operatorGuard:
      "Run after receive proof if both use related inbound screens, and record remaining/backordered quantities.",
    expectedEvidence:
      "Backordered quantity reduces and the line becomes allocation or production ready as appropriate.",
  },
  {
    key: "partial_ship_available",
    phase: "Partial Shipments",
    label: "Ship available partial line",
    runOrder: 100,
    fixtureKeys: ["partial_shipment_available"],
    primarySampleIndex: 0,
    workspaceHref: "/inventory/partial-shipments",
    operatorAction: "Ship the available quantity on a partial line.",
    operatorGuard:
      "Use only the non-held primary line; held-line proof has a separate sample.",
    expectedEvidence:
      "Shipment quantity never exceeds remaining quantity, and the line retains the correct backorder remainder.",
  },
  {
    key: "partial_hold_until_complete",
    phase: "Partial Shipments",
    label: "Hold partial line until complete",
    runOrder: 110,
    fixtureKeys: ["held_partial_shipment"],
    primarySampleIndex: 0,
    workspaceHref: "/inventory/partial-shipments",
    operatorAction: "Confirm the held line stays out of ship-available actions.",
    operatorGuard:
      "Do not remove the hold flag during this proof; verify it stays excluded from ship-available actions.",
    expectedEvidence:
      "Held line remains blocked for partial shipment until full required quantity is available.",
  },
  {
    key: "stock_adjustment",
    phase: "Stock",
    label: "Post stock add/remove/return/correction",
    runOrder: 120,
    fixtureKeys: ["safe_stock_adjustment_variant"],
    primarySampleIndex: 0,
    workspaceHref: "/inventory/stocks",
    operatorAction:
      "Post controlled add, remove, return, and correction movements on the safe fixture variant.",
    operatorGuard:
      "Use the safe stock fixture variant only; avoid variants tied to active fulfillment proof.",
    expectedEvidence:
      "InventoryStock quantity changes by signed movement amounts and audit rows include reason/type.",
  },
  {
    key: "low_stock_dashboard",
    phase: "Stock",
    label: "Verify low-stock dashboard signal",
    runOrder: 130,
    fixtureKeys: ["low_stock_variant"],
    primarySampleIndex: 0,
    workspaceHref: "/inventory/variants",
    operatorAction: "Open the low-stock fixture variant from the inventory dashboard/variants view.",
    operatorGuard:
      "Use read-only dashboard/variant navigation; do not adjust low-stock fixture quantity.",
    expectedEvidence:
      "Low-stock alert is visible and points at the monitored fixture variant below threshold.",
  },
];

export function buildInventoryBrowserValidationFixtureReport(
  input: InventoryBrowserValidationFixtureInput,
) {
  const fixtures = INVENTORY_BROWSER_VALIDATION_FIXTURES.map((fixture) => {
    const value = input[fixture.key] || { count: 0 };
    const count = Math.max(0, Number(value.count || 0));
    const countDiagnostic: InventoryBrowserValidationFixtureCountDiagnostic = {
      countSource: value.countDiagnostic?.countSource || "sql_count",
      sampleLimit: value.countDiagnostic?.sampleLimit ?? 5,
      scanLimit: value.countDiagnostic?.scanLimit,
      scannedCount: value.countDiagnostic?.scannedCount,
      candidateCount: value.countDiagnostic?.candidateCount,
      complete: value.countDiagnostic?.complete ?? true,
      note: value.countDiagnostic?.note,
    };
    return {
      ...fixture,
      count,
      countDiagnostic,
      ready: count >= fixture.requiredCount,
      samples: (value.samples || []).slice(0, 5),
    };
  });
  const missing = fixtures.filter((fixture) => !fixture.ready);
  const fixturesByKey = new Map(
    fixtures.map((fixture) => [fixture.key, fixture]),
  );
  const fixtureReadyByKey = new Map(
    fixtures.map((fixture) => [fixture.key, fixture.ready]),
  );
  const workflowMatrix = INVENTORY_BROWSER_VALIDATION_WORKFLOWS.map(
    (workflow) => {
      const missingFixtureKeys = workflow.fixtureKeys.filter(
        (fixtureKey) => !fixtureReadyByKey.get(fixtureKey),
      );
      const candidateSamples = workflow.fixtureKeys
        .flatMap((fixtureKey) =>
          (fixturesByKey.get(fixtureKey)?.samples || []).map((sample) => ({
            fixtureKey,
            ...sample,
          })),
        )
        .slice(0, 3);
      const primaryFixtureKey = workflow.primaryFixtureKey || workflow.fixtureKeys[0];
      const primarySampleIndex = workflow.primarySampleIndex || 0;
      const primarySample = primaryFixtureKey
        ? (fixturesByKey.get(primaryFixtureKey)?.samples || [])[primarySampleIndex]
        : null;
      return {
        ...workflow,
        ready: missingFixtureKeys.length == 0,
        missingFixtureKeys,
        candidateSamples,
        primarySample: primarySample
          ? {
              fixtureKey: primaryFixtureKey,
              ...primarySample,
            }
          : (candidateSamples[0] || null),
      };
    },
  );
  const blockedWorkflows = workflowMatrix.filter((workflow) => !workflow.ready);
  const seedFixturesToPrepare = Array.from(
    missing
      .reduce((map, fixture) => {
        const existing = map.get(fixture.seedFixtureId);
        if (existing) {
          existing.missingFixtureKeys.push(fixture.key);
          existing.missingFixtureLabels.push(fixture.label);
          existing.missingCount += 1;
          return map;
        }
        map.set(fixture.seedFixtureId, {
          seedFixtureId: fixture.seedFixtureId,
          seedPlanHref: fixture.seedPlanHref,
          missingCount: 1,
          missingFixtureKeys: [fixture.key],
          missingFixtureLabels: [fixture.label],
        });
        return map;
      }, new Map<string, {
        seedFixtureId: string;
        seedPlanHref: string;
        missingCount: number;
        missingFixtureKeys: InventoryBrowserValidationFixtureKey[];
        missingFixtureLabels: string[];
      }>())
      .values(),
  );

  return {
    status: missing.length ? "blocked" : "ready",
    summary: {
      readyFixtureCount: fixtures.length - missing.length,
      requiredFixtureCount: fixtures.length,
      missingFixtureCount: missing.length,
      readyWorkflowCount: workflowMatrix.length - blockedWorkflows.length,
      requiredWorkflowCount: workflowMatrix.length,
      blockedWorkflowCount: blockedWorkflows.length,
    },
    diagnostics: {
      seedFixturesToPrepare,
      incompleteCountFixtures: fixtures
        .filter((fixture) => !fixture.countDiagnostic.complete)
        .map((fixture) => ({
          key: fixture.key,
          label: fixture.label,
          countDiagnostic: fixture.countDiagnostic,
        })),
    },
    fixtures,
    workflowMatrix,
    missingFixtures: missing.map((fixture) => ({
      key: fixture.key,
      label: fixture.label,
      seedFixtureId: fixture.seedFixtureId,
      seedPlanHref: fixture.seedPlanHref,
      count: fixture.count,
      requiredCount: fixture.requiredCount,
    })),
    nextAction: missing.length
      ? "Seed or identify local validation fixtures for the missing categories before rerunning mutating browser workflow checks."
      : "Run the approved browser workflow matrix and record the mutation evidence.",
  };
}

function isInventoryLineHeldUntilComplete(meta: unknown) {
  if (!meta || typeof meta !== "object") return false;
  const fulfillment = (meta as { fulfillment?: unknown }).fulfillment;
  return (
    !!fulfillment &&
    typeof fulfillment === "object" &&
    (fulfillment as { holdUntilComplete?: unknown }).holdUntilComplete === true
  );
}

function stockAllocationFixtureSample(allocation: {
  id: number;
  qty?: number | null;
  status?: string | null;
  inventoryVariantId?: number | null;
  inventoryVariant?: {
    id?: number | null;
    sku?: string | null;
    inventoryId?: number | null;
    inventory?: {
      id?: number | null;
      name?: string | null;
    } | null;
  } | null;
  lineItemComponent?: {
    parent?: {
      id?: number | null;
      saleId?: number | null;
      sale?: {
        id?: number | null;
        orderId?: string | number | null;
      } | null;
    } | null;
  } | null;
}): InventoryBrowserValidationFixtureSample {
  const variant = allocation.inventoryVariant;
  const parent = allocation.lineItemComponent?.parent;
  return {
    id: allocation.id,
    saleId: parent?.sale?.id ?? parent?.saleId ?? null,
    orderId:
      parent?.sale?.orderId == null ? null : String(parent.sale.orderId),
    lineItemId: parent?.id ?? null,
    inventoryId: variant?.inventory?.id ?? variant?.inventoryId ?? null,
    inventoryName: variant?.inventory?.name ?? null,
    inventoryVariantId: variant?.id ?? allocation.inventoryVariantId ?? null,
    variantSku: variant?.sku ?? null,
    status: allocation.status ?? null,
    qty: allocation.qty ?? null,
  };
}

function inboundDemandFixtureSample(demand: {
  id: number;
  qty?: number | null;
  qtyReceived?: number | null;
  status?: string | null;
  inventoryVariantId?: number | null;
  inventoryVariant?: {
    id?: number | null;
    sku?: string | null;
    inventory?: {
      id?: number | null;
      name?: string | null;
    } | null;
  } | null;
  lineItemComponent?: {
    parent?: {
      id?: number | null;
      saleId?: number | null;
      sale?: {
        id?: number | null;
        orderId?: string | number | null;
      } | null;
    } | null;
  } | null;
}): InventoryBrowserValidationFixtureSample {
  const parent = demand.lineItemComponent?.parent;
  return {
    id: demand.id,
    saleId: parent?.sale?.id ?? parent?.saleId ?? null,
    orderId:
      parent?.sale?.orderId == null ? null : String(parent.sale.orderId),
    lineItemId: parent?.id ?? null,
    inventoryId: demand.inventoryVariant?.inventory?.id ?? null,
    inventoryName: demand.inventoryVariant?.inventory?.name ?? null,
    inventoryVariantId: demand.inventoryVariant?.id ?? demand.inventoryVariantId ?? null,
    variantSku: demand.inventoryVariant?.sku ?? null,
    status: demand.status ?? null,
    qty: demand.qty ?? null,
    qtyReceived: demand.qtyReceived ?? null,
  };
}

function lineItemFixtureSample(line: {
  id: number;
  qty?: number | null;
  saleId?: number | null;
  sale?: {
    id?: number | null;
    orderId?: string | number | null;
  } | null;
  inventory?: {
    id?: number | null;
    name?: string | null;
  } | null;
  variant?: {
    id?: number | null;
    sku?: string | null;
  } | null;
}): InventoryBrowserValidationFixtureSample {
  return {
    id: line.id,
    saleId: line.sale?.id ?? line.saleId ?? null,
    orderId: line.sale?.orderId == null ? null : String(line.sale.orderId),
    lineItemId: line.id,
    inventoryId: line.inventory?.id ?? null,
    inventoryName: line.inventory?.name ?? null,
    inventoryVariantId: line.variant?.id ?? null,
    variantSku: line.variant?.sku ?? null,
    qty: line.qty ?? null,
  };
}

function variantFixtureSample(variant: {
  id: number;
  sku?: string | null;
  inventory?: {
    id?: number | null;
    name?: string | null;
  } | null;
  stocks?: Array<{
    qty?: number | null;
  }>;
}): InventoryBrowserValidationFixtureSample {
  return {
    id: variant.id,
    inventoryId: variant.inventory?.id ?? null,
    inventoryName: variant.inventory?.name ?? null,
    inventoryVariantId: variant.id,
    variantSku: variant.sku ?? null,
    stockQty: (variant.stocks || []).reduce(
      (total, stock) => total + Number(stock.qty || 0),
      0,
    ),
  };
}

const validationAllocationSelect = {
  id: true,
  qty: true,
  status: true,
  inventoryVariantId: true,
  inventoryVariant: {
    select: {
      id: true,
      sku: true,
      inventoryId: true,
      inventory: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  lineItemComponent: {
    select: {
      parent: {
        select: {
          id: true,
          saleId: true,
          sale: {
            select: {
              id: true,
              orderId: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.StockAllocationSelect;

const validationInboundDemandSelect = {
  id: true,
  qty: true,
  qtyReceived: true,
  status: true,
  inventoryVariantId: true,
  inventoryVariant: {
    select: {
      id: true,
      sku: true,
      inventory: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  lineItemComponent: {
    select: {
      parent: {
        select: {
          id: true,
          saleId: true,
          sale: {
            select: {
              id: true,
              orderId: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.InboundDemandSelect;

function validationSaleAllocationWhere(
  status: "pending_review" | "approved" | "reserved" | "picked",
) {
  return {
    deletedAt: null,
    status,
    lineItemComponent: {
      parent: {
        deletedAt: null,
        lineItemType: "SALE",
        sale: {
          is: {
            deletedAt: null,
          },
        },
      },
    },
  } satisfies Prisma.StockAllocationWhereInput;
}

const validationOpenInboundDemandWhere = {
  deletedAt: null,
  status: {
    in: ["pending", "ordered", "partially_received"],
  },
  lineItemComponent: {
    parent: {
      deletedAt: null,
      lineItemType: "SALE",
      sale: {
        is: {
          deletedAt: null,
        },
      },
    },
  },
} satisfies Prisma.InboundDemandWhereInput;

const validationReceivedInboundDemandWhere = {
  deletedAt: null,
  status: {
    in: ["partially_received", "received"],
  },
  qtyReceived: {
    gt: 0,
  },
  lineItemComponent: {
    parent: {
      deletedAt: null,
      lineItemType: "SALE",
      sale: {
        is: {
          deletedAt: null,
        },
      },
    },
  },
} satisfies Prisma.InboundDemandWhereInput;

const validationInboundShipmentWhere = {
  deletedAt: null,
  status: {
    in: ["pending", "in_progress", "issue_open"],
  },
  items: {
    some: {
      deletedAt: null,
    },
  },
} satisfies Prisma.InboundShipmentWhereInput;

const validationPartialShipmentLineWhere = {
  deletedAt: null,
  lineItemType: "SALE",
  sale: {
    is: {
      deletedAt: null,
    },
  },
  components: {
    some: {
      status: {
        not: "cancelled",
      },
      stockAllocations: {
        some: {
          deletedAt: null,
          status: {
            in: ["approved", "reserved", "picked"],
          },
        },
      },
    },
  },
} satisfies Prisma.LineItemWhereInput;

const validationHeldCandidateLineWhere = {
  deletedAt: null,
  lineItemType: "SALE",
  sale: {
    is: {
      deletedAt: null,
    },
  },
  components: {
    some: {
      status: {
        not: "cancelled",
      },
    },
  },
} satisfies Prisma.LineItemWhereInput;

const validationLineItemSelect = {
  id: true,
  qty: true,
  saleId: true,
  meta: true,
  sale: {
    select: {
      id: true,
      orderId: true,
    },
  },
  inventory: {
    select: {
      id: true,
      name: true,
    },
  },
  variant: {
    select: {
      id: true,
      sku: true,
    },
  },
} satisfies Prisma.LineItemSelect;

const validationPartialShipmentLineSelect = {
  ...validationLineItemSelect,
  components: {
    where: {
      status: {
        not: "cancelled",
      },
    },
    select: {
      stockAllocations: {
        where: {
          deletedAt: null,
          status: {
            in: ["approved", "reserved", "picked"],
          },
        },
        select: {
          qty: true,
        },
      },
    },
  },
} satisfies Prisma.LineItemSelect;

function isPartiallyAvailableValidationLine(
  line: Prisma.LineItemGetPayload<{
    select: typeof validationPartialShipmentLineSelect;
  }>,
) {
  if (isInventoryLineHeldUntilComplete(line.meta)) return false;

  const orderedQty = Number(line.qty ?? 0);
  const activeAllocatedQty = line.components.reduce(
    (componentTotal, component) =>
      componentTotal +
      component.stockAllocations.reduce(
        (allocationTotal, allocation) => allocationTotal + Number(allocation.qty || 0),
        0,
      ),
    0,
  );

  return activeAllocatedQty > 0 && orderedQty > activeAllocatedQty;
}

export async function inventoryBrowserValidationFixtureReport(db: Db) {
  const monitoredVariantWhere = {
    deletedAt: null,
    inventory: {
      deletedAt: null,
      productKind: "inventory",
      ...({ sourceCustom: false } as any),
      OR: [
        {
          stockMode: "monitored",
        },
        {
          inventoryCategory: {
            stockMode: "monitored",
          },
        },
      ],
    },
  } satisfies Prisma.InventoryVariantWhereInput;
  const safeStockAdjustmentVariantWhere = {
    ...monitoredVariantWhere,
    stocks: {
      some: {
        deletedAt: null,
        qty: {
          gt: 0,
        },
      },
    },
  } satisfies Prisma.InventoryVariantWhereInput;

  const [
    pendingAllocationCount,
    pendingAllocations,
    approvedAllocationCount,
    approvedAllocations,
    reservedAllocationCount,
    reservedAllocations,
    pickedAllocationCount,
    pickedAllocations,
    openInboundDemandCount,
    openInboundDemands,
    inboundShipmentCount,
    inboundShipments,
    receivedInboundDemandCount,
    receivedInboundDemands,
    partialShipmentCandidateLineCount,
    partialShipmentCandidateLines,
    heldCandidateLineCount,
    heldCandidateLines,
    monitoredVariantCount,
    safeStockAdjustmentVariantCount,
    safeStockAdjustmentVariants,
    monitoredVariants,
  ] = await Promise.all([
    db.stockAllocation.count({
      where: validationSaleAllocationWhere("pending_review"),
    }),
    db.stockAllocation.findMany({
      where: validationSaleAllocationWhere("pending_review"),
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: validationAllocationSelect,
    }),
    db.stockAllocation.count({
      where: validationSaleAllocationWhere("approved"),
    }),
    db.stockAllocation.findMany({
      where: validationSaleAllocationWhere("approved"),
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: validationAllocationSelect,
    }),
    db.stockAllocation.count({
      where: validationSaleAllocationWhere("reserved"),
    }),
    db.stockAllocation.findMany({
      where: validationSaleAllocationWhere("reserved"),
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: validationAllocationSelect,
    }),
    db.stockAllocation.count({
      where: validationSaleAllocationWhere("picked"),
    }),
    db.stockAllocation.findMany({
      where: validationSaleAllocationWhere("picked"),
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: validationAllocationSelect,
    }),
    db.inboundDemand.count({
      where: validationOpenInboundDemandWhere,
    }),
    db.inboundDemand.findMany({
      where: validationOpenInboundDemandWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: validationInboundDemandSelect,
    }),
    db.inboundShipment.count({
      where: validationInboundShipmentWhere,
    }),
    db.inboundShipment.findMany({
      where: validationInboundShipmentWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        status: true,
        items: {
          where: {
            deletedAt: null,
          },
          take: 1,
          select: {
            qty: true,
            qtyGood: true,
            inventoryVariant: {
              select: {
                id: true,
                sku: true,
                inventory: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.inboundDemand.count({
      where: validationReceivedInboundDemandWhere,
    }),
    db.inboundDemand.findMany({
      where: validationReceivedInboundDemandWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: validationInboundDemandSelect,
    }),
    db.lineItem.count({
      where: validationPartialShipmentLineWhere,
    }),
    db.lineItem.findMany({
      where: validationPartialShipmentLineWhere,
      orderBy: {
        id: "desc",
      },
      take: 200,
      select: validationPartialShipmentLineSelect,
    }),
    db.lineItem.count({
      where: validationHeldCandidateLineWhere,
    }),
    db.lineItem.findMany({
      where: validationHeldCandidateLineWhere,
      orderBy: {
        id: "desc",
      },
      take: 100,
      select: validationLineItemSelect,
    }),
    db.inventoryVariant.count({
      where: monitoredVariantWhere,
    }),
    db.inventoryVariant.count({
      where: safeStockAdjustmentVariantWhere,
    }),
    db.inventoryVariant.findMany({
      where: safeStockAdjustmentVariantWhere,
      orderBy: {
        id: "asc",
      },
      take: 5,
      select: {
        id: true,
        sku: true,
        inventory: {
          select: {
            id: true,
            name: true,
          },
        },
        stocks: {
          where: {
            deletedAt: null,
          },
          select: {
            qty: true,
          },
        },
      },
    }),
    db.inventoryVariant.findMany({
      where: monitoredVariantWhere,
      orderBy: {
        id: "asc",
      },
      take: 2000,
      select: {
        id: true,
        sku: true,
        lowStockAlert: true,
        inventory: {
          select: {
            id: true,
            name: true,
            stockMode: true,
            inventoryCategory: {
              select: {
                stockMode: true,
              },
            },
          },
        },
        stocks: {
          where: {
            deletedAt: null,
          },
          select: {
            qty: true,
          },
        },
      },
    }),
  ]);

  const heldPartialShipmentLines = heldCandidateLines.filter((line) =>
    isInventoryLineHeldUntilComplete(line.meta),
  );
  const partialShipmentLines = partialShipmentCandidateLines.filter(
    isPartiallyAvailableValidationLine,
  );
  const lowStockVariants = monitoredVariants.filter((variant) => {
    const stockQty = (variant.stocks || []).reduce(
      (total, stock) => total + Number(stock.qty || 0),
      0,
    );
    return variant.lowStockAlert != null && stockQty <= Number(variant.lowStockAlert);
  });

  return buildInventoryBrowserValidationFixtureReport({
    pending_allocation_review: {
      count: pendingAllocationCount,
      samples: pendingAllocations.map(stockAllocationFixtureSample),
    },
    dispatch_assignable_allocation: {
      count: approvedAllocationCount,
      samples: approvedAllocations.map(stockAllocationFixtureSample),
    },
    dispatch_packable_allocation: {
      count: reservedAllocationCount,
      samples: reservedAllocations.map(stockAllocationFixtureSample),
    },
    dispatch_fulfillable_allocation: {
      count: pickedAllocationCount,
      samples: pickedAllocations.map(stockAllocationFixtureSample),
    },
    open_inbound_demand: {
      count: openInboundDemandCount,
      samples: openInboundDemands.map(inboundDemandFixtureSample),
    },
    inbound_receiving_shipment: {
      count: inboundShipmentCount,
      samples: inboundShipments.map((shipment) => {
        const item = shipment.items[0];
        return {
          id: shipment.id,
          status: shipment.status,
          inventoryId: item?.inventoryVariant.inventory?.id ?? null,
          inventoryName: item?.inventoryVariant.inventory?.name ?? null,
          inventoryVariantId: item?.inventoryVariant.id ?? null,
          variantSku: item?.inventoryVariant.sku ?? null,
          qty: item?.qty ?? null,
          qtyReceived: item?.qtyGood ?? null,
        };
      }),
    },
    received_inbound_backorder: {
      count: receivedInboundDemandCount,
      samples: receivedInboundDemands.map(inboundDemandFixtureSample),
    },
    partial_shipment_available: {
      count: partialShipmentLines.length,
      samples: partialShipmentLines.slice(0, 5).map(lineItemFixtureSample),
      countDiagnostic: {
        countSource: "bounded_application_scan",
        sampleLimit: 5,
        scanLimit: 200,
        scannedCount: partialShipmentCandidateLines.length,
        candidateCount: partialShipmentCandidateLineCount,
        complete: partialShipmentCandidateLineCount <= partialShipmentCandidateLines.length,
        note:
          "Partial shipment readiness is derived by scanning non-held candidate sale lines and confirming active allocation is less than ordered quantity.",
      },
    },
    held_partial_shipment: {
      count: heldPartialShipmentLines.length,
      samples: heldPartialShipmentLines.slice(0, 5).map(lineItemFixtureSample),
      countDiagnostic: {
        countSource: "bounded_application_scan",
        sampleLimit: 5,
        scanLimit: 100,
        scannedCount: heldCandidateLines.length,
        candidateCount: heldCandidateLineCount,
        complete: heldCandidateLineCount <= heldCandidateLines.length,
        note:
          "Held partial shipment readiness is derived by scanning recent candidate line metadata for holdUntilComplete.",
      },
    },
    low_stock_variant: {
      count: lowStockVariants.length,
      samples: lowStockVariants.slice(0, 5).map(variantFixtureSample),
      countDiagnostic: {
        countSource: "bounded_application_scan",
        sampleLimit: 5,
        scanLimit: 2000,
        scannedCount: monitoredVariants.length,
        candidateCount: monitoredVariantCount,
        complete: monitoredVariantCount <= monitoredVariants.length,
        note:
          "Low-stock readiness is derived by scanning monitored variants and summing current stock quantities in application code.",
      },
    },
    safe_stock_adjustment_variant: {
      count: safeStockAdjustmentVariantCount,
      samples: safeStockAdjustmentVariants.map(variantFixtureSample),
    },
  });
}

export async function inventoryOperationsSummary(db: Db) {
  const [variants, openInboundDemands, pendingAllocations, backorderComponents, productionBlockers] =
    await Promise.all([
      db.inventoryVariant.findMany({
        where: {
          deletedAt: null,
          inventory: {
            deletedAt: null,
            productKind: "inventory",
            ...({ sourceCustom: false } as any),
          },
        },
        take: 2000,
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          uid: true,
          sku: true,
          description: true,
          lowStockAlert: true,
          inventory: {
            select: {
              id: true,
              name: true,
              stockMode: true,
              inventoryCategory: {
                select: {
                  title: true,
                  stockMode: true,
                },
              },
              defaultSupplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          stocks: {
            where: {
              deletedAt: null,
            },
            select: {
              qty: true,
            },
          },
          supplierVariants: {
            where: {
              deletedAt: null,
              active: true,
            },
            orderBy: [
              {
                preferred: "desc",
              },
              {
                id: "asc",
              },
            ],
            take: 3,
            select: {
              preferred: true,
              leadTimeDays: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      db.inboundDemand.findMany({
        where: {
          deletedAt: null,
          status: {
            in: ["pending", "ordered", "partially_received"],
          },
        },
        take: 2000,
        select: {
          qty: true,
          qtyReceived: true,
        },
      }),
      db.stockAllocation.findMany({
        where: {
          deletedAt: null,
          status: "pending_review",
        },
        take: 2000,
        select: {
          qty: true,
        },
      }),
      db.lineItemComponents.findMany({
        where: {
          inboundDemands: {
            some: {
              deletedAt: null,
              status: {
                in: ["pending", "ordered", "partially_received"],
              },
            },
          },
          parent: {
            deletedAt: null,
            lineItemType: "SALE",
            sale: {
              is: {
                deletedAt: null,
              },
            },
          },
        },
        take: 2000,
        select: {
          lineItemId: true,
        },
      }),
      db.lineItemComponents.findMany({
        where: {
          required: true,
          status: {
            in: [
              "pending",
              "partially_allocated",
              "inbound_required",
              "partially_received",
            ],
          },
          parent: {
            deletedAt: null,
            lineItemType: "SALE",
            sale: {
              is: {
                deletedAt: null,
              },
            },
          },
        },
        take: 2000,
        select: {
          id: true,
        },
      }),
    ]);

  return buildInventoryOperationsSummary({
    variants,
    openInboundDemands,
    pendingAllocations,
    backorderLineIds: backorderComponents.map((component) => component.lineItemId),
    productionBlockerComponentIds: productionBlockers.map((component) => component.id),
  });
}

export async function getInventoryItemDashboard(
  db: Db,
  input: { inventoryId: number },
) {
  const item = await db.inventory.findFirst({
    where: {
      id: input.inventoryId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      uid: true,
      productKind: true,
      stockMode: true,
      status: true,
      description: true,
      sourceStepUid: true,
      sourceComponentUid: true,
      sourceCustom: true,
      createdAt: true,
      updatedAt: true,
      inventoryCategory: {
        select: {
          id: true,
          title: true,
          productKind: true,
          stockMode: true,
          type: true,
        },
      },
      defaultSupplier: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      images: {
        take: 1,
        where: {
          primary: true,
        },
        select: {
          imageGallery: {
            select: {
              path: true,
              provider: true,
              bucket: true,
            },
          },
        },
      },
      variants: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          uid: true,
          sku: true,
          description: true,
          status: true,
          lowStockAlert: true,
          pricing: {
            select: {
              price: true,
              costPrice: true,
            },
          },
          attributes: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              inventoryCategoryVariantAttribute: {
                select: {
                  id: true,
                  valuesInventoryCategory: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
              value: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          supplierVariants: {
            where: {
              deletedAt: null,
              active: true,
            },
            take: 5,
            orderBy: [
              {
                preferred: "desc",
              },
              {
                id: "asc",
              },
            ],
            select: {
              id: true,
              supplierSku: true,
              costPrice: true,
              salesPrice: true,
              minOrderQty: true,
              leadTimeDays: true,
              preferred: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          stocks: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              id: "asc",
            },
            select: {
              id: true,
              qty: true,
              price: true,
              location: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
              updatedAt: true,
            },
          },
          stockMovements: {
            where: {
              deletedAt: null,
            },
            take: 10,
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              prevQty: true,
              currentQty: true,
              changeQty: true,
              type: true,
              status: true,
              reference: true,
              notes: true,
              authorName: true,
              createdAt: true,
            },
          },
          inboundDemands: {
            where: {
              deletedAt: null,
              status: {
                not: "cancelled",
              },
            },
            take: 20,
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              qty: true,
              qtyReceived: true,
              status: true,
              notes: true,
              createdAt: true,
              inboundShipmentItem: {
                select: {
                  id: true,
                  inbound: {
                    select: {
                      id: true,
                      reference: true,
                      status: true,
                      expectedAt: true,
                      supplier: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              lineItemComponent: {
                select: {
                  id: true,
                  parent: {
                    select: {
                      id: true,
                      title: true,
                      sale: {
                        select: {
                          id: true,
                          orderId: true,
                          type: true,
                          status: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          stockAllocations: {
            where: {
              deletedAt: null,
              status: {
                notIn: ["cancelled", "released"],
              },
            },
            take: 20,
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              qty: true,
              status: true,
              notes: true,
              createdAt: true,
              inventoryStock: {
                select: {
                  id: true,
                  location: true,
                  qty: true,
                },
              },
              lineItemComponent: {
                select: {
                  id: true,
                  parent: {
                    select: {
                      id: true,
                      title: true,
                      sale: {
                        select: {
                          id: true,
                          orderId: true,
                          type: true,
                          status: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      lineItems: {
        where: {
          deletedAt: null,
          lineItemType: {
            in: ["SALE", "QUOTE"],
          },
          sale: {
            is: {
              deletedAt: null,
            },
          },
        },
        take: 30,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          uid: true,
          title: true,
          qty: true,
          totalCost: true,
          lineItemType: true,
          createdAt: true,
          sale: {
            select: {
              id: true,
              orderId: true,
              slug: true,
              type: true,
              status: true,
              grandTotal: true,
              amountDue: true,
              createdAt: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  businessName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!item) return null;

  const flattenedStocks = item.variants.flatMap((variant) =>
    variant.stocks.map((stock) => ({
      ...stock,
      inventoryVariantId: variant.id,
      variantSku: variant.sku,
      variantDescription: variant.description,
    })),
  );
  const flattenedMovements = item.variants.flatMap((variant) =>
    variant.stockMovements.map((movement) => ({
      ...movement,
      inventoryVariantId: variant.id,
      variantSku: variant.sku,
    })),
  );
  const flattenedInboundDemands = item.variants.flatMap((variant) =>
    variant.inboundDemands.map((demand) => ({
      ...demand,
      inventoryVariantId: variant.id,
      variantSku: variant.sku,
    })),
  );
  const flattenedAllocations = item.variants.flatMap((variant) =>
    variant.stockAllocations.map((allocation) => ({
      ...allocation,
      inventoryVariantId: variant.id,
      variantSku: variant.sku,
    })),
  );

  const summary = buildInventoryItemDashboardSummary({
    variants: item.variants,
    inboundDemands: flattenedInboundDemands,
    allocations: flattenedAllocations,
    relatedLineItems: item.lineItems,
  });

  const relatedQuotes = item.lineItems.filter((line) =>
    isQuoteInventoryLine(line),
  );
  const relatedSales = item.lineItems.filter(
    (line) => !isQuoteInventoryLine(line),
  );

  return {
    item: {
      id: item.id,
      name: item.name,
      uid: item.uid,
      productKind: item.productKind,
      stockMode:
        item.inventoryCategory?.stockMode || item.stockMode || "unmonitored",
      status: item.status || "draft",
      description: item.description,
      sourceStepUid: item.sourceStepUid,
      sourceComponentUid: item.sourceComponentUid,
      sourceCustom: item.sourceCustom,
      category: item.inventoryCategory,
      defaultSupplier: item.defaultSupplier,
      img: {
        path: item.images?.[0]?.imageGallery?.path,
        provider: item.images?.[0]?.imageGallery?.provider,
        bucket: item.images?.[0]?.imageGallery?.bucket,
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    },
    summary,
    variants: item.variants.map((variant) => {
      const stockQty = variant.stocks.reduce(
        (total, stock) => total + Number(stock.qty || 0),
        0,
      );
      return {
        ...variant,
        stockQty,
        stockValue: variant.stocks.reduce(
          (total, stock) =>
            total + Number(stock.qty || 0) * Number(stock.price || 0),
          0,
        ),
        isLowStock:
          variant.lowStockAlert != null &&
          stockQty <= Number(variant.lowStockAlert),
      };
    }),
    stocks: flattenedStocks,
    movements: flattenedMovements.slice(0, 20),
    inboundDemands: flattenedInboundDemands,
    allocations: flattenedAllocations,
    relatedSales,
    relatedQuotes,
  };
}

export type InventoryVariantsWorkspaceQuery = {
  q?: string | null;
  inventoryId?: number | null;
  categoryId?: number | null;
  supplierId?: number | null;
  status?: string | null;
  stockMode?: string | null;
  lowStock?: boolean | null;
  cursorId?: number | null;
  limit?: number | null;
};

export function buildInventoryVariantWorkspaceRow(variant: {
  id: number;
  uid?: string | null;
  sku?: string | null;
  description?: string | null;
  status?: string | null;
  lowStockAlert?: number | null;
  inventory?: {
    id: number;
    name: string;
    uid?: string | null;
    status?: string | null;
    stockMode?: string | null;
    inventoryCategory?: {
      id: number;
      title: string;
      stockMode?: string | null;
    } | null;
    defaultSupplier?: {
      id: number;
      name: string;
    } | null;
  };
  pricing?: {
    price?: number | null;
    costPrice?: number | null;
  } | null;
  stocks?: Array<{
    id: number;
    qty?: number | null;
    price?: number | null;
    location?: string | null;
    supplier?: {
      id: number;
      name: string;
    } | null;
  }>;
  supplierVariants?: Array<{
    id: number;
    supplierSku?: string | null;
    costPrice?: number | null;
    salesPrice?: number | null;
    leadTimeDays?: number | null;
    preferred?: boolean | null;
    supplier?: {
      id: number;
      name: string;
    };
  }>;
  attributes?: Array<{
    id: number;
    value?: {
      id: number;
      name: string;
    } | null;
    inventoryCategoryVariantAttribute?: {
      id: number;
      valuesInventoryCategory?: {
        title: string;
      } | null;
    } | null;
  }>;
}) {
  const stockQty = (variant.stocks || []).reduce(
    (total, stock) => total + Number(stock.qty || 0),
    0,
  );
  const stockValue = (variant.stocks || []).reduce(
    (total, stock) =>
      total + Number(stock.qty || 0) * Number(stock.price || 0),
    0,
  );
  const preferredSupplier =
    (variant.supplierVariants || []).find((supplier) => supplier.preferred) ||
    variant.supplierVariants?.[0] ||
    null;
  const stockMode =
    variant.inventory?.inventoryCategory?.stockMode ||
    variant.inventory?.stockMode ||
    "unmonitored";

  return {
    id: variant.id,
    uid: variant.uid,
    sku: variant.sku,
    description: variant.description,
    status: variant.status || "draft",
    lowStockAlert: variant.lowStockAlert,
    stockQty,
    stockValue,
    isLowStock:
      variant.lowStockAlert != null && stockQty <= Number(variant.lowStockAlert),
    stockMode,
    price: variant.pricing?.price ?? null,
    costPrice: variant.pricing?.costPrice ?? null,
    inventory: variant.inventory,
    category: variant.inventory?.inventoryCategory || null,
    preferredSupplier,
    supplierCount: variant.supplierVariants?.length || 0,
    suppliers: variant.supplierVariants || [],
    stocks: variant.stocks || [],
    attributes: variant.attributes || [],
  };
}

export async function inventoryVariantsWorkspace(
  db: Db,
  query: InventoryVariantsWorkspaceQuery,
) {
  const limit = Math.min(Math.max(Number(query.limit || 50), 1), 100);
  const where: Prisma.InventoryVariantWhereInput = {
    deletedAt: null,
    inventory: {
      deletedAt: null,
      productKind: "inventory",
      ...({ sourceCustom: false } as any),
    },
  };
  const and: Prisma.InventoryVariantWhereInput[] = [];

  if (query.q?.trim()) {
    const q = query.q.trim();
    and.push({
      OR: [
        {
          sku: {
            contains: q,
          },
        },
        {
          uid: {
            contains: q,
          },
        },
        {
          description: {
            contains: q,
          },
        },
        {
          inventory: {
            name: {
              contains: q,
            },
          },
        },
      ],
    });
  }

  if (query.inventoryId) {
    and.push({
      inventoryId: query.inventoryId,
    });
  }

  if (query.categoryId) {
    and.push({
      inventory: {
        inventoryCategoryId: query.categoryId,
      },
    });
  }

  if (query.supplierId) {
    and.push({
      supplierVariants: {
        some: {
          deletedAt: null,
          active: true,
          supplierId: query.supplierId,
        },
      },
    });
  }

  if (query.status) {
    and.push({
      status: query.status,
    });
  }

  if (query.stockMode) {
    and.push({
      inventory: {
        OR: [
          {
            stockMode: query.stockMode,
          },
          {
            inventoryCategory: {
              stockMode: query.stockMode,
            },
          },
        ],
      },
    });
  }

  if (query.cursorId) {
    and.push({
      id: {
        gt: query.cursorId,
      },
    });
  }

  if (query.lowStock) {
    and.push({
      lowStockAlert: {
        gt: 0,
      },
    });
  }

  if (and.length) {
    where.AND = and;
  }

  const variants = await db.inventoryVariant.findMany({
    where,
    take: limit + 1,
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      uid: true,
      sku: true,
      description: true,
      status: true,
      lowStockAlert: true,
      inventory: {
        select: {
          id: true,
          name: true,
          uid: true,
          status: true,
          stockMode: true,
          inventoryCategory: {
            select: {
              id: true,
              title: true,
              stockMode: true,
            },
          },
          defaultSupplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      pricing: {
        select: {
          price: true,
          costPrice: true,
        },
      },
      stocks: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          qty: true,
          price: true,
          location: true,
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      supplierVariants: {
        where: {
          deletedAt: null,
          active: true,
        },
        orderBy: [
          {
            preferred: "desc",
          },
          {
            id: "asc",
          },
        ],
        select: {
          id: true,
          supplierSku: true,
          costPrice: true,
          salesPrice: true,
          leadTimeDays: true,
          preferred: true,
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      attributes: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          value: {
            select: {
              id: true,
              name: true,
            },
          },
          inventoryCategoryVariantAttribute: {
            select: {
              id: true,
              valuesInventoryCategory: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const hasMore = variants.length > limit;
  const rows = variants.slice(0, limit).map(buildInventoryVariantWorkspaceRow);
  const data = query.lowStock ? rows.filter((row) => row.isLowStock) : rows;

  return {
    data,
    meta: {
      count: data.length,
      hasMore,
      cursor: hasMore ? variants[limit - 1]?.id : null,
    },
  };
}

export type InventoryTopSalesAnalyticsQuery = {
  inventoryId?: number | null;
  categoryId?: number | null;
  supplierId?: number | null;
  from?: Date | string | null;
  to?: Date | string | null;
  limit?: number | null;
};

type InventoryTopSalesInventoryLike = {
  id?: number | null;
  name?: string | null;
  uid?: string | null;
  inventoryCategory?: {
    id?: number | null;
    title?: string | null;
  } | null;
  defaultSupplier?: {
    id?: number | null;
    name?: string | null;
  } | null;
};

type InventoryTopSalesVariantLike = {
  id?: number | null;
  uid?: string | null;
  sku?: string | null;
  description?: string | null;
  inventory?: InventoryTopSalesInventoryLike | null;
};

export type InventoryTopSalesLineLike = {
  id?: number | null;
  saleId?: number | null;
  qty?: number | null;
  unitCost?: number | null;
  totalCost?: number | null;
  inventoryId?: number | null;
  inventoryVariantId?: number | null;
  inventory?: InventoryTopSalesInventoryLike | null;
  variant?: InventoryTopSalesVariantLike | null;
  price?: {
    costPrice?: number | null;
    unitCostPrice?: number | null;
  } | null;
};

export type InventoryTopSalesAllocationLike = {
  id?: number | null;
  qty?: number | null;
  inventoryVariantId?: number | null;
  inventoryVariant?: InventoryTopSalesVariantLike | null;
  lineItemComponent?: {
    parent?: {
      saleId?: number | null;
    } | null;
  } | null;
};

type InventoryTopSalesRow = {
  key: string;
  inventoryId: number | null;
  inventoryName: string | null;
  inventoryUid: string | null;
  categoryId: number | null;
  categoryName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  inventoryVariantId: number | null;
  variantSku: string | null;
  variantUid: string | null;
  variantDescription: string | null;
  orderedQty: number;
  shippedQty: number;
  revenue: number;
  costValue: number;
  grossMargin: number;
  lineCount: number;
  saleIds: Set<number>;
  revenueLineCount: number;
  costLineCount: number;
};

function numberOrZero(value?: number | null) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function createTopSalesRow(
  key: string,
  inventory: InventoryTopSalesInventoryLike | null | undefined,
  variant?: InventoryTopSalesVariantLike | null,
): InventoryTopSalesRow {
  return {
    key,
    inventoryId: inventory?.id ?? null,
    inventoryName: inventory?.name ?? null,
    inventoryUid: inventory?.uid ?? null,
    categoryId: inventory?.inventoryCategory?.id ?? null,
    categoryName: inventory?.inventoryCategory?.title ?? null,
    supplierId: inventory?.defaultSupplier?.id ?? null,
    supplierName: inventory?.defaultSupplier?.name ?? null,
    inventoryVariantId: variant?.id ?? null,
    variantSku: variant?.sku ?? null,
    variantUid: variant?.uid ?? null,
    variantDescription: variant?.description ?? null,
    orderedQty: 0,
    shippedQty: 0,
    revenue: 0,
    costValue: 0,
    grossMargin: 0,
    lineCount: 0,
    saleIds: new Set<number>(),
    revenueLineCount: 0,
    costLineCount: 0,
  };
}

function serializeTopSalesRow(row: InventoryTopSalesRow) {
  return {
    key: row.key,
    inventoryId: row.inventoryId,
    inventoryName: row.inventoryName,
    inventoryUid: row.inventoryUid,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    inventoryVariantId: row.inventoryVariantId,
    variantSku: row.variantSku,
    variantUid: row.variantUid,
    variantDescription: row.variantDescription,
    orderedQty: roundMetric(row.orderedQty),
    shippedQty: roundMetric(row.shippedQty),
    revenue: roundMetric(row.revenue),
    costValue: roundMetric(row.costValue),
    grossMargin: roundMetric(row.grossMargin),
    lineCount: row.lineCount,
    saleCount: row.saleIds.size,
    revenueLineCount: row.revenueLineCount,
    costLineCount: row.costLineCount,
  };
}

export function buildInventoryTopSalesAnalytics(input: {
  lineItems: InventoryTopSalesLineLike[];
  allocations: InventoryTopSalesAllocationLike[];
  limit?: number | null;
}) {
  const limit = Math.min(Math.max(Number(input.limit || 10), 1), 50);
  const itemRows = new Map<string, InventoryTopSalesRow>();
  const variantRows = new Map<string, InventoryTopSalesRow>();

  function getItemRow(inventory: InventoryTopSalesInventoryLike | null | undefined) {
    const inventoryId = inventory?.id ?? null;
    const key = inventoryId ? `inventory:${inventoryId}` : "inventory:unknown";
    if (!itemRows.has(key)) {
      itemRows.set(key, createTopSalesRow(key, inventory));
    }
    return itemRows.get(key)!;
  }

  function getVariantRow(variant: InventoryTopSalesVariantLike | null | undefined) {
    const inventory = variant?.inventory;
    const inventoryId = inventory?.id ?? null;
    const variantId = variant?.id ?? null;
    const key =
      inventoryId && variantId
        ? `inventory:${inventoryId}:variant:${variantId}`
        : `inventory:${inventoryId || "unknown"}:variant:${variantId || "unknown"}`;
    if (!variantRows.has(key)) {
      variantRows.set(key, createTopSalesRow(key, inventory, variant));
    }
    return variantRows.get(key)!;
  }

  for (const line of input.lineItems) {
    const qty = numberOrZero(line.qty);
    const revenue = line.totalCost != null
      ? numberOrZero(line.totalCost)
      : numberOrZero(line.unitCost) * qty;
    const unitCost =
      line.price?.unitCostPrice != null
        ? numberOrZero(line.price.unitCostPrice)
        : numberOrZero(line.price?.costPrice);
    const costValue = unitCost > 0 ? unitCost * qty : 0;
    const saleId = line.saleId ?? null;

    const itemRow = getItemRow(line.inventory);
    const variantRow = getVariantRow({
      ...line.variant,
      inventory: line.inventory,
    });

    for (const row of [itemRow, variantRow]) {
      row.orderedQty += qty;
      row.revenue += revenue;
      row.costValue += costValue;
      row.grossMargin += costValue > 0 ? revenue - costValue : 0;
      row.lineCount += 1;
      if (saleId) row.saleIds.add(saleId);
      if (revenue > 0) row.revenueLineCount += 1;
      if (costValue > 0) row.costLineCount += 1;
    }
  }

  for (const allocation of input.allocations) {
    const qty = numberOrZero(allocation.qty);
    const variant = allocation.inventoryVariant;
    const saleId = allocation.lineItemComponent?.parent?.saleId ?? null;
    const itemRow = getItemRow(variant?.inventory);
    const variantRow = getVariantRow(variant);

    for (const row of [itemRow, variantRow]) {
      row.shippedQty += qty;
      if (saleId) row.saleIds.add(saleId);
    }
  }

  const items = Array.from(itemRows.values()).map(serializeTopSalesRow);
  const variants = Array.from(variantRows.values()).map(serializeTopSalesRow);
  const byOrdered = <T extends { orderedQty: number; revenue: number }>(rows: T[]) =>
    [...rows]
      .sort((a, b) => b.orderedQty - a.orderedQty || b.revenue - a.revenue)
      .slice(0, limit);
  const byShipped = <T extends { shippedQty: number; orderedQty: number }>(rows: T[]) =>
    [...rows]
      .sort((a, b) => b.shippedQty - a.shippedQty || b.orderedQty - a.orderedQty)
      .slice(0, limit);

  return {
    summary: {
      inventoryBackedLineCount: input.lineItems.length,
      consumedAllocationCount: input.allocations.length,
      orderedQty: roundMetric(
        items.reduce((total, row) => total + row.orderedQty, 0),
      ),
      shippedQty: roundMetric(
        items.reduce((total, row) => total + row.shippedQty, 0),
      ),
      revenue: roundMetric(items.reduce((total, row) => total + row.revenue, 0)),
      costValue: roundMetric(
        items.reduce((total, row) => total + row.costValue, 0),
      ),
      grossMargin: roundMetric(
        items.reduce((total, row) => total + row.grossMargin, 0),
      ),
      revenueReliableLineCount: items.reduce(
        (total, row) => total + row.revenueLineCount,
        0,
      ),
      costReliableLineCount: items.reduce(
        (total, row) => total + row.costLineCount,
        0,
      ),
    },
    topItemsByOrderedQty: byOrdered(items),
    topItemsByShippedQty: byShipped(items),
    topVariantsByOrderedQty: byOrdered(variants),
    topVariantsByShippedQty: byShipped(variants),
    caveats: [
      "Only inventory-backed sales line items are included.",
      "Shipped quantity is based on consumed stock allocations.",
      "Revenue and cost use persisted line/pricing snapshots and may exclude legacy-only or unmapped sales.",
    ],
  };
}

function parseAnalyticsDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function inventoryTopSalesAnalytics(
  db: Db,
  query: InventoryTopSalesAnalyticsQuery = {},
) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const from = parseAnalyticsDate(query.from) || defaultFrom;
  const to = parseAnalyticsDate(query.to) || now;
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 50);

  const inventoryWhere: Prisma.InventoryWhereInput = {
    deletedAt: null,
    productKind: "inventory",
    ...({ sourceCustom: false } as any),
  };
  if (query.inventoryId) {
    inventoryWhere.id = query.inventoryId;
  }
  if (query.categoryId) {
    inventoryWhere.inventoryCategoryId = query.categoryId;
  }
  if (query.supplierId) {
    inventoryWhere.defaultSupplierId = query.supplierId;
  }

  const lineItems = await db.lineItem.findMany({
    where: {
      deletedAt: null,
      lineItemType: "SALE",
      inventory: inventoryWhere,
      sale: {
        is: {
          deletedAt: null,
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      },
    },
    take: 2000,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      saleId: true,
      qty: true,
      unitCost: true,
      totalCost: true,
      inventoryId: true,
      inventoryVariantId: true,
      inventory: {
        select: {
          id: true,
          name: true,
          uid: true,
          inventoryCategory: {
            select: {
              id: true,
              title: true,
            },
          },
          defaultSupplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      variant: {
        select: {
          id: true,
          uid: true,
          sku: true,
          description: true,
        },
      },
      price: {
        select: {
          costPrice: true,
          unitCostPrice: true,
        },
      },
    },
  });

  const allocationInventoryWhere: Prisma.InventoryWhereInput = {
    deletedAt: null,
    productKind: "inventory",
    ...({ sourceCustom: false } as any),
  };
  if (query.inventoryId) {
    allocationInventoryWhere.id = query.inventoryId;
  }
  if (query.categoryId) {
    allocationInventoryWhere.inventoryCategoryId = query.categoryId;
  }
  if (query.supplierId) {
    allocationInventoryWhere.defaultSupplierId = query.supplierId;
  }

  const allocations = await db.stockAllocation.findMany({
    where: {
      deletedAt: null,
      status: "consumed",
      inventoryVariant: {
        inventory: allocationInventoryWhere,
      },
      lineItemComponent: {
        parent: {
          deletedAt: null,
          lineItemType: "SALE",
          sale: {
            is: {
              deletedAt: null,
              createdAt: {
                gte: from,
                lte: to,
              },
            },
          },
        },
      },
    },
    take: 2000,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      qty: true,
      inventoryVariantId: true,
      inventoryVariant: {
        select: {
          id: true,
          uid: true,
          sku: true,
          description: true,
          inventory: {
            select: {
              id: true,
              name: true,
              uid: true,
              inventoryCategory: {
                select: {
                  id: true,
                  title: true,
                },
              },
              defaultSupplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      lineItemComponent: {
        select: {
          parent: {
            select: {
              saleId: true,
            },
          },
        },
      },
    },
  });

  return {
    ...buildInventoryTopSalesAnalytics({
      lineItems,
      allocations,
      limit,
    }),
    period: {
      from,
      to,
      defaultWindowDays: 90,
    },
  };
}
export async function lowStockSummary(db: Db) {
  const variants = await db.inventoryVariant.findMany({
    where: {
      deletedAt: null,
      lowStockAlert: {
        gt: 0,
      },
      inventory: {
        deletedAt: null,
        stockMode: "monitored" as StockModes,
        productKind: "inventory",
        ...({ sourceCustom: false } as any),
      },
    },
    select: {
      id: true,
      uid: true,
      lowStockAlert: true,
      inventoryId: true,
      inventory: {
        select: {
          id: true,
          name: true,
        },
      },
      attributes: {
        select: {
          value: {
            select: {
              name: true,
            },
          },
        },
      },
      stockMovements: {
        where: {
          deletedAt: null,
          status: "completed",
        },
        select: {
          changeQty: true,
        },
      },
    },
  });

  const rows = variants
    .map((variant) => {
      const qty = sum(variant.stockMovements, "changeQty");
      const threshold = Number(variant.lowStockAlert || 0);
      const shortage = Math.max(0, threshold - qty);
      const variantTitle = variant.attributes
        .map((attribute) => attribute.value?.name)
        .filter(Boolean)
        .join(" ");

      return {
        id: variant.id,
        uid: variant.uid,
        inventoryId: variant.inventoryId,
        inventoryName: variant.inventory?.name || "Untitled inventory",
        variantTitle: variantTitle || null,
        qty,
        threshold,
        shortage,
      };
    })
    .filter((variant) => variant.qty <= variant.threshold)
    .sort((a, b) => {
      if (a.shortage !== b.shortage) {
        return b.shortage - a.shortage;
      }
      if (a.qty !== b.qty) {
        return a.qty - b.qty;
      }
      return `${a.inventoryName} ${a.variantTitle || ""}`.localeCompare(
        `${b.inventoryName} ${b.variantTitle || ""}`,
      );
    });

  return {
    total: rows.length,
    items: rows.slice(0, 5),
  };
}
export async function pendingInboundSummary(db: Db) {}

export async function saveInventory(db: Db, data: InventoryForm) {
  let inventoryId = data.product.id;
  let inventoryUid;
  const { product } = data;
  const productKind = (product.productKind ||
    "inventory") as InventoryProductKind;
  const category = await db.inventoryCategory.findUnique({
    where: {
      id: product.categoryId,
    },
    select: {
      stockMode: true,
    },
  });
  const stockMode = (category?.stockMode || "unmonitored") as StockModes;
  if (inventoryId) {
    inventoryUid = (
      await db.inventory.update({
        where: {
          id: inventoryId,
        },
        data: {
          status: product.status,
          name: product.name,
          defaultSupplierId: product.defaultSupplierId || null,
          productKind,
          ...({
            sourceStepUid: null,
            sourceComponentUid: null,
            sourceCustom: false,
          } as any),
          stockMode,
          description: product.description,
          primaryStoreFront: product.primaryStoreFront,
        },
      })
    )?.uid;
  } else {
    const inventory = await db.inventory.create({
      data: {
        name: product.name,
        uid: generateRandomString(4),
        defaultSupplierId: product.defaultSupplierId || null,
        productKind,
        ...({
          sourceStepUid: null,
          sourceComponentUid: null,
          sourceCustom: false,
        } as any),
        description: product.description,
        status: product.status,
        publishedAt: product.status == "published" ? new Date() : null,
        stockMode,
        primaryStoreFront: product.primaryStoreFront || false,
        inventoryCategory: {
          connect: {
            id: product.categoryId,
          },
        },
        images: !data.images?.length
          ? undefined
          : {
              createMany: {
                data: data.images.map((i) => ({
                  altText: i.altText,
                  imageGalleryId: i.imageGalleryId,
                  position: i.position,
                })),
              },
            },
      },
    });
    inventoryUid = inventory.uid;
    inventoryId = inventory.id;
  }

  const suppliers = data.suppliers || [];
  for (const supplier of suppliers) {
    if (!supplier?.name?.trim()) continue;
    if (supplier.id) {
      await db.supplier.update({
        where: {
          id: supplier.id,
        },
        data: {
          uid: supplier.uid || undefined,
          name: supplier.name,
          email: supplier.email || null,
          phone: supplier.phone || null,
          address: supplier.address || null,
          deletedAt: null,
        },
      });
    } else {
      await db.supplier.create({
        data: {
          uid: supplier.uid || generateRandomString(5),
          name: supplier.name,
          email: supplier.email || null,
          phone: supplier.phone || null,
          address: supplier.address || null,
        },
      });
    }
  }

  queueInventoryToDykeSync({
    inventoryId,
    source: "inventory-form",
  }).catch(() => {});

  return { id: inventoryId, uid: inventoryUid };
}
export async function inventoryForm(db: Db, inventoryId) {
  const inv = await db.inventory.findUniqueOrThrow({
    where: {
      id: inventoryId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      productKind: true,
      status: true,
      stockMode: true,
      primaryStoreFront: true,
      inventoryCategoryId: true,
      defaultSupplierId: true,
      subComponents: {
        where: {
          deletedAt: null,
        },
      },
      inventoryItemSubCategories: {
        where: {
          deletedAt: null,
        },
        include: {
          inventorySubCategory: true,
          value: {
            select: {
              inventoryId: true,
              inventory: {
                select: {
                  inventoryCategoryId: true,
                },
              },
            },
          },
        },
      },
      inventoryCategory: {
        select: {
          enablePricing: true,
          stockMode: true,
        },
      },
      variants: {
        select: {
          id: true,
          uid: true,
          supplierVariants: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              supplierId: true,
              supplierSku: true,
              costPrice: true,
              salesPrice: true,
              minOrderQty: true,
              leadTimeDays: true,
              preferred: true,
              active: true,
            },
          },
        },
      },
    },
  });
  const suppliers = await db.supplier.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
  });

  const formData = {
    product: {
      categoryId: inv.inventoryCategoryId,
      defaultSupplierId: inv.defaultSupplierId,
      name: inv.name,
      productKind: (inv.productKind || "inventory") as InventoryProductKind,
      status: inv.status as any,
      stockMonitor:
        ((inv.inventoryCategory?.stockMode || inv.stockMode || "unmonitored") as StockModes) ==
        "monitored",
      description: inv.description,
      id: inv?.id!,
      primaryStoreFront: !!inv.primaryStoreFront,
    },
    variants: [],
    category: {
      id: inv.inventoryCategoryId,
      enablePricing: inv.inventoryCategory?.enablePricing!,
    },
    images: [],
    suppliers: suppliers.map((supplier) => ({
      id: supplier.id,
      uid: supplier.uid,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
    })),
    supplierVariants: inv.variants.flatMap((variant) =>
      variant.supplierVariants.map((supplierVariant) => ({
        id: supplierVariant.id,
        supplierId: supplierVariant.supplierId,
        inventoryVariantId: variant.id,
        variantUid: variant.uid,
        supplierSku: supplierVariant.supplierSku,
        costPrice: supplierVariant.costPrice,
        salesPrice: supplierVariant.salesPrice,
        minOrderQty: supplierVariant.minOrderQty,
        leadTimeDays: supplierVariant.leadTimeDays,
        preferred: supplierVariant.preferred,
        active: supplierVariant.active,
      })),
    ),
    subComponents: inv.subComponents.map((a) => ({
      id: a.id,
      inventoryCategoryId: a.inventoryCategoryId,
      defaultInventoryId: a.defaultInventoryId,
      parentId: a.parentId!,
      index: a.index,
      status: a.status as INVENTORY_STATUS,
    })),
    subCategories: inv.inventoryItemSubCategories
      .filter(
        (a, ai) =>
          inv.inventoryItemSubCategories.findIndex(
            (b) => b.inventorySubCategoryId == a.inventorySubCategoryId,
          ) === ai,
      )
      .map((s) => {
        const values = inv.inventoryItemSubCategories.filter(
          (a) => a.inventorySubCategoryId === s.inventorySubCategoryId,
        );
        return {
          valueIds: values
            .filter((v) => !v.deletedAt)
            .map((a) => String(a.value?.inventoryId)),
          categoryId: s.value?.inventory?.inventoryCategoryId,
          values: values.map((v) => ({
            id: v.id,
            inventoryId: v.inventoryId,
            deleted: !!v.deletedAt,
          })),
        };
      }),
  } satisfies InventoryForm;
  return formData;
}

export async function inventorySuppliers(db: Db, query: InventorySuppliers) {
  return db.supplier.findMany({
    where: {
      deletedAt: null,
      ...(query.q
        ? {
            name: {
              contains: query.q,
            },
          }
        : {}),
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function saveInventorySupplier(
  db: Db,
  input: InventorySupplierForm,
) {
  const payload = {
    uid: input.uid || generateRandomString(5),
    name: input.name,
    email: input.email || null,
    phone: input.phone || null,
    address: input.address || null,
    deletedAt: null,
  };

  if (input.id) {
    return db.supplier.update({
      where: {
        id: input.id,
      },
      data: payload,
    });
  }

  return db.supplier.create({
    data: payload,
  });
}

export async function deleteInventorySupplier(db: Db, input: { id: number }) {
  return db.supplier.update({
    where: {
      id: input.id,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}

export async function saveSupplierVariantForm(
  db: Db,
  input: SupplierVariantForm,
) {
  if (input.preferred) {
    await db.supplierVariant.updateMany({
      where: {
        inventoryVariantId: input.inventoryVariantId,
        deletedAt: null,
      },
      data: {
        preferred: false,
      },
    });
  }

  const payload = {
    supplierId: input.supplierId,
    inventoryVariantId: input.inventoryVariantId,
    supplierSku: input.supplierSku || null,
    costPrice: input.costPrice ?? null,
    salesPrice: input.salesPrice ?? null,
    minOrderQty: input.minOrderQty ?? null,
    leadTimeDays: input.leadTimeDays ?? null,
    preferred: input.preferred ?? false,
    active: input.active ?? true,
    deletedAt: null,
  };

  if (input.id) {
    const result = await db.supplierVariant.update({
      where: {
        id: input.id,
      },
      data: payload,
      include: {
        supplier: true,
      },
    });

    queueInventoryToDykeSync({
      inventoryVariantId: input.inventoryVariantId,
      source: "supplier-variant",
    }).catch(() => {});

    return result;
  }

  const result = await db.supplierVariant.upsert({
    where: {
      supplierId_inventoryVariantId: {
        supplierId: input.supplierId,
        inventoryVariantId: input.inventoryVariantId,
      },
    },
    update: payload,
    create: payload,
    include: {
      supplier: true,
    },
  });

  queueInventoryToDykeSync({
    inventoryVariantId: input.inventoryVariantId,
    source: "supplier-variant",
  }).catch(() => {});

  return result;
}

export async function supplierVariantsByInventory(db: Db, inventoryId: number) {
  return db.supplierVariant.findMany({
    where: {
      deletedAt: null,
      inventoryVariant: {
        inventoryId,
      },
    },
    include: {
      supplier: true,
      inventoryVariant: {
        select: {
          id: true,
          uid: true,
          sku: true,
        },
      },
    },
    orderBy: [{ preferred: "desc" }, { supplier: { name: "asc" } }],
  });
}

export async function backfillInventoryProductKinds(db: Db) {
  const inventories = await db.inventory.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      productKind: true,
      variants: {
        where: {
          deletedAt: null,
        },
        select: {
          pricing: {
            select: {
              costPrice: true,
              price: true,
            },
          },
          supplierVariants: {
            where: {
              deletedAt: null,
              active: true,
            },
            select: {
              costPrice: true,
              salesPrice: true,
            },
          },
        },
      },
      variantPricings: {
        where: {
          deletedAt: null,
        },
        select: {
          costPrice: true,
          price: true,
        },
      },
    },
  });

  let inventoryCount = 0;
  let componentCount = 0;
  let unchangedCount = 0;

  for (const inventory of inventories) {
    const hasMeaningfulPrice =
      inventory.variantPricings.some(
        (pricing) =>
          Number(pricing.costPrice || 0) > 0 || Number(pricing.price || 0) > 0,
      ) ||
      inventory.variants.some(
        (variant) =>
          Number(variant.pricing?.costPrice || 0) > 0 ||
          Number(variant.pricing?.price || 0) > 0 ||
          variant.supplierVariants.some(
            (supplierVariant) =>
              Number(supplierVariant.costPrice || 0) > 0 ||
              Number(supplierVariant.salesPrice || 0) > 0,
          ),
      );

    const nextKind: InventoryProductKind = hasMeaningfulPrice
      ? "inventory"
      : "component";

    if (inventory.productKind === nextKind) {
      unchangedCount += 1;
      continue;
    }

    await db.inventory.update({
      where: {
        id: inventory.id,
      },
      data: {
        productKind: nextKind,
        stockMode: nextKind === "component" ? "unmonitored" : undefined,
      },
    });

    if (nextKind === "inventory") inventoryCount += 1;
    else componentCount += 1;
  }

  return {
    inventoryCount,
    componentCount,
    unchangedCount,
    total: inventories.length,
  };
}

export async function backfillInventoryImportSources(db: Db) {
  const inventoriesRaw = await db.inventory.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      uid: true,
      ...({
        sourceCustom: true,
        sourceStepUid: true,
        sourceComponentUid: true,
      } as any),
    },
  });

  const inventories = inventoriesRaw as unknown as Array<{
    id: number;
    uid: string | null;
    sourceCustom?: boolean | null;
    sourceStepUid?: string | null;
    sourceComponentUid?: string | null;
  }>;

  const inventoryUids = inventories
    .map((inventory) => inventory.uid)
    .filter((uid): uid is string => !!uid);

  const dykeProducts = await db.dykeStepProducts.findMany({
    where: {
      deletedAt: null,
      uid: {
        in: inventoryUids,
      },
    },
    select: {
      uid: true,
      custom: true,
      step: {
        select: {
          uid: true,
        },
      },
    },
  });

  const dykeByUid = new Map<
    string,
    {
      sourceComponentUid: string;
      sourceStepUid: string | null;
      sourceCustom: boolean;
    }
  >(
    dykeProducts
      .filter((product) => !!product.uid)
      .map((product) => [
        product.uid!,
        {
          sourceComponentUid: product.uid!,
          sourceStepUid: product.step?.uid || null,
          sourceCustom: !!product.custom,
        },
      ]),
  );

  let updated = 0;
  let unchanged = 0;

  for (const inventory of inventories) {
    if (!inventory.uid) {
      unchanged += 1;
      continue;
    }

    const match = dykeByUid.get(inventory.uid);
    if (!match) {
      unchanged += 1;
      continue;
    }

    const shouldUpdate =
      inventory.sourceCustom !== match.sourceCustom ||
      (inventory.sourceStepUid || null) !== match.sourceStepUid ||
      (inventory.sourceComponentUid || null) !== match.sourceComponentUid;

    if (!shouldUpdate) {
      unchanged += 1;
      continue;
    }

    await db.inventory.update({
      where: {
        id: inventory.id,
      },
      data: {
        ...({
          sourceCustom: match.sourceCustom,
          sourceStepUid: match.sourceStepUid,
          sourceComponentUid: match.sourceComponentUid,
        } as any),
      },
    });

    updated += 1;
  }

  return {
    total: inventories.length,
    matched: dykeByUid.size,
    updated,
    unchanged,
  };
}

function meaningfulPriceWhere(): Prisma.InventoryWhereInput {
  return {
    OR: [
      {
        variantPricings: {
          some: {
            deletedAt: null,
            OR: [{ costPrice: { gt: 0 } }, { price: { gt: 0 } }],
          },
        },
      },
      {
        variants: {
          some: {
            deletedAt: null,
            OR: [
              {
                pricing: {
                  is: {
                    OR: [{ costPrice: { gt: 0 } }, { price: { gt: 0 } }],
                  },
                },
              },
              {
                supplierVariants: {
                  some: {
                    deletedAt: null,
                    active: true,
                    OR: [{ costPrice: { gt: 0 } }, { salesPrice: { gt: 0 } }],
                  },
                },
              },
            ],
          },
        },
      },
    ],
  };
}

export async function inventoryProductKindReview(
  db: Db,
  query: InventoryProductKindReview,
) {
  const baseWhere: Prisma.InventoryWhereInput = {
    deletedAt: null,
  };
  const params = await composeQueryData(query, baseWhere, db.inventory, {
    sortFn(sort, sortOrder) {
      if (sort === "name") {
        return { name: sortOrder };
      }
      return { name: "asc" };
    },
  });

  const [inventories, total, pricedCount, mismatchInventoryCount, mismatchComponentCount] =
    await Promise.all([
      db.inventory.findMany({
        ...params.queryProps,
        select: {
          id: true,
          uid: true,
          name: true,
          productKind: true,
          inventoryCategory: {
            select: {
              title: true,
            },
          },
          _count: {
            select: {
              variants: {
                where: {
                  deletedAt: null,
                },
              },
              variantPricings: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      }),
      db.inventory.count({
        where: baseWhere,
      }),
      db.inventory.count({
        where: {
          ...baseWhere,
          ...meaningfulPriceWhere(),
        },
      }),
      db.inventory.count({
        where: {
          ...baseWhere,
          productKind: "inventory",
          NOT: meaningfulPriceWhere(),
        },
      }),
      db.inventory.count({
        where: {
          ...baseWhere,
          productKind: "component",
          ...meaningfulPriceWhere(),
        },
      }),
    ]);

  const pageIds = inventories.map((item) => item.id);
  const pricedPageRows = pageIds.length
    ? await db.inventory.findMany({
        where: {
          id: {
            in: pageIds,
          },
          ...meaningfulPriceWhere(),
        },
        select: {
          id: true,
        },
      })
    : [];

  const pricedInventoryIds = new Set(pricedPageRows.map((item) => item.id));

  const rows = inventories.map((inventory) => {
    const hasMeaningfulPrice = pricedInventoryIds.has(inventory.id);

    const suggestedKind: InventoryProductKind = hasMeaningfulPrice
      ? "inventory"
      : "component";

    return {
      id: inventory.id,
      uid: inventory.uid,
      name: inventory.name,
      category: inventory.inventoryCategory?.title || null,
      currentKind: (inventory.productKind ||
        "inventory") as InventoryProductKind,
      suggestedKind,
      hasMeaningfulPrice,
      variantCount: inventory._count.variants,
      pricingCount: inventory._count.variantPricings,
      needsReview: (inventory.productKind || "inventory") !== suggestedKind,
    };
  });

  return {
    ...params.response(rows),
    summary: {
      total,
      priced: pricedCount,
      componentSuggested: total - pricedCount,
      mismatched: mismatchInventoryCount + mismatchComponentCount,
    },
  };
}

function whereStockAllocationReview(query: StockAllocationReview) {
  const wheres: Prisma.StockAllocationWhereInput[] = [
    {
      deletedAt: null,
    },
  ];
  if (query.saleId) {
    wheres.push({
      lineItemComponent: {
        parent: {
          saleId: query.saleId,
        },
      },
    });
  }
  if (query.inventoryId) {
    wheres.push({
      inventoryVariant: {
        inventoryId: query.inventoryId,
      },
    });
  }
  if (query.inventoryVariantId) {
    wheres.push({
      inventoryVariantId: query.inventoryVariantId,
    });
  }
  if (query.status?.length) {
    wheres.push({
      status: {
        in: query.status as any,
      },
    });
  }
  return composeQuery(wheres);
}

export async function pendingStockAllocations(
  db: Db,
  query: StockAllocationReview,
) {
  const where = whereStockAllocationReview({
    ...query,
    status: query.status?.length ? query.status : ["pending_review"],
  });
  const params = await composeQueryData(query, where, db.stockAllocation, {
    sortFn(sort, sortOrder) {
      if (sort === "createdAt") return { createdAt: sortOrder };
      return { createdAt: "asc" };
    },
  });

  const rows = await db.stockAllocation.findMany({
    ...params.queryProps,
    include: {
      inventoryStock: {
        select: {
          id: true,
          qty: true,
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      inventoryVariant: {
        select: {
          id: true,
          sku: true,
          uid: true,
          inventoryId: true,
          inventory: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      lineItemComponent: {
        select: {
          id: true,
          qty: true,
          status: true,
          parent: {
            select: {
              id: true,
              title: true,
              saleId: true,
              sale: {
                select: {
                  id: true,
                  orderId: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return params.response(
    rows.map((row) => ({
      id: row.id,
      qty: row.qty,
      status: row.status,
      notes: row.notes,
      inventoryStockId: row.inventoryStockId,
      inventoryStockQty: Number(row.inventoryStock?.qty || 0),
      supplierName: row.inventoryStock?.supplier?.name || null,
      inventoryVariant: row.inventoryVariant,
      lineItemComponent: row.lineItemComponent,
      shortageQty: Math.max(
        0,
        Number(row.lineItemComponent?.qty || 0) - Number(row.qty || 0),
      ),
      createdAt: row.createdAt,
    })),
  );
}

export async function approveStockAllocation(
  db: Db,
  input: ApproveStockAllocation,
) {
  const allocation = await db.stockAllocation.findFirst({
    where: {
      id: input.allocationId,
      deletedAt: null,
      status: "pending_review",
    },
    select: {
      id: true,
      qty: true,
      lineItemComponentId: true,
    },
  });
  if (!allocation) {
    return {
      ok: true,
      allocationId: input.allocationId,
      skipped: true,
      reason: "not_pending_review",
    };
  }

  const updated = await db.stockAllocation.updateMany({
    where: {
      id: allocation.id,
      deletedAt: null,
      status: "pending_review",
    },
    data: {
      qty: input.approvedQty == null ? allocation.qty : Number(input.approvedQty || 0),
      status: "approved",
      notes: input.notes || undefined,
      deletedAt: null,
    },
  });
  if (updated.count === 0) {
    return {
      ok: true,
      allocationId: allocation.id,
      skipped: true,
      reason: "not_pending_review",
    };
  }

  await recomputeLineItemComponentFromAllocationState(
    db,
    allocation.lineItemComponentId,
  );

  return {
    ok: true,
    allocationId: allocation.id,
    skipped: false,
  };
}

export async function rejectStockAllocation(
  db: Db,
  input: RejectStockAllocation,
) {
  const allocation = await db.stockAllocation.findFirst({
    where: {
      id: input.allocationId,
      deletedAt: null,
      status: "pending_review",
    },
    select: {
      id: true,
      lineItemComponentId: true,
    },
  });
  if (!allocation) {
    return {
      ok: true,
      allocationId: input.allocationId,
      skipped: true,
      reason: "not_pending_review",
    };
  }

  const updated = await db.stockAllocation.updateMany({
    where: {
      id: allocation.id,
      deletedAt: null,
      status: "pending_review",
    },
    data: {
      status: "cancelled",
      notes: input.notes || undefined,
      deletedAt: new Date(),
    },
  });
  if (updated.count === 0) {
    return {
      ok: true,
      allocationId: allocation.id,
      skipped: true,
      reason: "not_pending_review",
    };
  }

  await recomputeLineItemComponentFromAllocationState(
    db,
    allocation.lineItemComponentId,
  );

  return {
    ok: true,
    allocationId: allocation.id,
    skipped: false,
  };
}

export async function approveBulkStockAllocation(
  db: Db,
  input: BulkApproveStockAllocation,
) {
  const allocationIds = Array.from(new Set(input.allocationIds));
  const allocations = await db.stockAllocation.findMany({
    where: {
      id: {
        in: allocationIds,
      },
      deletedAt: null,
      status: "pending_review",
    },
    select: {
      id: true,
      lineItemComponentId: true,
    },
  });

  if (!allocations.length) {
    return {
      ok: true,
      count: 0,
      skippedCount: allocationIds.length,
    };
  }

  const updated = await db.stockAllocation.updateMany({
    where: {
      id: {
        in: allocations.map((allocation) => allocation.id),
      },
      deletedAt: null,
      status: "pending_review",
    },
    data: {
      status: "approved",
    },
  });
  if (updated.count === 0) {
    return {
      ok: true,
      count: 0,
      skippedCount: allocationIds.length,
    };
  }

  const componentIds = Array.from(
    new Set(allocations.map((allocation) => allocation.lineItemComponentId)),
  );
  for (const componentId of componentIds) {
    await recomputeLineItemComponentFromAllocationState(db, componentId);
  }

  return {
    ok: true,
    count: updated.count,
    skippedCount: Math.max(0, allocationIds.length - updated.count),
  };
}

export async function reportInboundItemIssue(
  db: Db,
  input: InboundItemIssueForm,
) {
  const payload = {
    inboundShipmentItemId: input.inboundShipmentItemId,
    issueType: input.issueType,
    reportedQty: Number(input.reportedQty || 0),
    notes: input.notes || null,
    status: input.status || "open",
    resolutionType: input.resolutionType || null,
    resolvedQty: Number(input.resolvedQty || 0),
  };

  if (input.id) {
    return db.inboundShipmentItemIssue.update({
      where: {
        id: input.id,
      },
      data: payload,
    });
  }

  return db.inboundShipmentItemIssue.create({
    data: payload,
  });
}

export async function resolveInboundItemIssue(
  db: Db,
  input: ResolveInboundItemIssue,
) {
  return db.inboundShipmentItemIssue.update({
    where: {
      id: input.issueId,
    },
    data: {
      status: input.status || "resolved",
      resolutionType: input.resolutionType || null,
      resolvedQty: input.resolvedQty == null ? undefined : Number(input.resolvedQty || 0),
      notes: input.notes || undefined,
    },
  });
}

export async function saveVariantForm(db: Db, data: VariantForm) {
  if (!data.id) {
    const variant = await db.inventoryVariant.create({
      data: {
        uid: generateRandomString(5),
        sku: data.sku,
        description: data.description,
        status: data.status,
        lowStockAlert: data.lowStockAlert,
        publishedAt: data.status == "published" ? new Date() : null,
        attributes: {
          createMany: data.attributes?.length
            ? {
                data: data.attributes!?.map((a) => ({
                  inventoryCategoryVariantAttributeId: a.attributeId,
                  valueId: a.inventoryId,
                })),
              }
            : undefined,
        },
        pricingHistories: {
          create: {
            effectiveFrom: new Date(),
            newCostPrice: data.price || 0,
          },
        },
        pricing: {
          create: {
            costPrice: data.price || 0,
          },
        },
        inventory: {
          connect: {
            id: data.inventoryId,
          },
        },
      },
    });

    queueInventoryToDykeSync({
      inventoryId: data.inventoryId,
      inventoryVariantId: variant.id,
      source: "variant-form",
    }).catch(() => {});
  } else {
    const priceUpdate = data.price != data.oldPrice;
    await db.inventoryVariant.update({
      where: {
        id: data.id,
      },
      data: {
        lowStockAlert: data.lowStockAlert,
        pricingHistories: {
          create: !priceUpdate
            ? undefined
            : {
                changedBy: data.authorName,
                changeReason: data.changeReason,
                effectiveFrom: new Date(),
                oldCostPrice: data.oldPrice,
                newCostPrice: data.price!,
                source: data.priceUpdateSource,
              },
        },
        pricing: !priceUpdate
          ? undefined
          : {
              update: !data.pricingId
                ? undefined
                : {
                    costPrice: data.price!,
                  },
              create: data.pricingId
                ? undefined
                : {
                    costPrice: data.price!,
                  },
            },
      },
    });

    queueInventoryToDykeSync({
      inventoryId: data.inventoryId,
      inventoryVariantId: data.id ?? null,
      source: "variant-form",
    }).catch(() => {});
  }
}
export async function inventoryCategories(db: Db, query: InventoryCategories) {
  const where = whereInventoryCategories(query);
  const params = await composeQueryData(query, where, db.inventoryCategory);
  const data = await db.inventoryCategory.findMany({
    ...params.queryProps,
    select: {
      id: true,
      title: true,
      description: true,
      ...({ productKind: true } as any),
      stockMode: true,
      type: true,
      _count: {
        select: {
          inventories: {
            where: {
              deletedAt: null,
            },
          },
          categoryVariantAttributes: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });
  const response = await params.response(
    data.map((item) => {
      return item;
    }),
  );
  return response;
}
function whereInventoryCategories(query: InventoryCategories) {
  const wheres: Prisma.InventoryCategoryWhereInput[] = [];
  if (query.q) {
    wheres.push({
      title: {
        contains: query.q,
      },
    });
  }
  if (query.productKind) {
    wheres.push({
      ...({ productKind: query.productKind } as any),
    });
  }
  return composeQuery(wheres);
}
export async function deleteSubComponent(db: Db, id) {
  await db.subComponents.update({
    where: {
      id,
    },
    data: {
      deletedAt: null,
    },
  });
}
export async function deleteInventories(db: Db, ids) {
  await db.inventory.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data: {
      deletedAt: new Date(),
    },
  });

  for (const id of ids) {
    queueInventoryToDykeSync({
      inventoryId: id,
      source: "repair",
    }).catch(() => {});
  }
}
export async function deleteInventoryCategory(db: Db, id) {
  await db.inventoryCategory.update({
    where: {
      id,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  queueInventoryToDykeSync({
    inventoryCategoryId: id,
    source: "repair",
  }).catch(() => {});
}

export async function saveInventoryCategoryForm(
  db: Db,
  data: InventoryCategoryForm,
) {
  let id = data.id;
  if (!id) {
    const created = await db.inventoryCategory.create({
      data: {
        title: data.title,
        uid: generateRandomString(5),
        ...({ productKind: data.productKind } as any),
        stockMode: data.stockMode || "unmonitored",
        enablePricing: data.enablePricing,
        description: data.description,
        type: data.type,
        categoryVariantAttributes: data.categoryVariantAttributes?.length
          ? {
              createMany: {
                data: data.categoryVariantAttributes?.map((cva) => ({
                  valuesInventoryCategoryId: cva.valuesInventoryCategoryId!,
                })),
              },
            }
          : undefined,
      },
    });

    queueInventoryToDykeSync({
      inventoryCategoryId: created.id,
      source: "category-form",
    }).catch(() => {});

    return created;
  } else {
    const updated = await db.inventoryCategory.update({
      where: {
        id: data.id!,
      },
      data: {
        title: data.title,
        ...({ productKind: data.productKind } as any),
        stockMode: data.stockMode || "unmonitored",
        enablePricing: data.enablePricing,
        description: data.description,
      },
    });

    queueInventoryToDykeSync({
      inventoryCategoryId: data.id ?? null,
      source: "category-form",
    }).catch(() => {});

    return updated;
  }
}
export async function updateCategoryVariantAttribute(
  db: Db,
  data: UpdateCategoryVariantAttribute,
) {
  if (!data.id)
    return await db.inventoryCategoryVariantAttribute.create({
      data: {
        inventoryCategoryId: data.inventoryCategoryId!,
        valuesInventoryCategoryId: data.valuesInventoryCategoryId!,
      },
    });
  return await db.inventoryCategoryVariantAttribute.update({
    where: {
      id: data.id!,
      deletedAt: {},
    },
    data: {
      deletedAt: data.active ? null : new Date(),
    },
  });
}

export async function updateCategoryStockMode(
  db: Db,
  data: UpdateCategoryStockMode,
) {
  return db.inventoryCategory.update({
    where: {
      id: data.id,
    },
    data: {
      stockMode: data.stockMode,
    },
    select: {
      id: true,
      stockMode: true,
    },
  });
}

export async function updateInventoryProductKind(
  db: Db,
  data: UpdateInventoryProductKind,
) {
  return db.inventory.update({
    where: {
      id: data.id,
    },
    data: {
      productKind: data.productKind,
      stockMode: data.productKind === "component" ? "unmonitored" : undefined,
    },
    select: {
      id: true,
      productKind: true,
      stockMode: true,
    },
  });
}

export async function updateCategoryProductKind(
  db: Db,
  data: UpdateCategoryProductKind,
) {
  return db.inventoryCategory.update({
    where: {
      id: data.id,
    },
    data: {
      productKind: data.productKind,
      stockMode: data.productKind === "component" ? "unmonitored" : undefined,
    },
    select: {
      id: true,
      productKind: true,
      stockMode: true,
    },
  });
}
export const updateSubCategorySchema = z.object({
  categoryId: z.number(),
  inventoryId: z.number(),
  valueInventoryId: z.number(),
});
export type UpdateSubCategory = z.infer<typeof updateSubCategorySchema>;

export async function updateSubCategory(db: Db, data: UpdateSubCategory) {
  const subCat = await db.inventoryItemSubCategory.findFirst({
    where: {
      inventorySubCategoryId: data.categoryId,
      deletedAt: {},
      value: {
        inventoryId: data.valueInventoryId,
      },
    },
    include: {
      value: {},
    },
  });
  if (subCat) {
    return await db.inventoryItemSubCategory.update({
      where: { id: subCat.id, deletedAt: {} },
      data: {
        deletedAt: subCat?.deletedAt ? null : new Date(),
      },
    });
  } else {
    return await db.inventoryItemSubCategory.create({
      data: {
        inventoryId: data.inventoryId,
        inventorySubCategoryId: data.categoryId,
        value: {
          create: {
            inventoryId: data.valueInventoryId,
          },
        },
      },
    });
  }
}
export async function updateSubComponent(db: Db, data: UpdateSubComponent) {
  const subCat = await db.subComponents.findFirst({
    where: data.id
      ? {
          id: data.id,
          deletedAt: {},
        }
      : {
          parentId: data.parentId,
          inventoryCategoryId: data.inventoryCategoryId,
          deletedAt: {},
        },
    include: {},
  });
  if (subCat) {
    return await db.subComponents.update({
      where: { id: subCat.id, deletedAt: {} },
      data: {
        deletedAt: subCat?.deletedAt ? null : new Date(),
        status: data.status as any,
        defaultInventoryId: data.defaultInventoryId,
        index: data.index as any,
      },
    });
  } else {
    return await db.subComponents.create({
      data: {
        defaultInventoryId: data.defaultInventoryId,
        inventoryCategoryId: data.inventoryCategoryId,
        parentId: data.parentId,
        status: data.status as any,
      },
    });
  }
}
export async function resetInventorySystem(db: Db) {
  const resetStatus: any = {};
  const resetOrder = [
    "stockAllocation",
    "inboundDemand",
    "linePricing",
    "lineItemComponents",
    "lineItem",
    "inboundShipmentExtractionLine",
    "inboundShipmentExtraction",
    "stockMovement",
    "inventoryLog",
    "inventoryStock",
    "inboundShipmentItem",
    "inboundShipment",
    "supplierVariant",
    "inventoryImage",
    "imageGalleryTag",
    "inventoryVariantAttribute",
    "inventoryVariantPricing",
    "priceHistory",
    "inventoryItemSubCategoryValue",
    "inventoryItemSubCategory",
    "inventorySubCategory",
    "subComponents",
    "productView",
    "productReview",
    "featuredProduct",
    "productMetric",
    "inventoryVariant",
    "inventory",
    "inventoryCategoryVariantAttribute",
    "inventoryCategory",
    "imageGallery",
    "imageTags",
    "supplier",
  ] as const;

  try {
    await db.$transaction(async (tx) => {
      for (const table of resetOrder) {
        resetStatus[table] = "resetting...";

        await (tx[table] as any).deleteMany({});
        resetStatus[table] = "reset complete";
      }
    });
  } catch (error) {
    resetStatus.error = error;
  }
  return resetStatus;
}

export const updateVariantCostSchema = z.object({
  uid: z.string(),
  variantId: z.number().optional().nullable(),
  pricingId: z.number().optional().nullable(),
  cost: z.number(),
  oldCostPrice: z.number().optional().nullable(),
  inventoryId: z.number(),
  editType: z.string(),
  reason: z.string().optional().nullable(),
  authorName: z.string(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveTo: z.string().optional().nullable(),
  attributes: z
    .array(
      z.object({
        valueId: z.number(),
        attributeId: z.number(),
      }),
    )
    .optional(),
});
export type UpdateVariantCost = z.infer<typeof updateVariantCostSchema>;

export async function updateVariantCost(db: Db, data: UpdateVariantCost) {
  if (data.variantId) {
    await db.inventoryVariant.update({
      where: {
        id: data.variantId,
      },
      data: {
        pricingHistories: {
          create: {
            changeReason: data.reason,
            changedBy: data.authorName,
            effectiveFrom: data.effectiveFrom || new Date(),
            effectiveTo: data.effectiveTo,
            oldCostPrice: data.oldCostPrice,
            newCostPrice: data.cost,
            source: data.editType,
          },
        },
        pricing: {
          create: !data.pricingId
            ? {
                costPrice: data.cost,
                inventoryId: data.inventoryId,
              }
            : undefined,
          update: !data.pricingId
            ? undefined
            : {
                where: {
                  id: data.pricingId,
                },
                data: {
                  costPrice: data.cost,
                },
              },
        },
      },
    });

    queueInventoryToDykeSync({
      inventoryId: data.inventoryId,
      inventoryVariantId: data.variantId,
      source: "variant-price",
    }).catch(() => {});
  } else {
    const created = await db.inventoryVariant.create({
      data: {
        inventoryId: data.inventoryId,
        uid: data.uid,
        attributes: {
          createMany: !data.attributes?.length
            ? undefined
            : {
                data: data.attributes.map((attribute) => ({
                  inventoryCategoryVariantAttributeId: attribute.attributeId,
                  valueId: attribute.valueId,
                })),
              },
        },
        pricingHistories: {
          create: {
            changeReason: data.reason,
            changedBy: data.authorName,
            effectiveFrom: data.effectiveFrom || new Date(),
            effectiveTo: data.effectiveTo,
            oldCostPrice: data.oldCostPrice,
            newCostPrice: data.cost,
            source: data.editType,
          },
        },
        pricing: {
          create: !data.pricingId
            ? {
                costPrice: data.cost,
                inventoryId: data.inventoryId,
              }
            : undefined,
        },
        status: "draft",
      },
    });

    queueInventoryToDykeSync({
      inventoryId: data.inventoryId,
      inventoryVariantId: created.id,
      source: "variant-price",
    }).catch(() => {});
  }
}
export const updateVariantStatusSchema = z
  .object({
    status: z.enum(INVENTORY_STATUS),
    attributes: updateVariantCostSchema.shape.attributes,
    variantId: updateVariantCostSchema.shape.variantId,
    inventoryId: updateVariantCostSchema.shape.inventoryId,
    uid: updateVariantCostSchema.shape.uid,
  });
export type UpdateVariantStatus = z.infer<typeof updateVariantStatusSchema>;
export async function updateVariantStatus(db: Db, data: UpdateVariantStatus) {
  if (data.variantId) {
    await db.inventoryVariant.update({
      where: {
        id: data.variantId,
      },
      data: {
        status: data.status,
      },
    });

    queueInventoryToDykeSync({
      inventoryId: data.inventoryId,
      inventoryVariantId: data.variantId,
      source: "variant-form",
    }).catch(() => {});
  } else {
    const created = await db.inventoryVariant.create({
      data: {
        inventoryId: data.inventoryId,
        uid: data.uid,
        attributes: {
          createMany: !data.attributes?.length
            ? undefined
            : {
                data: data.attributes.map((attribute) => ({
                  inventoryCategoryVariantAttributeId: attribute.attributeId,
                  valueId: attribute.valueId,
                })),
              },
        },
        status: data.status,
      },
    });

    queueInventoryToDykeSync({
      inventoryId: data.inventoryId,
      inventoryVariantId: created.id,
      source: "variant-form",
    }).catch(() => {});
  }
}
