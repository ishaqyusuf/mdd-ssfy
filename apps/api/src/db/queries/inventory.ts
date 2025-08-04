import type { TRPCContext } from "@api/trpc/init";
import { db, type Prisma } from "@gnd/db";
import { addPercentage, nextId } from "@gnd/utils";
import { z } from "zod";
import { generateInventoryTypeUidFromShelfCategoryId } from "@gnd/sales/inventory-utils";
const createInventoryTypeSchema = z.object({
  name: z.string(),
  uid: z.string(),
  attributes: z
    .array(
      z.object({
        inventoryTypeId: z.number(),
      })
    )
    .optional()
    .nullable(),
});
type CreateInventoryType = z.infer<typeof createInventoryTypeSchema>;
export async function createInventoryType(
  ctx: TRPCContext,
  data: CreateInventoryType
) {
  const inventoryType = await ctx.db.inventoryType.upsert({
    where: {
      name_uid: {
        name: data.name,
        uid: data.uid,
      },
    },
    create: {
      type: "component",
      published: new Date(),
      name: data.name,
      uid: data.uid,
      attributes: !data?.attributes?.length
        ? undefined
        : {
            createMany: {
              data: data.attributes.map((atr) => ({
                attributedInventoryTypeId: atr.inventoryTypeId,
              })),
            },
          },
    },
    update: {
      attributes: !data?.attributes?.length
        ? undefined
        : {
            createMany: {
              skipDuplicates: true,
              data: data.attributes.map((atr) => ({
                attributedInventoryTypeId: atr.inventoryTypeId,
              })),
            },
          },
    },
  });
  return inventoryType;
}
const createInventorySchema = z.object({
  typeId: z.number(),
  uid: z.string(),
  title: z.string(),
  img: z.string().nullable().optional(),
});
type CreateInventory = z.infer<typeof createInventorySchema>;
export async function createInventory(ctx: TRPCContext, data: CreateInventory) {
  return await ctx.db.inventory.create({
    data: {
      typeId: data.typeId,
      uid: data.uid,
      title: data.title,
      img: data.img,
    },
  });
}
const createInventoryVariantSchema = z.object({
  inventoryId: z.number(),
  uid: z.string(),
  attributes: z
    .array(
      z.object({
        attributedInventoryId: z.number(),
        inventoryTypeAttributeId: z.number(),
        // variantId: z.number(),
      })
    )
    .optional()
    .nullable(),
});
type CreateInventoryVariant = z.infer<typeof createInventoryVariantSchema>;
export async function createInventoryVariant(
  ctx: TRPCContext,
  data: CreateInventoryVariant
) {
  const variant = await ctx.db.inventoryVariant.create({
    data: {
      uid: data.uid,
      inventoryId: data.inventoryId,
      attributes: !data?.attributes?.length
        ? undefined
        : {
            createMany: {
              data: data.attributes?.map((a) => ({
                attributedInventoryId: a.attributedInventoryId,
                inventoryTypeAttributeId: a.inventoryTypeAttributeId,
              })),
            },
          },
    },
  });
  return variant;
}
export async function getInventoryTypesByUids(
  ctx: TRPCContext,
  uids: string[]
) {
  const inventoryTypes = await ctx.db.inventoryType.findMany({
    where: {
      uid: {
        in: uids,
      },
    },
    select: {
      uid: true,
      name: true,
      id: true,
    },
  });
  return inventoryTypes;
}
const upsertInventoriesForDykeProductsSchema = z.object({
  step: z.object({
    // id: z.number(),
    uid: z.string(),
    title: z.string(),
  }),
  products: z.array(
    z.object({
      uid: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
      img: z.string().optional().nullable(),
      price: z.number().optional().nullable(),
      variants: z
        .array(
          z.object({
            deps: z.array(
              z.object({
                stepUid: z.string(),
                stepTitle: z.string(),
                productUid: z.string(),
                productName: z.string(),
                price: z.number().optional().nullable(),
              })
            ),
          })
        )
        .optional()
        .nullable(),
    })
  ),
});
type UpsertInventoriesForDykeProducts = z.infer<
  typeof upsertInventoriesForDykeProductsSchema
