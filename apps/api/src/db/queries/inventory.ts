import type { TRPCContext } from "@api/trpc/init";
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
    update: {},
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
        inventoryTypeAttributeId: z.number(),
        attributedVariantId: z.number(),
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
                inventoryTypeAttributeId: a.inventoryTypeAttributeId,
                attributedVariantId: a.attributedVariantId,
              })),
            },
          },
    },
  });
  return variant;
}
