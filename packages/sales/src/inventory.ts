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
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import {
  INVENTORY_STATUS,
  InventoryVariantStatus,
  StockModes,
} from "./constants";
import { generateRandomNumber, generateRandomString, sum } from "@gnd/utils";
import { TABLE_NAMES } from "./inventory-import-service";
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
        stockStatus: generateRandomNumber(2) > 50 ? "Low Stock" : null,
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
        },
      },
    },
  });
  const { attributes } = await getInventoryCategoryAttributes(
    db,
    inventory.inventoryCategoryId
  );
  function cartesianProduct(
    arr: {
      valueId: number;
      valueLabel: string;
      attributeId: number;
      attributeLabel: string;
    }[][]
  ) {
    return arr.reduce(
      (a, b) => a.flatMap((x) => b.map((y) => [...x, y])),
      [[]]
    );
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
  const attributeMaps = allCombos.map((combo) => {
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
      status: matchedVariant ? matchedVariant.status ?? "active" : "draft",
      attributes: combo,
      title: titleParts.join(" "),
    };
  });
  return {
    attributeMaps,
    inventory,
  };
  // return {
  //   inventory,
  //   attributes,
  // };
  function generateCombinations(
    attrs: typeof attributes,
    index = 0,
    current: any[] = []
  ) {
    if (index === attrs.length) return [...current];
    const result: { attributeId: number; inventoryId: number }[] = [];
    for (const val of attrs[index]!?.values) {
      result.push(
        ...generateCombinations(attrs, index + 1, [
          ...current,
          { attributeId: attrs[index]!?.attributeId, inventoryId: val.id },
        ])
      );
    }
    return result;
  }
  const allCombinations = generateCombinations(attributes);
  const inventoryAttributes = allCombinations.map((combo) => {
    const existing = inventory.variants.find((variant) => {
      if (variant.attributes.length !== combo.length) return false;
      return combo.every((c) =>
        variant.attributes.some(
          (va) =>
            va.inventoryCategoryVariantAttributeId === c.attributeId &&
            va.valueId === c.inventoryId
        )
      );
    });

    return {
      variant: existing
        ? {
            id: existing.id,
            cost: existing?.pricing?.costPrice!,
            price: existing?.pricing?.price!,
            status: existing?.status! as any as InventoryVariantStatus,
            sku: existing?.sku,
            publishedAt: existing?.publishedAt,
            uid: existing?.uid,
            // include other needed fields...
          }
        : {
            id: null,
            status: "draft" as InventoryVariantStatus,
            cost: null,
            price: null,
          },
      attributes: combo,
    };
  });
  const defaultVariant = inventory.variants.find((v) => !v.attributes?.length);
  if (defaultVariant || !inventoryAttributes?.length) {
    inventoryAttributes.unshift({
      attributes: [],
      variant: {
        id: defaultVariant?.id!,
        cost: defaultVariant?.pricing?.costPrice!,
        status: defaultVariant?.status as InventoryVariantStatus,
        price: defaultVariant?.pricing?.price!,
        publishedAt: defaultVariant?.publishedAt!,
        sku: defaultVariant?.sku!,
        uid: defaultVariant?.uid!,
      },
    });
  }
  return {
    inventoryAttributes,
    categoryAttributes: attributes,
    allCombinations,
  };
}
export async function inventoryForm(db: Db, inventoryId) {
  const inv = await db.inventory.findUniqueOrThrow({
    where: {
      id: inventoryId,
    },
    include: {
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
  } satisfies InventoryForm;

  return formData;
}

export async function totalInventorySummary(db: Db) {
  const i = await db.inventory.findMany({
    where: {
      status: "published",
    },
    select: {
      _count: {
        select: {
          variants: {
            where: {
              status: "published",
            },
          },
        },
      },
    },
  });
  return {
    inventories: i.length,
    inventoryVariants: sum(i.map((a) => a._count.variants)),
  };
}
export async function lowStockSummary(db: Db) {}
export async function pendingInboundSummary(db: Db) {}

export async function saveInventory(db: Db, data: InventoryForm) {
  let inventoryId = data.product.id;
  const { product } = data;
  const stockMode: StockModes = product.stockMonitor
    ? "monitored"
    : "unmonitored";
  if (inventoryId) {
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
export async function saveInventoryCategoryForm(
  db: Db,
  data: InventoryCategoryForm
) {
  let id = data.id;
  if (!id) {
    await db.inventoryCategory.create({
      data: {
        title: data.title,
        uid: generateRandomString(5),
        enablePricing: data.enablePricing,
        description: data.description,
        categoryVariantAttributes: {
          createMany: {
            data: data.categoryVariantAttributes?.map((cva) => ({
              valuesInventoryCategoryId: cva.valuesInventoryCategoryId!,
            })),
          },
        },
      },
    });
  } else {
    await db.inventoryCategory.update({
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