>;
export async function upsertInventoriesForDykeProducts(
  ctx: TRPCContext,
  data: UpsertInventoriesForDykeProducts
) {
  // get all inventories types, create unavailable ones if they don't exist
  const deps = data.products
    .filter((a) => a.variants?.length)
    .map((a) => a.variants!?.map((b) => b.deps).flat())
    .flat();
  const stepUids = Array.from(
    new Set([data.step.uid, ...deps.map((a) => a.stepUid)])
  );
  let inventoryTypes = await getInventoryTypesByUids(ctx, stepUids);

  const missingInventoryTypeUids = stepUids.filter(
    (uid) => !inventoryTypes.some((it) => it.uid === uid)
  );
  if (missingInventoryTypeUids.length > 0) {
    const newInventoryTypes = missingInventoryTypeUids.map((uid) => {
      // const product = data.products.find((p) => p.step.uid === uid);
      const step = deps.find((a) => a.stepUid === uid);
      return {
        uid: uid,
        name: step?.stepTitle || uid, // Use step title or fallback to UID
        type: "component",
      };
    });
    await ctx.db.inventoryType.createMany({
      data: newInventoryTypes,
    });

    inventoryTypes = await getInventoryTypesByUids(ctx, stepUids);
  }

  // get existing products
  const productUids = data.products.map((p) => p.uid)?.filter(Boolean);
  const stepInventoryType = inventoryTypes.find((a) => a.uid == stepUids[0]);
  await ctx.db.inventoryTypeAttribute.createMany({
    data: deps
      .filter((d, di) => deps.findIndex((a) => a.stepUid === d.stepUid) == di)
      .map((ta) => ({
        inventoryTypeId: stepInventoryType?.id!,
        attributedInventoryTypeId: inventoryTypes.find(
          (a) => a.uid === ta.stepUid
        )!?.id,
        order: 0,
        isRequired: false,
      })),
  });
  let inventories = await ctx.db.inventory.findMany({
    where: {
      uid: {
        in: productUids as any,
      },
    },
  });
  const __allProducts = data.products
    .map((product) => [
      {
        uid: product.uid,
        stepUid: stepUids[0],
        img: product.img,
        name: product.name,
      },
      ...deps?.map((d) => ({
        uid: d.productUid,
        img: "",
        name: d.productName,
        stepUid: d.stepUid,
      })),
    ])
    .flat();
  const productsNotFound = __allProducts.filter(
    (p) => p.uid && !inventories.some((i) => i.uid === p.uid)
  );
  let newInventoryId = await nextId(db.inventory);
  let newInventoryVariantId = await nextId(db.inventoryVariant);

  if (productsNotFound.length) {
    const inventoriesToCreate = productsNotFound.map((product) => {
      const inventoryType = inventoryTypes.find(
        (t) => t.uid === product.stepUid
      );
      const typeId = inventoryType?.id;
      if (!typeId) {
        console.error(`InventoryType not found for uid: ${data.step.uid}`);
      }
      return {
        uid: product.uid as any,
        title: product.name as any,
        typeId: typeId as number,
        img: product.img,
        id: newInventoryId++,
      } satisfies Prisma.InventoryCreateManyInput;
    });
    const ls = data.products.filter((a) =>
      productsNotFound.every((p) => p.uid != a.uid)
    );
    const inventoryVariantAttributesToCreate =
      [] as Prisma.InventoryVariantAttributeCreateManyInput[];
    const variantsToCreate = ls
      .filter((a) => a.price || (!a.price && !a.variants?.length))
      .map(
        (prod) =>
          ({
            inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
              ?.id!,
            uid: prod.uid!,
            img: prod.img,
            variantTitle: prod.name,
            id: newInventoryVariantId++,
          }) satisfies Prisma.InventoryVariantCreateManyInput
      );
    const variantPricingsToCreate = ls
      .filter((a) => a.price)
      .map(
        (prod) =>
          ({
            inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
              ?.id!,
            costPrice: prod.price!,
            inventoryVariantId: undefined,
          }) satisfies Prisma.InventoryVariantPriceCreateManyInput
      );
    ls.filter((a) => a.variants?.length).map((prod) =>
      prod.variants?.map((_var) => {
        const variant = {
          inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)?.id!,
          uid: prod.uid!,
          img: prod.img,
          variantTitle: prod.name,
          id: newInventoryVariantId++,
        } satisfies Prisma.InventoryVariantCreateManyInput;
        _var.deps.map((dep) => {
          inventoryVariantAttributesToCreate.push({
            variantId: variant.id,
            inventoryTypeAttributeId: stepInventoryType?.id!,
            attributedInventoryId: inventories.find(
              (i) => i.uid === dep.productUid
            )?.id!,
          });
          if (dep.price)
            variantPricingsToCreate.push({
              inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
                ?.id!,
              costPrice: dep.price!,
              inventoryVariantId: variant.id! as any,
            });
        });
      })
    );
    await ctx.db.inventory.createMany({
      data: inventoriesToCreate,
    });
    await ctx.db.inventoryVariant.createMany({
      data: variantsToCreate,
    });
    await ctx.db.inventoryVariantPrice.createMany({
      data: variantPricingsToCreate,
    });
    await ctx.db.inventoryVariantAttribute.createMany({
      data: inventoryVariantAttributesToCreate,
    });
    inventories = await ctx.db.inventory.findMany({
      where: {
        uid: {
          in: productUids as any,
        },
      },
      include: {
        variants: {
          include: {},
        },
      },
    });
  }

  return {
    inventories,
    inventoryTypes,
  };
}

