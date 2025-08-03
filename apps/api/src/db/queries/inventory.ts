import type { TRPCContext } from "@api/trpc/init";
import { db, type Prisma } from "@gnd/db";
import { nextId } from "@gnd/utils";
import { z } from "zod";

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
