import { Db } from "@gnd/db";
import { sortList } from "@gnd/utils";
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
      index: true,
    },
  });
  const blocksInventories = await db.inventory.findMany({
    where: {
      uid: {
        in: blocks.map((b) => b.uid),
      },
    },
  });
  return {
    blocks: sortList(
      blocks.map((b) => ({
        ...b,
        title: blocksInventories?.find((c) => c.uid === b.uid)?.name,
      })),
      "index"
    ),
    category,
  };
}
export const getCommunityBlockSchemaSchema = z.object({
  id: z.number(),
});
export type GetCommunityBlockSchemaSchema = z.infer<
  typeof getCommunityBlockSchemaSchema
>;
export async function getCommunityBlockSchema(
  db: Db,
  query: GetCommunityBlockSchemaSchema
) {
  const block = await db.communityTemplateBlockConfig.findUniqueOrThrow({
    where: {
      id: query.id,
    },
    select: {
      uid: true,
      id: true,
      index: true,
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
  const blocksInventories = await db.inventory.findMany({
    where: {
      uid: {
        in: [block.uid, ...block.inputConfigs.map((a) => a.uid)],
      },
    },
  });
  return {
    ...block,
    title: blocksInventories?.find((c) => c.uid === block.uid)?.name,
    inputConfigs: sortList(
      block.inputConfigs.map((i) => ({
        ...i,
        inv: blocksInventories?.find((c) => c.uid === i.uid),
      })),
      "index"
    ),
  };
}
export const getBlockInputsSchema = z.object({
  // blockId: z.number(),
});
export type GetBlockInputsSchema = z.infer<typeof getBlockInputsSchema>;

export async function getBlockInputs(db: Db, query: GetBlockInputsSchema) {
  const inputs = await db.communityTemplateInputConfig.findMany({
    where: {
      // communityTemplateBlockConfigId: query.blockId,
    },
    select: {
      index: true,
      columnSize: true,
      uid: true,
    },
  });
  const inventories = await db.inventory.findMany({
    where: {
      uid: {
        in: inputs.map((i) => i.uid),
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      uid: true,
    },
  });
  return {
    inputs: inputs.map((i) => ({
      ...i,
      inv: inventories.find((iv) => iv.uid == i.uid),
    })),
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
  index: z.number().nullable().optional(),
});
export type CreateTemplateSchemaBlockSchema = z.infer<
  typeof createTemplateSchemaBlockSchema
>;
export async function createTemplateSchemaBlock(
  db: Db,
  data: CreateTemplateSchemaBlockSchema
) {
  if (!data.index) data.index = await db.communityTemplateBlockConfig.count({});
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
) {
  await Promise.all(
    query.blocks.map(async (b) => {
      await db.communityTemplateBlockConfig.update({
        where: { id: b.id },
        data: {
          index: b.index,
        },
      });
    })
  );
}