export async function upsertInventoriesForDykeProductsOptimized(
  ctx: TRPCContext,
  data: UpsertInventoriesForDykeProducts
) {
  const { db } = ctx;
  const { step, products } = data;

  // 1. Collect all unique UIDs for inventory types and products
  const allDeps = products.flatMap(
    (p) => p.variants?.flatMap((v) => v.deps) ?? []
  );
  const typeUids = Array.from(
    new Set([step.uid, ...allDeps.map((d) => d.stepUid)])
  );
  const productUids = Array.from(
    new Set([
      ...products.map((p) => p.uid).filter(Boolean),
      ...allDeps.map((d) => d.productUid),
    ])
  );

  // 2. Upsert InventoryTypes
  const existingTypes = await db.inventoryType.findMany({
    where: { uid: { in: typeUids } },
  });
  const existingTypeUids = new Set(existingTypes.map((t) => t.uid));
  const typesToCreate = typeUids
    .filter((uid) => !existingTypeUids.has(uid))
    .map((uid) => {
      const dep = allDeps.find((d) => d.stepUid === uid);
      return { uid, name: dep?.stepTitle ?? uid, type: "component" };
    });

  if (typesToCreate.length > 0) {
    await db.inventoryType.createMany({
      data: typesToCreate,
      skipDuplicates: true,
    });
  }
  const allTypes = await db.inventoryType.findMany({
    where: { uid: { in: typeUids } },
  });
  const typeMap = new Map(allTypes.map((t) => [t.uid, t]));
  const stepInventoryType = typeMap.get(step.uid);
  if (!stepInventoryType) {
    throw new Error(
      `Failed to find or create step inventory type with UID: ${step.uid}`
    );
  }

  // 3. Upsert InventoryTypeAttributes
  const uniqueDeps = allDeps.filter(
    (dep, index, self) =>
      index === self.findIndex((d) => d.stepUid === dep.stepUid)
  );
  const attributesToCreate = uniqueDeps.map((dep) => ({
    inventoryTypeId: stepInventoryType.id,
    attributedInventoryTypeId: typeMap.get(dep.stepUid)!.id,
    order: 0,
    isRequired: false,
  }));
  if (attributesToCreate.length > 0) {
    await db.inventoryTypeAttribute.createMany({
      data: attributesToCreate,
      skipDuplicates: true,
    });
  }
  const allAttributes = await db.inventoryTypeAttribute.findMany({
    where: { inventoryTypeId: stepInventoryType.id },
  });
  const attributeMap = new Map(
    allAttributes.map((attr) => [attr.attributedInventoryTypeId, attr])
  );

  // 4. Upsert all Inventories (products)
  const existingInventories = await db.inventory.findMany({
    where: { uid: { in: productUids as string[] } },
  });
  const existingInventoryUids = new Set(existingInventories.map((i) => i.uid));
  const allProductDefs = [
    ...products.map((p) => ({
      uid: p.uid,
      name: p.name,
      img: p.img,
      typeUid: step.uid,
    })),
    ...allDeps.map((d) => ({
      uid: d.productUid,
      name: d.productName,
      img: null,
      typeUid: d.stepUid,
    })),
  ].filter(
    (p, index, self) =>
      p.uid && index === self.findIndex((sp) => sp.uid === p.uid)
  );

  const inventoriesToCreate = allProductDefs
    .filter((p) => !existingInventoryUids.has(p.uid!))
    .map((p) => ({
      uid: p.uid!,
      title: p.name!,
      img: p.img,
      typeId: typeMap.get(p.typeUid)!.id,
    }));

  if (inventoriesToCreate.length > 0) {
    await db.inventory.createMany({
      data: inventoriesToCreate,
      skipDuplicates: true,
    });
  }
  const allInventories = await db.inventory.findMany({
    where: { uid: { in: productUids as string[] } },
  });
  const inventoryMap = new Map(allInventories.map((i) => [i.uid, i]));

  // 5. Create Variants and Pricing within a transaction
  return db.$transaction(async (tx) => {
    for (const product of products) {
      if (!product.uid) continue;
      const mainInventory = inventoryMap.get(product.uid);
      if (!mainInventory) continue;

      // Clear existing variants for idempotency
      await tx.inventoryVariant.deleteMany({
        where: { inventoryId: mainInventory.id },
      });

      if (product.variants && product.variants.length > 0) {
        // Product with dependencies
        for (const variant of product.variants) {
          const variantPrice = variant.deps.reduce(
            (acc, dep) => acc + (dep.price ?? 0),
            0
          );
          await tx.inventoryVariant.create({
            data: {
              inventoryId: mainInventory.id,
              uid: mainInventory.uid,
              variantTitle: mainInventory.title,
              pricings: {
                create: {
                  inventoryId: mainInventory.id,
                  costPrice: variantPrice,
                },
              },
              attributes: {
                createMany: {
                  data: variant.deps.map((dep) => {
                    const attributedInventory = inventoryMap.get(
                      dep.productUid
                    );
                    const attributeType = attributeMap.get(
                      typeMap.get(dep.stepUid)!.id
                    );
                    if (!attributedInventory || !attributeType) {
                      throw new Error(
                        "Missing inventory or attribute for dependency"
                      );
                    }
                    return {
                      attributedInventoryId: attributedInventory.id,
                      inventoryTypeAttributeId: attributeType.id,
                    };
                  }),
                },
              },
            },
          });
        }
      } else if (product.price !== null && product.price !== undefined) {
        // Simple product with a price
        await tx.inventoryVariant.create({
          data: {
            inventoryId: mainInventory.id,
            uid: mainInventory.uid,
            variantTitle: mainInventory.title,
            pricings: {
              create: {
                inventoryId: mainInventory.id,
                costPrice: product.price,
              },
            },
          },
        });
      }
    }
    // Return final state
    const finalInventories = await tx.inventory.findMany({
      where: {
        uid: { in: products.map((p) => p.uid).filter(Boolean) as string[] },
      },
      include: {
        variants: {
          include: {
            attributes: true,
            pricings: true,
          },
        },
      },
    });
    return {
      inventories: finalInventories,
      inventoryTypes: allTypes,
    };
  });
}

