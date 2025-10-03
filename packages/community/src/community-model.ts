import { Db } from "@gnd/db";
import { timeout } from "@gnd/utils";
import { z } from "zod";

export const saveCommunityModelSchema = z.object({
  modelId: z.number(),
  authorName: z.string(),
  nullValueIds: z.array(z.number()),
  formValues: z.array(
    z.object({
      id: z.number().optional().nullable(),
      data: z.object({
        inputConfigId: z.number(),
        uid: z.string(),
        value: z.number().optional().nullable(),
        inventoryId: z.number().optional().nullable(),
      }),
    })
  ),
});
export type SaveCommunityModelSchema = z.infer<typeof saveCommunityModelSchema>;

export async function saveCommunityModel(
  db: Db,
  data: SaveCommunityModelSchema
) {
  return db.$transaction(async (tx) => {
    const updates = data.formValues.filter((a) => a.id);
    const creates = data.formValues.filter((a) => !a.id);
    await Promise.all(
      updates.map(async (v) => {
        await tx.communityModelTemplateValue.update({
          where: {
            id: v.id!,
          },
          data: {
            value: v.data.value,
            inventoryId: v.data.inventoryId,
            communityModelId: data.modelId,
          },
        });
      })
    );
    await tx.communityModelTemplateValue.updateMany({
      where: {
        history: null,
        communityModelId: data.modelId,
        id: {
          notIn: updates.map((a) => a.id!),
        },
      },
      data: {
        deletedAt: new Date(0),
      },
    });
    await tx.communityModelTemplateValue.createMany({
      data: creates.map((v) => ({
        value: v.data.value,
        inventoryId: v.data.inventoryId,
        homeTemplateId: data.modelId,
        uid: v.data.uid,
        inputConfigId: v.data.inputConfigId,
        communityModelId: data.modelId,
      })),
    });
    const newValues = await tx.communityModelTemplateValue.findMany({
      where: {
        history: null,
        communityModelId: data.modelId,
      },
    });
    await tx.communityModelHistory.create({
      data: {
        author: data.authorName,
        values: {
          createMany: {
            data: newValues.map(
              ({
                communityModelId,
                inputConfigId,
                uid,
                value,
                inventoryId,
              }) => ({
                communityModelId,
                inputConfigId,
                uid,
                value,
                inventoryId,
              })
            ),
          },
        },
      },
    });
  });
}
