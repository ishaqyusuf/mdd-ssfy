import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { z } from "zod";

const createInventoryTypeSchema = z.object({
  name: z.string(),
  uid: z.string(),
  attributes: z
    .array(
      z.object({
        inventoryTypeId: z.number(),
      }),
    )
    .optional()
    .nullable(),
});
type CreateInventoryType = z.infer<typeof createInventoryTypeSchema>;
export async function createInventoryType(
  ctx: TRPCContext,
  data: CreateInventoryType,
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
      }),
    )
    .optional()
    .nullable(),
});
type CreateInventoryVariant = z.infer<typeof createInventoryVariantSchema>;
export async function createInventoryVariant(
  ctx: TRPCContext,
  data: CreateInventoryVariant,
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
  uids: string[],
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
  products: z.array(
    z.object({
      uid: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
      img: z.string().optional().nullable(),
      step: z.object({
        // id: z.number(),
        uid: z.string(),
        title: z.string(),
      }),
    }),
  ),
});
type UpsertInventoriesForDykeProducts = z.infer<
  typeof upsertInventoriesForDykeProductsSchema
>;
export async function upsertInventoriesForDykeProducts(
  ctx: TRPCContext,
  data: UpsertInventoriesForDykeProducts,
) {
  // get all inventories types, create unavailable ones if they don't exist
  const stepUids = data.products.map((p) => p.step.uid);
  let inventoryTypes = await getInventoryTypesByUids(ctx, stepUids);

  const missingInventoryTypeUids = stepUids.filter(
    (uid) => !inventoryTypes.some((it) => it.uid === uid),
  );
  if (missingInventoryTypeUids.length > 0) {
    const newInventoryTypes = missingInventoryTypeUids.map((uid) => {
      const product = data.products.find((p) => p.step.uid === uid);
      return {
        uid: uid,
        name: product?.step.title || uid, // Use step title or fallback to UID
      };
    });
    await ctx.db.inventoryType.createMany({
      data: newInventoryTypes,
    });

    inventoryTypes = await getInventoryTypesByUids(ctx, stepUids);
  }

  // get existing products
  const productUids = data.products.map((p) => p.uid)?.filter(Boolean);

  let inventories = await ctx.db.inventory.findMany({
    where: {
      uid: {
        in: productUids as any,
      },
    },
  });

  const productsNotFound = data.products.filter(
    (p) => p.uid && !inventories.some((i) => i.uid === p.uid),
  );

  if (productsNotFound.length) {
    const inventoriesToCreate = productsNotFound.map((product) => {
      const inventoryType = inventoryTypes.find(
        (t) => t.uid === product.step.uid,
      );
      const typeId = inventoryType?.id;
      if (!typeId) {
        console.error(`InventoryType not found for uid: ${product.step.uid}`);
      }
      return {
        uid: product.uid as any,
        title: product.name as any,
        typeId: typeId as number,
        img: product.img,
      } satisfies Prisma.InventoryCreateManyInput;
    });
    await ctx.db.inventory.createMany({
      data: inventoriesToCreate,
    });
    inventories = await ctx.db.inventory.findMany({
      where: {
        uid: {
          in: productUids as any,
        },
      },
    });
  }

  return {
    inventories,
    inventoryTypes,
  };
}
