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
    return db.supplierVariant.update({
      where: {
        id: input.id,
      },
      data: payload,
      include: {
        supplier: true,
      },
    });
  }

  return db.supplierVariant.upsert({
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
  const allocation = await db.stockAllocation.findUniqueOrThrow({
    where: {
      id: input.allocationId,
    },
    select: {
      id: true,
      qty: true,
      lineItemComponentId: true,
    },
  });

  await db.stockAllocation.update({
    where: {
      id: allocation.id,
    },
    data: {
      qty: input.approvedQty == null ? allocation.qty : Number(input.approvedQty || 0),
      status: "approved",
      notes: input.notes || undefined,
      deletedAt: null,
    },
  });

  await recomputeLineItemComponentFromAllocationState(
    db,
    allocation.lineItemComponentId,
  );

  return {
    ok: true,
    allocationId: allocation.id,
  };
}

export async function rejectStockAllocation(
  db: Db,
  input: RejectStockAllocation,
) {
  const allocation = await db.stockAllocation.findUniqueOrThrow({
    where: {
      id: input.allocationId,
    },
    select: {
      id: true,
      lineItemComponentId: true,
    },
  });

  await db.stockAllocation.update({
    where: {
      id: allocation.id,
    },
    data: {
      status: "cancelled",
      notes: input.notes || undefined,
      deletedAt: new Date(),
    },
  });

  await recomputeLineItemComponentFromAllocationState(
    db,
    allocation.lineItemComponentId,
  );

  return {
    ok: true,
    allocationId: allocation.id,
  };
}

export async function approveBulkStockAllocation(
  db: Db,
  input: BulkApproveStockAllocation,
) {
  const allocations = await db.stockAllocation.findMany({
    where: {
      id: {
        in: input.allocationIds,
      },
      deletedAt: null,
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
    };
  }

  await db.stockAllocation.updateMany({
    where: {
      id: {
        in: allocations.map((allocation) => allocation.id),
      },
    },
    data: {
      status: "approved",
    },
  });

  const componentIds = Array.from(
    new Set(allocations.map((allocation) => allocation.lineItemComponentId)),
  );
  for (const componentId of componentIds) {
    await recomputeLineItemComponentFromAllocationState(db, componentId);
  }

  return {
    ok: true,
    count: allocations.length,
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
}

export async function saveInventoryCategoryForm(
  db: Db,
  data: InventoryCategoryForm,
) {
  let id = data.id;
  if (!id) {
    return await db.inventoryCategory.create({
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
  } else {
    return await db.inventoryCategory.update({
      where: {
        id: data.id!,
      },
      data: {
        title: data.title,
        ...({ productKind: data.productKind } as any),
        stockMode: data.stockMode || "unmonitored",
        // uid: generateRandomString(5),
        enablePricing: data.enablePricing,
        description: data.description,
      },
    });
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
  if (data.variantId)
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
  else
    await db.inventoryVariant.create({
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
}
export const updateVariantStatusSchema = z
  .object({
    status: z.enum(INVENTORY_STATUS),
  })
  .extend(
    updateVariantCostSchema.pick({
      attributes: true,
      variantId: true,
      inventoryId: true,
      uid: true,
    }).shape,
  );
export type UpdateVariantStatus = z.infer<typeof updateVariantStatusSchema>;
export async function updateVariantStatus(db: Db, data: UpdateVariantStatus) {
  if (data.variantId)
    await db.inventoryVariant.update({
      where: {
        id: data.variantId,
      },
      data: {
        status: data.status,
      },
    });
  else
    await db.inventoryVariant.create({
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
}
