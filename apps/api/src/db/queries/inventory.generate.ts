import type { TRPCContext } from "@api/trpc/init";
import type { UpsertInventoriesForDykeProducts } from "./inventory";
import type { Prisma } from "@gnd/db";
import { generateRandomString, nextId } from "@gnd/utils";
import { z } from "zod";
import {
  generateInventoryCategoryUidFromShelfCategoryId,
  type InventoryCategoryTypes,
} from "@sales/utils/inventory-utils";

export async function uploadInventoriesForDykeProducts(
  ctx: TRPCContext,
  data: UpsertInventoriesForDykeProducts
) {
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
    const newInventoryTypes: Prisma.ExInventoryCategoryCreateManyInput[] =
      missingInventoryTypeUids.map((uid) => {
        // const product = data.products.find((p) => p.step.uid === uid);
        const step = deps.find((a) => a.stepUid === uid);
        return {
          uid: uid,
          title: step?.stepTitle || uid, // Use step title or fallback to UID
          // type: "component",
        };
      });
    await ctx.db.exInventoryCategory.createMany({
      data: newInventoryTypes,
    });
    inventoryTypes = await getInventoryTypesByUids(ctx, stepUids);
  }
  const productUids = data.products.map((p) => p.uid)?.filter(Boolean);
  const stepInventoryType = inventoryTypes.find((a) => a.uid == stepUids[0]);
  await ctx.db.exInventoryCategoryVariantAttribute.createMany({
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
  let inventories = await ctx.db.exInventory.findMany({
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
  let newInventoryId = await nextId(ctx.db.exInventory);
  let newInventoryVariantId = await nextId(ctx.db.exInventoryVariant);
  let newICVAId = await nextId(ctx.db.exInventoryCategoryVariantAttribute);
  // let newIVAId = await nextId(ctx.db.exInventoryVariantAttribute);
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
        name: product.name as any,
        inventoryCategoryId: typeId as number,
        img: product.img,
        id: newInventoryId++,
      } satisfies Prisma.ExInventoryCreateManyInput;
    });
    const ls = data.products.filter((a) =>
      productsNotFound.every((p) => p.uid != a.uid)
    );
    // Inventory Category Variant Attributes
    const icvaToCreate =
      [] as Prisma.ExInventoryCategoryVariantAttributeCreateManyInput[];
    // Inventory Variant Attributes
    const ivaToCreate =
      [] as Prisma.ExInventoryVariantAttributeCreateManyInput[];
    const variantsToCreate = ls
      .filter((a) => a.price || (!a.price && !a.variants?.length))
      .map(
        (prod) =>
          ({
            inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
              ?.id!,
            uid: prod.uid!,
            img: prod.img,
            id: newInventoryVariantId++,
          }) satisfies Prisma.ExInventoryVariantCreateManyInput
      );
    const variantPricingsToCreate = ls
      .filter((a) => a.price)
      .map(
        (prod) =>
          ({
            inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
              ?.id!,
            price: prod.price!,
            inventoryVariantId: undefined,
          }) satisfies Prisma.ExInventoryVariantPricingCreateManyInput
      );
    ls.filter((a) => a.variants?.length).map((prod) =>
      prod.variants?.map((_var) => {
        const variant = {
          inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)?.id!,
          uid: prod.uid!,
          img: prod.img,
          // variantTitle: prod.name,
          id: newInventoryVariantId++,
        } satisfies Prisma.ExInventoryVariantCreateManyInput;

        _var.deps.map((dep) => {
          const vicId = inventoryTypes.find(
            (it) => it.uid === dep.stepUid
          )?.id!;
          const icva = {
            inventoryCategoryId: stepInventoryType?.id!,
            valuesInventoryCategoryId: vicId,
            id: undefined,
            // id: icvaToCreate.find(a => )
          } satisfies Prisma.ExInventoryCategoryVariantAttributeCreateManyInput;
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
            valueId: inventories.find((i) => i.uid === dep.productUid)?.id!,
          });
          if (dep.price)
            variantPricingsToCreate.push({
              inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
                ?.id!,
              price: dep.price!,
              inventoryVariantId: variant.id! as any,
            });
        });
      })
    );
    await ctx.db.exInventory.createMany({
      data: inventoriesToCreate,
    });
    await ctx.db.exInventoryVariant.createMany({
      data: variantsToCreate,
    });
    await ctx.db.exInventoryVariantPricing.createMany({
      data: variantPricingsToCreate,
    });
    await ctx.db.exInventoryCategoryVariantAttribute.createMany({
      data: icvaToCreate,
    });
    await ctx.db.exInventoryVariantAttribute.createMany({
      data: ivaToCreate,
    });
    inventories = await ctx.db.exInventory.findMany({
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
  const inventoryCategories = await ctx.db.exInventoryCategory.findMany({
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
    (await ctx.db.exInventoryCategory.findFirst({
      where: {
        // uid: `shelf-${data.categoryId}`,
        uid,
      },
    })) ||
    (await ctx.db.exInventoryCategory.create({
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
    [] as Prisma.ExInventorySubCategoryCreateManyInput[];
  let nextInventorySubCategoryId = await nextId(ctx.db.exInventorySubCategory);
  let nextInventoryVariantId = await nextId(ctx.db.exInventoryVariant);
  const inventoryCategoryIdMapByDykeCategory = {};
  function createCategory(
    parentId,
    parentInventoryCategoryId?,
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
          parentInventoryCategoryId,
          uid,
          parentSubCategoryUid,
          // inventoryTypeId: inventoryType.id!,
        });
        inventoryCategoryIdMapByDykeCategory[String(category.id)] = icId;
        createCategory(category.id, icId, uid);
      });
  }
  createCategory(data.categoryId);

  const __inventories: Prisma.ExInventoryCreateManyInput[] = [];
  // const __inventoryVariants: Prisma.InventoryCreateManyInput[] = [];
  const __inventoryVariants: Prisma.ExInventoryVariantCreateManyInput[] = [];
  const __inventoryVariantPricings: Prisma.ExInventoryVariantPricingCreateManyInput[] =
    [];
  const invItemSubCat: Prisma.ExInventoryItemSubCategoryCreateManyInput[] = [];
  let nextInventoryId = await nextId(ctx.db.inventory);
  let nextInventoryPriceId = await nextId(ctx.db.inventoryVariantPrice);
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

      //  categoryId:
      //  inventoryCategoryIdMapByDykeCategory[String(product.categoryId)],
    });
    // let cid = product.categoryId;
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
      await tx.exInventorySubCategory.createMany({
        data: inventorySubCategories,
      });
      await tx.exInventory.createMany({
        data: __inventories,
      });
      await tx.exInventoryVariant.createMany({
        data: __inventoryVariants,
      });
      await tx.exInventoryItemSubCategory.createMany({
        data: invItemSubCat,
      });
      await tx.exInventoryVariantPricing.createMany({
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
  const inventoryType = await ctx.db.exInventoryCategory.findFirst({
    where: {
      uid,
    },
  });
  return inventoryType;
}