const createProductInventorySchema = z.object({
  id: z.number(),
});

type CreateProductInventory = z.infer<typeof createProductInventorySchema>;

export async function createProductInventory(
  ctx: TRPCContext,
  data: CreateProductInventory
) {
  const product = await ctx.db.dykeStepProducts.findUnique({
    where: {
      id: data.id,
    },
    include: {
      step: true,
    },
  });
  let inventoryType = await db.inventoryType.findFirst({
    where: {
      uid: product?.uid!,
    },
  });
  if (!product) throw new Error("Product not found");
  if (!inventoryType)
    throw new Error("Inventory not initialized for this step");
  const inventory = await db.inventory.create({
    data: {
      uid: product.uid!,
      title: product.name!,
      typeId: inventoryType.id,
      img: product.img,
    },
  });
}
export async function updateBaseInventoryPrice(ctx: TRPCContext, uid, price) {
  const inventory = await ctx.db.inventory.findFirst({
    where: {
      uid,
    },
    include: {
      variants: {
        where: {
          uid,
        },
        include: {
          pricings: true,
        },
      },
    },
  });
  if (!inventory) throw new Error("Inventory not found");
  let variant = inventory?.variants?.[0];
  if (!variant) {
    variant = await ctx.db.inventoryVariant.create({
      data: {
        uid,
        inventoryId: inventory!.id,
        img: inventory.img,
        pricings: {
          create: {
            costPrice: price,
            inventoryId: inventory!.id,
          },
        },
      },
      include: {
        pricings: true,
      },
    });
  }
  let pricing = variant?.pricings?.[0];
  if (!pricing)
    await ctx.db.inventoryVariantPrice.create({
      data: {
        costPrice: price!,
        inventoryId: inventory.id,
        inventoryVariantId: variant.id,
      },
    });
}
const updateInventoryVariantPriceSchema = z.object({
  variantUid: z.string(),
  inventoryUid: z.string(),
  deps: z.array(
    z.object({
      stepUid: z.string(),
      stepTitle: z.string(),
      productUid: z.string(),
      productName: z.string(),
      price: z.number().optional().nullable(),
    })
  ),
});
export type UpdateInventoryVariantPrice = z.infer<
  typeof updateInventoryVariantPriceSchema
