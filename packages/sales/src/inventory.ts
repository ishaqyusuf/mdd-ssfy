import { Db, Prisma } from "@gnd/db";
import {
  GetInventoryCategories,
  InventoryForm,
  InventoryProductsList,
} from "./schema";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import {
  INVENTORY_STATUS,
  InventoryVariantStatus,
  StockModes,
} from "./constants";
import { generateRandomNumber, generateRandomString, sum } from "@gnd/utils";
export async function inventoryProductsList(
  db: Db,
  query: InventoryProductsList
) {
  const where = whereInventoryProducts(query);
  const params = await composeQueryData(query, where, db.inventory);
  const data = await db.inventory.findMany({
    ...params.queryProps,
    include: {
      inventoryCategory: true,
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
        variantCount: 1,
        totalStocks: "-",
        // stockValue: 500,
        status: (r.status || "draft") as INVENTORY_STATUS,
        stockMode,
        stockMonitored: stockMode == "monitored",
        stockValue: r?.variantPricings?.[0]?.price,
        stockStatus: generateRandomNumber(2) > 50 ? "Low Stock" : null,
      };
    })
  );
  return response;
}

function whereInventoryProducts(query: InventoryProductsList) {
  const wheres: Prisma.InventoryWhereInput[] = [];
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
        include: {
          inventoryCategory: {
            include: {
              inventories: true,
            },
          },
        },
      },
    },
  });
  const attributes = attribute.categoryVariantAttributes.map((a) => {
    return {
      attributeId: attribute.id, //equals: inventoryCategoryVariantAttributeId
      name: a.inventoryCategory.title,
      values: a.inventoryCategory.inventories.map((i) => ({
        id: i.id,
        label: i.name,
      })),
    };
  });
  return {
    attributes,
  };
}
export async function inventoryVariants(db: Db, inventoryId) {
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
  if (!inventoryId) {
  } else {
    const inventory = await db.inventory.create({
      data: {
        name: product.name,
        uid: generateRandomString(4),
        description: product.description,
        status: product.status,
        publishedAt: product.status == "published" ? new Date() : null,
        stockMode,
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
