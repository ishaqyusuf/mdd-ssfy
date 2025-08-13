import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { generateRandomString, nextId } from "@gnd/utils";
import { z } from "zod";
import {
  generateInventoryCategoryUidFromShelfCategoryId,
  type InventoryCategoryTypes,
} from "@sales/utils/inventory-utils";
import type { StepComponentMeta } from "@sales/types";

export async function migrateDykeStepToInventories(
  ctx: TRPCContext,
  stepId: number
) {
  const step = await ctx.db.dykeSteps.findUniqueOrThrow({
    where: {
      id: stepId,
    },
    include: {
      stepProducts: true,
      priceSystem: {
        include: {
          step: {
            select: {
              uid: true,
            },
          },
        },
      },
    },
  });
  const components = step.stepProducts.map((product) => {
    const meta: StepComponentMeta = product.meta as any;
    const variations = meta.variations;
    return {
      ...product,
      meta,
      depsComponentUids:
        variations
          ?.map((a) => a?.rules?.map((r) => r?.componentsUid)?.flat())
          ?.flat() || [],
      depsStepUids:
        variations?.map((a) => a?.rules?.map((r) => r?.stepUid))?.flat() || [],
    };
  });
  const stepsUid = [
    ...new Set(
      ...components.map((c) => c.depsStepUids).flat(),
      ...step.priceSystem.map((c) => c.step?.uid)
    ),
  ].filter(Boolean)!;
  const depsSteps = await ctx.db.dykeSteps.findMany({
    where: {
      uid: {
        in: stepsUid,
      },
    },
    include: {
      stepProducts: true,
    },
  });
  const productsList = depsSteps
    .map((a) =>
      a.stepProducts.map((p) => ({
        ...p,
        stepUid: a.uid,
      }))
    )
    .flat();
  const products: UpsertInventoriesForDykeProducts["products"] =
    step.stepProducts.map((product) => {
      const meta: StepComponentMeta = product.meta as any;
      const variations = meta.variations;
      return {
        img: product.img,
        name: product.name,
        uid: product.uid,
        categories: variations
          ?.map((v) => v?.rules)
          ?.flat()
          // ?.filter((a) => a.operator == "is")
          .map((r) =>
            r.componentsUid?.map((uid) => ({
              stepUid: r.stepUid,
              componentUid: uid,
              operator: r.operator,
              componentName: productsList.find((p) => p.uid == uid)?.name!,
              stepTitle: depsSteps.find((s) => s.uid === r.stepUid)?.title!,
            }))
          )
          .flat()!,
        variants: step.priceSystem
          .filter((s) => s.stepProductUid === product.uid)
          .map((v) => ({
            price: v.price,
            deps: v.dependenciesUid?.split("-")?.map((uid) => ({
              componentUid: uid,
              stepUid: v.step!?.uid!,
              componentName: productsList.find((p) => p.uid == uid)?.name!,
              stepTitle: depsSteps.find((s) => s.uid === v.step?.uid)?.title!,
            }))!,
          })),
      };
    });
  const data = {
    products,
    step: {
      uid: step.uid!,
      title: step.title!,
    },
  } as UpsertInventoriesForDykeProducts;
  // }
  // export async function uploadInventoriesForDykeProducts(
  //   ctx: TRPCContext,
  //   data: UpsertInventoriesForDykeProducts
  // ) {
  const deps = data.products
    .filter((a) => a.variants?.length)
    .map((a) => a.variants!?.map((b) => b.deps).flat())
    .flat();
  // const stepUids = Array.from(
  //   new Set([data.step.uid, ...deps.map((a) => a.stepUid)])
  // );
  let inventoryTypes = await getInventoryTypesByUids(ctx, stepsUid);
  const missingInventoryTypeUids = stepsUid.filter(
    (uid) => !inventoryTypes.some((it) => it.uid === uid)
  );
  if (missingInventoryTypeUids.length > 0) {
    const newInventoryTypes: Prisma.InventoryCategoryCreateManyInput[] =
      missingInventoryTypeUids.map((uid) => {
        // const product = data.products.find((p) => p.step.uid === uid);
        const step = deps.find((a) => a.stepUid === uid);
        return {
          uid: uid,
          title: step?.stepTitle || uid, // Use step title or fallback to UID
          // type: "component",
        };
      });
    await ctx.db.inventoryCategory.createMany({
      data: newInventoryTypes,
    });
    inventoryTypes = await getInventoryTypesByUids(ctx, stepsUid);
  }
  const productUids = data.products.map((p) => p.uid)?.filter(Boolean);
  const stepInventoryType = inventoryTypes.find((a) => a.uid == stepsUid[0]);
  await ctx.db.inventoryCategoryVariantAttribute.createMany({
    data: deps
      .filter((d, di) => deps.findIndex((a) => a.stepUid === d.stepUid) == di)
      .map((ta) => ({
        inventoryCategoryId: stepInventoryType?.id!,
        valuesInventoryCategoryId: inventoryTypes.find(
          (a) => a.uid === ta.stepUid
        )!?.id,
      })),
    skipDuplicates: true,
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
        stepUid: stepsUid[0],
        img: product.img,
        name: product.name,
      },
      ...deps?.map((d) => ({
        uid: d.componentUid,
        img: "",
        name: d.componentName,
        stepUid: d.stepUid,
      })),
    ])
    .flat();
  const productsNotFound = __allProducts.filter(
    (p) => p.uid && !inventories.some((i) => i.uid === p.uid)
  );
  let newInventoryId = await nextId(ctx.db.inventory);
  let newInventoryVariantId = await nextId(ctx.db.inventoryVariant);
  let newICVAId = await nextId(ctx.db.inventoryCategoryVariantAttribute);
  // let newIVAId = await nextId(ctx.db.inventoryVariantAttribute);
  // Inventory Item Sub Category Values
  let nextIiscvId = await nextId(ctx.db.inventoryVariant);
  // Inventory Item Sub Categories
  let nextIiscId = await nextId(ctx.db.inventoryCategoryVariantAttribute);
  if (productsNotFound.length) {
    const inventoriesToCreate = productsNotFound.map((product) => {
      const inventoryType = inventoryTypes.find(
        (t) => t.uid === product.stepUid
      );
      const typeId = inventoryType?.id;
      if (!typeId) {
        console.error(`InventoryType not found for uid: ${data.step.uid}`);
      }
      // product.stepUid
      return {
        uid: product.uid as any,
        name: product.name as any,
        inventoryCategoryId: typeId as number,
        img: product.img,
        id: newInventoryId++,
      } satisfies Prisma.InventoryCreateManyInput;
    });
    const inventoryId = (uid) =>
      inventoriesToCreate.find((i) => i.uid === uid)?.id!;
    // Inventory Item Sub Categories
    let nextIiscId = await nextId(ctx.db.inventoryCategoryVariantAttribute);
    const iiscToCreate = [] as Prisma.InventoryItemSubCategoryCreateManyInput[];
    // Inventory Item Sub Category Values
    const iiscvToCreate =
      [] as Prisma.InventoryItemSubCategoryValueCreateManyInput[];
    const ls = data.products.filter((a) =>
      productsNotFound.every((p) => p.uid != a.uid)
    );
    ls.filter((a) => a.categories?.length).map((component) => {
      component.categories?.map((category) => {
        const cid = nextIiscId++;
        const civd = nextIiscvId++;
        iiscToCreate.push({
          inventoryId: inventoryId(component.uid),
          id: cid,
        });
        iiscvToCreate.push({
          id: civd,
          inventoryId: inventoryId(component.uid),
          subCategoryId: cid,
          operator: category.operator,
        });
      });
    });
    // Inventory Category Variant Attributes.
    const icvaToCreate =
      [] as Prisma.InventoryCategoryVariantAttributeCreateManyInput[];
    // Inventory Variant Attributes.
    const ivaToCreate = [] as Prisma.InventoryVariantAttributeCreateManyInput[];
    const variantsToCreate = ls
      .filter((a) => a.price || (!a.price && !a.variants?.length))
      .map(
        (prod) =>
          ({
            inventoryId: inventoryId(prod.uid),
            uid: prod.uid!,
            img: prod.img,
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
          }) satisfies Prisma.InventoryVariantPricingCreateManyInput
      );
    ls.filter((a) => a.variants?.length).map((prod) =>
      prod.variants?.map((_var) => {
        const variant = {
          inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)?.id!,
          uid: prod.uid!,
          img: prod.img,
          // variantTitle: prod.name,
          id: newInventoryVariantId++,
        } satisfies Prisma.InventoryVariantCreateManyInput;
        _var.deps.map((dep) => {
          const vicId = inventoryTypes.find(
            (it) => it.uid === dep.stepUid
          )?.id!;
          const icva = {
            inventoryCategoryId: stepInventoryType?.id!,
            valuesInventoryCategoryId: vicId,
            id: undefined,
            // id: icvaToCreate.find(a => )
          } satisfies Prisma.InventoryCategoryVariantAttributeCreateManyInput;
          let icvaId = icvaToCreate.find(
            (a) =>
              icva.inventoryCategoryId == a.inventoryCategoryId &&
              a.valuesInventoryCategoryId === icva.valuesInventoryCategoryId
          ) as any;
          if (!icvaId) {
            icvaId = newICVAId++;
            icva.id = icvaId;
            icvaToCreate.push(icva);
          }
          ivaToCreate.push({
            inventoryVariantId: variant.id,
            inventoryCategoryVariantAttributeId: icva.id!,
            valueId: inventories.find((i) => i.uid === dep.componentUid)?.id!,
          });
        });
        if (_var.price)
          variantPricingsToCreate.push({
            inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
              ?.id!,
            costPrice: _var.price!,
            inventoryVariantId: variant.id! as any,
          });
      })
    );
    await ctx.db.inventory.createMany({
      data: inventoriesToCreate,
    });
    await ctx.db.inventoryVariant.createMany({
      data: variantsToCreate,
    });
    await ctx.db.inventoryVariantPricing.createMany({
      data: variantPricingsToCreate,
    });
    await ctx.db.inventoryCategoryVariantAttribute.createMany({
      data: icvaToCreate,
    });
    await ctx.db.inventoryVariantAttribute.createMany({
      data: ivaToCreate,
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
export async function getInventoryTypesByUids(
  ctx: TRPCContext,
  uids: string[]
) {
  const inventoryCategories = await ctx.db.inventoryCategory.findMany({
    where: {
      uid: {
        in: uids,
      },
    },
    select: {
      uid: true,
      title: true,
      id: true,
    },
  });
  return inventoryCategories;
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
  const uid = generateInventoryCategoryUidFromShelfCategoryId(data.categoryId);
  const inventoryCategory =
    (await ctx.db.inventoryCategory.findFirst({
      where: {
        // uid: `shelf-${data.categoryId}`,
        uid,
      },
    })) ||
    (await ctx.db.inventoryCategory.create({
      data: {
        title: parentCategory?.name!,
        // uid: `shelf-${data.categoryId}`,
        uid,
        type: "shelf-item" as InventoryCategoryTypes,
      },
    }));
  const categories = await ctx.db.dykeShelfCategories.findMany({
    where: {
      parentCategoryId: data.categoryId,
    },
  });
  let inventorySubCategories =
    [] as Prisma.InventorySubCategoryCreateManyInput[];
  let nextInventorySubCategoryId = await nextId(ctx.db.inventorySubCategory);
  let nextInventoryVariantId = await nextId(ctx.db.inventoryVariant);
  const inventoryCategoryIdMapByDykeCategory = {};
  function createCategory(
    parentId,
    // parentInventoryCategoryId?,
    parentSubCategoryUid?
  ) {
    categories
      .filter((c) => c.categoryId == parentId)
      .map((category) => {
        const uid = generateRandomString(5);
        let icId = nextInventorySubCategoryId++;
        inventorySubCategories.push({
          id: icId,
          title: category.name,
          parentInventoryCategoryId: inventoryCategory.id,
          uid,
          parentSubCategoryUid,
          // inventoryTypeId: inventoryType.id!,
        });
        inventoryCategoryIdMapByDykeCategory[String(category.id)] = icId;
        createCategory(category.id, uid);
      });
  }
  createCategory(data.categoryId);

  const __inventories: Prisma.InventoryCreateManyInput[] = [];
  // const __inventoryVariants: Prisma.InventoryCreateManyInput[] = [];
  const __inventoryVariants: Prisma.InventoryVariantCreateManyInput[] = [];
  const __inventoryVariantPricings: Prisma.InventoryVariantPricingCreateManyInput[] =
    [];
  const invItemSubCat: Prisma.InventoryItemSubCategoryCreateManyInput[] = [];
  let nextInventoryId = await nextId(ctx.db.inventory);
  let nextInventoryPriceId = await nextId(ctx.db.inventoryVariant);
  products.map((product) => {
    let ivId = nextInventoryId++;
    let priceId = nextInventoryPriceId++;
    let variantId = nextInventoryVariantId++;
    __inventories.push({
      uid: `shelf-prod-${product.id}`,
      id: ivId,
      img: product.img,
      inventoryCategoryId: inventoryCategory.id,
      name: product.title,
    });
    const catIds = (product.meta as any)?.categoryIds || [];
    for (let i = 1; i < catIds.length; i++) {
      const cid = catIds?.[i];
      if (cid) {
        let subCatId = inventoryCategoryIdMapByDykeCategory[String(cid)];
        invItemSubCat.push({
          inventoryId: ivId,
          inventorySubCategoryId: subCatId,
        });
      }
    }
    __inventoryVariants.push({
      id: variantId,
      inventoryId: ivId,
      uid: `shelf-prod-${product.id}`,
    });
    __inventoryVariantPricings.push({
      id: priceId,
      inventoryId: ivId,
      price: product.unitPrice!,
      inventoryVariantId: variantId,
    });
  });
  return ctx.db.$transaction(
    async (tx) => {
      await tx.inventorySubCategory.createMany({
        data: inventorySubCategories,
      });
      await tx.inventory.createMany({
        data: __inventories,
      });
      await tx.inventoryVariant.createMany({
        data: __inventoryVariants,
      });
      await tx.inventoryItemSubCategory.createMany({
        data: invItemSubCat,
      });
      await tx.inventoryVariantPricing.createMany({
        data: __inventoryVariantPricings,
      });
    },
    {
      timeout: 20 * 1000,
    }
  );
}
export async function getInventoryCategoryByShelfId(
  ctx: TRPCContext,
  categoryId
) {
  const uid = generateInventoryCategoryUidFromShelfCategoryId(categoryId);
  const inventoryType = await ctx.db.inventoryCategory.findFirst({
    where: {
      uid,
    },
  });
  return inventoryType;
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
      categories: z
        .array(
          z.object({
            stepUid: z.string(),
            componentUid: z.string(),
            operator: z.enum(["is", "isNot"]).nullable().optional(),
            stepTitle: z.string(),
            componentName: z.string(),
          })
        )
        .optional()
        .nullable(),
      variants: z
        .array(
          z.object({
            deps: z.array(
              z.object({
                stepUid: z.string(),
                componentUid: z.string(),
                stepTitle: z.string(),
                componentName: z.string(),
              })
            ),
            price: z.number().optional().nullable(),
          })
        )
        .optional()
        .nullable(),
    })
  ),
});
export type UpsertInventoriesForDykeProducts = z.infer<
  typeof upsertInventoriesForDykeProductsSchema
>;