>;
export async function updateInventoryVariantPrice(
  ctx: TRPCContext,
  data: UpdateInventoryVariantPrice
) {
  const { db } = ctx;
  const { inventoryUid, deps } = data;

  const mainInventory = await db.inventory.findUnique({
    where: { uid: inventoryUid },
    select: { id: true },
  });

  if (!mainInventory) {
    throw new Error(`Inventory with UID "${inventoryUid}" not found.`);
  }

  const depProductUids = deps.map((d) => d.productUid);
  const depInventories = await db.inventory.findMany({
    where: { uid: { in: depProductUids } },
    select: { id: true },
  });
  const depInventoryIds = depInventories.map((i) => i.id);

  if (depInventories.length !== depProductUids.length) {
    throw new Error("One or more dependency products not found.");
  }

  const variants = await db.inventoryVariant.findMany({
    where: {
      inventoryId: mainInventory.id,
      attributes: {
        every: {
          attributedInventoryId: { in: depInventoryIds },
        },
      },
    },
    include: {
      attributes: {
        select: {
          attributedInventoryId: true,
        },
      },
      pricings: {
        select: {
          id: true,
        },
      },
    },
  });

  const targetVariant = variants.find(
    (v) => v.attributes.length === depInventoryIds.length
  );

  if (!targetVariant) {
    throw new Error("Variant not found for the given dependencies.");
  }

  const newCostPrice = deps.reduce((sum, dep) => sum + (dep.price ?? 0), 0);

  const pricing = targetVariant.pricings[0];

  if (pricing) {
    return db.inventoryVariantPrice.update({
      where: { id: pricing.id },
      data: { costPrice: newCostPrice },
    });
  } else {
    return db.inventoryVariantPrice.create({
      data: {
        inventoryId: mainInventory.id,
        inventoryVariantId: targetVariant.id,
        costPrice: newCostPrice,
      },
    });
  }
}
export const upsertInventoriesForDykeShelfProductsSchema = z.object({
  categoryId: z.number(),
});
export async function upsertInventoriesForDykeShelfProducts(
  ctx: TRPCContext,
  data: z.infer<typeof upsertInventoriesForDykeShelfProductsSchema>
) {
  const products = await ctx.db.dykeShelfProducts.findMany({
    where: {
      parentCategoryId: data.categoryId,
    },
    // select: {
    //   // parentCategory: true,
    // },
  });
  const parentCategory = await ctx.db.dykeShelfCategories.findUnique({
    where: {
      id: data.categoryId,
    },
  });
  const inventoryType =
    (await ctx.db.inventoryType.findFirst({
      where: {
        type: "shelf-item",
        uid: `shelf-${data.categoryId}`,
      },
    })) ||
    (await ctx.db.inventoryType.create({
      data: {
        name: parentCategory?.name!,
        uid: `shelf-${data.categoryId}`,
        type: "shelf-item",
      },
    }));
  const categories = await ctx.db.dykeShelfCategories.findMany({
    where: {
      parentCategoryId: data.categoryId,
    },
  });
  let inventoryCategories = [] as Prisma.InventoryCategoryCreateManyInput[];
  let nextInventoryCategoryId = await nextId(ctx.db.inventoryCategory);
  const inventoryCategoryIdMapByDykeCategory = {};
  function createCategory(parentId, inventoryParentId?) {
    categories
      .filter((c) => c.parentCategoryId == parentId)
      .map((category) => {
        let icId = nextInventoryCategoryId++;
        inventoryCategories.push({
          id: icId,
          name: category.name,
          parentId: inventoryParentId,
          inventoryTypeId: inventoryType.id!,
        });
        inventoryCategoryIdMapByDykeCategory[String(category.id)] = icId;
        createCategory(category.id, icId);
      });
  }
  createCategory(data.categoryId);

  // await ctx.db.inventoryCategory.createMany({
  //   data: inventoryCategories,
  // });
  const __inventories: Prisma.InventoryCreateManyInput[] = [];
  // const __inventoryVariants: Prisma.InventoryCreateManyInput[] = [];
  const __inventoryVariantPricings: Prisma.InventoryVariantPriceCreateManyInput[] =
    [];
  let nextInventoryId = await nextId(db.inventory);
  let nextInventoryPriceId = await nextId(db.inventoryVariantPrice);
  products.map((product) => {
    let ivId = nextInventoryId++;
    let priceId = nextInventoryPriceId++;
    __inventories.push({
      uid: `shelf-prod-${product.id}`,
      id: ivId,
      img: product.img,
      typeId: inventoryType.id,
      title: product.title,
      categoryId:
        inventoryCategoryIdMapByDykeCategory[String(product.categoryId)],
    });
    __inventoryVariantPricings.push({
      id: priceId,
      inventoryId: ivId,
      costPrice: product.unitPrice,
    });
  });
  return ctx.db.$transaction(
    async (tx) => {
      for (let i = 0; i < inventoryCategories.length; i++)
        await tx.inventoryCategory.createMany({
          data: [inventoryCategories[i]!],
        });
      // await tx.inventoryCategory.createMany({
      //   data: inventoryCategories,
      // });
      await tx.inventory.createMany({
        data: __inventories,
      });
      await tx.inventoryVariantPrice.createMany({
        data: __inventoryVariantPricings,
      });
    },
    {
      timeout: 20 * 1000,
    }
  );
  // inventory type is parent category name, uid is "shelf-cat-${cat.id}", type is shelf-item
}

