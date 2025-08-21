import { Db, Prisma } from "@gnd/db";
import {
  GetInventoryCategories,
  InventoryCategories,
  InventoryCategoryForm,
  InventoryForm,
  InventoryList,
  UpdateCategoryVariantAttribute,
  VariantForm,
} from "./schema";
import {
  composeQuery,
  composeQueryData,
  queryBuilder,
} from "@gnd/utils/query-response";
import { INVENTORY_STATUS, StockModes } from "./constants";
import {
  formatMoney,
  generateRandomNumber,
  generateRandomString,
  sum,
} from "@gnd/utils";
import { TABLE_NAMES } from "./inventory-import-service";
import { z } from "zod";
import { id } from "date-fns/locale";
import { formatDate } from "@gnd/utils/dayjs";
import { submitDispatchTask } from "./exports";
export async function inventoryList(db: Db, query: InventoryList) {
  // await db.imageGallery.updateMany({
  //   data: {
  //     bucket: "dyke",
  //   },
  // });
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
      const stockMode = r.stockMode as StockModes;
      return {
        id: r.id,
        title: r.name,
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
    })
  );
  return response;
}

function whereInventoryProducts(query: InventoryList) {
  const wheres: Prisma.InventoryWhereInput[] = [];
  if (query.categoryId)
    wheres.push({
      inventoryCategoryId: query.categoryId,
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
      })),
    };
  });
  return {
    attributes,
  };
}
export async function getInventoryCategoryForm(
  db: Db,
  id
): Promise<InventoryCategoryForm> {
  const category = await db.inventoryCategory.findUniqueOrThrow({
    where: {
      id,
    },
    select: {
      id: true,
      description: true,
      enablePricing: true,
      img: true,
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
  return {
    ...category,
    categoryVariantAttributes: category.categoryVariantAttributes.map((a) => {
      const { deletedAt, ...cva } = a;
      return {
        ...cva,
        active: !deletedAt,
      };
    }),
    categoryIdSelector: null,
  };
}
export async function getInventoryCategories(
  db: Db,
  data: GetInventoryCategories
) {
  const categories = await db.inventoryCategory.findMany({
    select: {
      id: true,
      title: true,
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
  query: GetVariantCostHistory
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
    })
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
            stockMode: "monitored" as StockModes,
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
          inv.map((a) => sum(a.logs.map((l) => l.costPrice! * l.qty)))
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
  const inventory = await db.inventory.findUniqueOrThrow({
    where: {
      id: inventoryId,
    },
    include: {
      variants: {
        include: {
          attributes: true,
          pricing: true,
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
  const { attributes } = await getInventoryCategoryAttributes(
    db,
    inventory.inventoryCategoryId
  );
  function cartesianProduct<T>(arr: T[][]): T[][] {
    return arr.reduce((a, b) => a.flatMap((x) => b.map((y) => [...x, y])), [
      [],
    ] as T[][]);
  }

  // Step 1: Get all possible value combos from attributes
  const allCombos = cartesianProduct(
    attributes.map((attr) =>
      attr.values.map((v) => ({
        valueId: v.id,
        valueLabel: v.label,
        attributeId: attr.attributeId,
        attributeLabel: attr.name,
      }))
    )
  );
  const variants = inventory.variants;
  const attributeMaps = allCombos
    .map((combo) => {
      const matchedVariant = variants.find((variant) =>
        combo.every((c) =>
          variant.attributes.some(
            (a) =>
              a.valueId === c.valueId &&
              a.inventoryCategoryVariantAttributeId === c.attributeId
          )
        )
      );
      // Merge width + height for title if present
      const widthAttr = combo.find(
        (c) => c.attributeLabel?.toLowerCase() === "width"
      );
      const heightAttr = combo.find(
        (c) => c.attributeLabel?.toLowerCase() === "height"
      );

      let titleParts: string[];
      if (widthAttr && heightAttr) {
        titleParts = [
          `${widthAttr.valueLabel} x ${heightAttr.valueLabel}`,
          ...combo
            .filter(
              (c) =>
                !["width", "height"].includes(c.attributeLabel?.toLowerCase())
            )
            .map((c) => c.valueLabel),
        ];
      } else {
        titleParts = combo.map((c) => c.valueLabel);
      }
      return {
        variantId: matchedVariant?.id ?? null,
        uid: matchedVariant?.uid || generateRandomString(5),
        price: matchedVariant?.pricing?.costPrice,
        pricingId: matchedVariant?.pricing?.id,
        status: matchedVariant ? matchedVariant.status ?? "draft" : "draft",
        attributes: combo,
        title: titleParts.join(" "),
        stockCount: sum(matchedVariant?.stockMovements, "changeQty"),
        lowStock: matchedVariant?.lowStockAlert,
        inventoryId,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
  const filterParams: Record<string, string[]> = {};
  for (const record of attributeMaps) {
    for (const attr of record.attributes) {
      if (!filterParams[attr.attributeLabel]) {
        filterParams[attr.attributeLabel] = [];
      }
      if (!filterParams[attr.attributeLabel]!.includes(attr.valueLabel)) {
        filterParams[attr.attributeLabel]!.push(attr.valueLabel);
      }
    }
  }

  return {
    attributeMaps,
    inventory,
    filterParams,
  };
}
export async function lowStockSummary(db: Db) {}
export async function pendingInboundSummary(db: Db) {}

export async function inventoryFormSave(db: Db, data: InventoryForm) {
  let inventoryId = data.product.id;
  const { product } = data;
  const stockMode: StockModes = product.stockMonitor
    ? "monitored"
    : "unmonitored";
  if (inventoryId) {
    await db.inventory.update({
      where: {
        id: inventoryId,
      },
      data: {
        status: product.status,
        name: product.name,
        stockMode,
        description: product.description,
      },
    });
  } else {
    const inventory = await db.inventory.create({
      data: {
        name: product.name,
        uid: generateRandomString(4),
        description: product.description,
        status: product.status,
        publishedAt: product.status == "published" ? new Date() : null,
        stockMode,
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
    inventoryId = inventory.id;
  }
  return { inventoryId };
}
export async function inventoryForm(db: Db, inventoryId) {
  const inv = await db.inventory.findUniqueOrThrow({
    where: {
      id: inventoryId,
    },
    include: {
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
        },
      },
    },
  });
  const formData = {
    product: {
      categoryId: inv.inventoryCategoryId,
      name: inv.name,
      status: inv.status as any,
      stockMonitor: (inv.stockMode as StockModes) == "monitored",
      description: inv.description,
      id: inv?.id!,
    },
    variants: [],
    category: {
      id: inv.inventoryCategoryId,
      enablePricing: inv.inventoryCategory?.enablePricing!,
    },
    images: [],
    subCategories: inv.inventoryItemSubCategories
      .filter(
        (a, ai) =>
          inv.inventoryItemSubCategories.findIndex(
            (b) => b.inventorySubCategoryId == a.inventorySubCategoryId
          ) === ai
      )
      .map((s) => {
        const values = inv.inventoryItemSubCategories.filter(
          (a) => a.inventorySubCategoryId === s.inventorySubCategoryId
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
export const inventoryInboundFormSchema = z.object({
  example: z.string(),
});
export type InventoryInboundForm = z.infer<typeof inventoryInboundFormSchema>;
export async function inventoryInboundForm(db: Db, inboundId) {}
export async function inventoryInboundFormSave(
  db: Db,
  data: InventoryInboundForm
) {}
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
    })
  );
  return response;
}
function whereInventoryCategories(query: InventoryCategories) {
  const wheres: Prisma.InventoryCategoryWhereInput[] = [];
  return composeQuery(wheres);
}

export async function deleteInventory(db: Db, id) {
  await db.inventory.update({
    where: {
      id,
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
  data: InventoryCategoryForm
) {
  let id = data.id;
  if (!id) {
    return await db.inventoryCategory.create({
      data: {
        title: data.title,
        uid: generateRandomString(5),
        enablePricing: data.enablePricing,
        description: data.description,
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
        // uid: generateRandomString(5),
        enablePricing: data.enablePricing,
        description: data.description,
      },
    });
  }
}
export async function updateCategoryVariantAttribute(
  db: Db,
  data: UpdateCategoryVariantAttribute
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

export async function resetInventorySystem(db: Db) {
  const tables = TABLE_NAMES.reverse();
  // return { tables };
  const resetStatus: any = {};
  try {
    await db.$transaction(async (tx) => {
      // tx.inventory.deleteMany({})
      for (const table of tables) {
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
      })
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
  .merge(
    updateVariantCostSchema.pick({
      attributes: true,
      variantId: true,
      inventoryId: true,
      uid: true,
    })
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
