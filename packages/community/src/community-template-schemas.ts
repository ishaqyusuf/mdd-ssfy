import { Db } from "@gnd/db";
import { getInventoryCategories, inventoryCategories } from "@sales/inventory";
import { z } from "zod";
/*
getCommunitySchema: publicProcedure
      .input(getCommunitySchemaSchema)
      .input(async (props) => {
        return getCommunitySchema(props.ctx, props.input);
      }),
*/
export const getCommunitySchemaSchema = z.object({
  //   : z.string(),
});
export type GetCommunitySchemaSchema = z.infer<typeof getCommunitySchemaSchema>;

export async function getCommunitySchema(
  db: Db,
  query: GetCommunitySchemaSchema
) {
  const category = await getSchemaInventoryCategory(db);

  const blocks = await db.communityTemplateBlockConfig.findMany({
    where: {},
    select: {
      uid: true,
      id: true,
      inputConfigs: {
        where: {
          deletedAt: null,
        },
        select: {
          uid: true,
          columnSize: true,
          index: true,
        },
      },
    },
  });
  return {
    blocks,
    category,
  };
}

export async function getSchemaSections(db: Db) {}
export async function getSchemaInventoryCategory(db: Db) {
  const response = await inventoryCategories(db, {
    q: "Community Sections",
  });
  return response?.data?.[0];
}
/*
createTemplateSchemaBlock: publicProcedure
      .input(createTemplateSchemaBlockSchema)
      .mutation(async (props) => {
        return createTemplateSchemaBlock(props.ctx, props.input);
      }),
*/
export const createTemplateSchemaBlockSchema = z.object({
  inventoryUid: z.string(),
  index: z.number(),
});
export type CreateTemplateSchemaBlockSchema = z.infer<
  typeof createTemplateSchemaBlockSchema
>;

export async function createTemplateSchemaBlock(
  db: Db,
  data: CreateTemplateSchemaBlockSchema
) {
  await db.communityTemplateBlockConfig.upsert({
    where: {
      uid: data.inventoryUid,
    },
    create: {
      status: "published",
      index: data.index,
      uid: data.inventoryUid,
    },
    update: {},
  });
}
/*
updateTemplateBlocksIndices: publicProcedure
      .input(updateTemplateBlocksIndicesSchema)
      .mutation(async (props) => {
        return updateTemplateBlocksIndices(props.ctx, props.input);
      }),
*/
export const updateTemplateBlocksIndicesSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.number(),
      index: z.number(),
    })
  ),
});
export type UpdateTemplateBlocksIndicesSchema = z.infer<
  typeof updateTemplateBlocksIndicesSchema
>;

export async function updateTemplateBlocksIndices(
  db: Db,
  query: UpdateTemplateBlocksIndicesSchema
) {}