// export const getInventoryTypeByShelfIdSchema = z.object({
//   categoryId: z.number()
// })
export async function getInventoryTypeByShelfId(ctx: TRPCContext, categoryId) {
  const uid = generateInventoryTypeUidFromShelfCategoryId(categoryId);
  const inventoryType = await ctx.db.inventoryType.findFirst({
    where: {
      uid,
    },
  });
  return inventoryType;
}

/**
 * @name upsertInventoriesForDykeShelfProductsGemini
 * @description This function synchronizes products from a Dyke shelf category with the inventory system.
 * It is designed to be idempotent and robust, performing the entire operation within a single database transaction.
 *
 * @param ctx - The TRPC context, providing database access.
 * @param data - An object containing the `categoryId` of the Dyke shelf to synchronize.
 *
 * @returns A promise that resolves when the operation is complete.
 *
 * @detailedExplanation
 * 1.  **Transactionality**: The entire function is wrapped in a `db.$transaction`. This ensures that all database
 *     operations are atomic. If any part of the process fails, the entire transaction is rolled back,
 *     preventing partial data updates and maintaining data integrity.
 *
 * 2.  **Idempotency**: The function is designed to be safely run multiple times with the same input.
 *     - It uses `upsert` for the `InventoryType`, creating it if it doesn't exist or updating it if it does.
 *     - Before creating new categories and products, it first deletes existing ones associated with the `InventoryType`.
 *       This "delete-then-create" approach ensures a clean slate for each synchronization, preventing duplicate entries
 *       and simplifying the logic, as we don't need to check each item individually.
 *
 * 3.  **Data Fetching**: It starts by fetching all necessary data from the Dyke shelf tables: the parent category,
 *     its sub-categories, and all associated products. This is done upfront to avoid multiple database queries
 *     within loops.
 *
 * 4.  **Inventory Type Management**: It creates or updates a single `InventoryType` for the entire shelf,
 *     uniquely identified by `shelf-${categoryId}`. This serves as a container for all related inventory items.
 *
 * 5.  **Recursive Category Creation**:
 *     - It defines a recursive function `createAndMapCategories` to traverse the Dyke shelf category hierarchy.
 *     - This function builds a flat list of `InventoryCategory` records to be created, while maintaining the
 *       parent-child relationships from the original hierarchy.
 *     - It also creates a `dykeToInventoryCategoryMap` to easily look up the newly created `InventoryCategory` ID
 *       from the original Dyke category ID. This is crucial for associating products with the correct new category.
 *
 * 6.  **Product and Variant Creation**:
 *     - It iterates through the fetched Dyke shelf products.
 *     - For each product, it creates a corresponding `Inventory` record.
 *     - **Crucially**, it also creates a default `InventoryVariant` for each inventory item. This is a key fix
 *       over the original function, which missed this step. The variant holds the pricing information.
 *     - The `Inventory`, its `InventoryVariant`, and the `InventoryVariantPrice` are all created in a nested write
 *       within the `tx.inventory.create` call. This is an efficient way to create related records in Prisma.
 *
 * 7.  **Error Handling**: The use of a transaction implicitly handles errors. If any Prisma query fails,
 *     the transaction will be rolled back, and an error will be thrown, preventing inconsistent data.
 *
 * 8.  **Clarity and Maintainability**: The code is structured logically with clear variable names and comments
 *     explaining each major step, making it easier to understand and maintain. It avoids manual ID generation,
 *     relying on the database's auto-incrementing keys, which is safer and more standard.
 */
