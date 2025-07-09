import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";

const createInventoryTypeSchema = z.object({
  name: z.string(),
  uid: z.string(),
  attributes: z.array(
    z.object({
      associatedDykeStepId: z.number().nullable().optional(),
      associatedInventoryTypeId: z.number().nullable().optional(),
      name: z.string(),
      type: z.string().optional().nullable(),
      values: z.array(z.string()).optional().nullable(),
    }),
  ),
});
type CreateInventoryType = z.infer<typeof createInventoryTypeSchema>;
export async function createInventoryType(
  ctx: TRPCContext,
  data: CreateInventoryType,
) {
  const inventoryType = await ctx.db.inventoryType.upsert({
    where: {
      name: data.name,
    },
    create: {
      name: data.name,
      uid: data.uid,
    },
    update: {},
  });
  for (const attribute of data.attributes) {
    let attributeId = (
      await ctx.db.variantAttribute.create({
        data: {
          name: attribute.name,
          type: attribute.type,
          associatedDykeStepId: attribute.associatedDykeStepId || 0,
          associatedInventoryTypeId: attribute.associatedInventoryTypeId || 0,
          values: !attribute.values?.length
            ? undefined
            : {
                createMany: {
                  skipDuplicates: true,
                  data: attribute.values?.map((value) => ({
                    value,
                  })),
                },
              },
        },
      })
    ).id;
    await ctx.db.inventoryTypeAttribute.create({
      data: {
        attributeId,
        inventoryTypeId: inventoryType.id,
      },
    });
  }
}
export async function createInventory(ctx: TRPCContext) {}
