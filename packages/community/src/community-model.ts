import { Db } from "@gnd/db";
import { timeout } from "@gnd/utils";
import { z } from "zod";

export const saveCommunityModelSchema = z.object({
  modelId: z.number(),
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
  query: SaveCommunityModelSchema
) {
  await timeout(5000);
  return {};
  // TO BE CONTINUED....
}