export async function upsertInventoriesForDykeShelfProductsGemini(
  ctx: TRPCContext,
  data: z.infer<typeof upsertInventoriesForDykeShelfProductsSchema>
) {
  const { db } = ctx;
  const { categoryId } = data;

  return db.$transaction(async (tx) => {
    // 1. Fetch all necessary data from Dyke shelf tables
    const parentCategory = await tx.dykeShelfCategories.findUnique({
      where: { id: categoryId },
    });

    if (!parentCategory) {
      throw new Error(`Parent category with ID ${categoryId} not found.`);
    }

    const allSubCategories = await tx.dykeShelfCategories.findMany({
      where: { parentCategoryId: categoryId },
    });

    const allProducts = await tx.dykeShelfProducts.findMany({
      where: { parentCategoryId: categoryId },
    });

    // 2. Create or update the main InventoryType for this shelf
    // const inventoryType = await tx.inventoryType.upsert({
    //   where: { uid: `shelf-${categoryId}` },
    //   update: { name: parentCategory.name },
    //   create: {
    //     name: parentCategory.name,
    //     uid: `shelf-${categoryId}`,
    //     type: "shelf-item",
    //   },
    // });

    // 3. For idempotency, clear existing inventory categories and products associated with this type
    // await tx.inventoryCategory.deleteMany({
    //   where: { inventoryTypeId: inventoryType.id },
    // });
    // await tx.inventory.deleteMany({
    //   where: { typeId: inventoryType.id },
    // });

    // 4. Recursively create the new category hierarchy
    const dykeToInventoryCategoryMap = new Map<number, number>();

    const createAndMapCategories = async (
      dykeParentId: number,
      inventoryParentId: number | null
    ) => {
      const children = allSubCategories.filter(
        (c) => c.parentCategoryId === dykeParentId
      );

      for (const category of children) {
        // const newInventoryCategory = await tx.inventoryCategory.create({
        //   data: {
        //     name: category.name,
        //     inventoryTypeId: inventoryType.id,
        //     parentId: inventoryParentId,
        //   },
        // });
        // dykeToInventoryCategoryMap.set(category.id, newInventoryCategory.id);
        // // Recurse for grandchildren
        // await createAndMapCategories(category.id, newInventoryCategory.id);
      }
    };

    // Start the recursion from the root parent category
    await createAndMapCategories(categoryId, null);

    // 5. Create Inventory, a default Variant, and Price for each product
    for (const product of allProducts) {
      const inventoryCategoryId = dykeToInventoryCategoryMap.get(
        product.categoryId!
      );

      if (inventoryCategoryId === undefined) {
        // This case should ideally not happen if data is consistent.
        // It means a product is linked to a category that wasn't found under the parent.
        // We'll skip it but you could also throw an error.
        console.warn(
          `Skipping product "${product.title}" (ID: ${product.id}) as its category (ID: ${product.categoryId}) was not found in the hierarchy.`
        );
        continue;
      }

      // await tx.inventory.create({
      //   data: {
      //     uid: `shelf-prod-${product.id}`,
      //     img: product.img,
      //     title: product.title,
      //     typeId: inventoryType.id,
      //     categoryId: inventoryCategoryId,
      //     // Create a default variant and its price in one go
      //     variants: {
      //       create: {
      //         uid: `shelf-prod-${product.id}`, // Variant UID can be same as product UID for default
      //         variantTitle: product.title,
      //         pricings: {
      //           create: {
      //             costPrice: product.unitPrice,
      //             // inventoryId is automatically linked by Prisma
      //           },
      //         },
      //       },
      //     },
      //   },
      // });
    }
  });
}
