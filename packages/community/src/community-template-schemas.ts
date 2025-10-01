import { Db } from "@gnd/db";
import { sortList } from "@gnd/utils";
import {
  inventoryCategories,
  inventoryList,
  saveInventory,
  updateSubCategory,
  updateSubComponent,
} from "@sales/inventory";
import { z } from "zod";
import {
  COMMUNITY_BLOCKS_INVENTORY_CATEGORY_TITLE,
  COMMUNITY_LISTINGS_INVENTORY_CATEGORY_TITLE,
  COMMUNITY_SECTIONS_INVENTORY_CATEGORY_TITLE,
} from "./constants";

// type Db = any;
export const createCommunityTemplateBlockSchema = z.object({
  title: z.string(),
  categoryId: z.number(),
  index: z.number().optional().nullable(),
});
export type CreateCommunityTemplateBlockSchema = z.infer<
  typeof createCommunityTemplateBlockSchema
>;

export async function createCommunityTemplateBlock(
  db: Db,
  data: CreateCommunityTemplateBlockSchema
) {
  const inventory = await saveInventory(db, {
    product: {
      categoryId: data.categoryId,
      name: data.title,
      status: "draft",
      primaryStoreFront: false,
      stockMonitor: false,
    },
    subCategories: [],
    subComponents: [],
  });
  if (!data.index) data.index = await db.communityTemplateBlockConfig.count({});
  await db.communityTemplateBlockConfig.create({
    // where: {
    //   uid: inventory.uid,
    // },
    data: {
      status: "published",
      index: data.index,
      uid: inventory.uid,
    },
  });
}
/*
createCommunityInput: publicProcedure
      .input(createCommunityInputSchema)
      .mutation(async (props) => {
        return createCommunityInput(props.ctx, props.input);
      }),
*/
export const createCommunityInputSchema = z.object({
  title: z.string().optional().nullable(),
  uid: z.string().optional().nullable(),
  categoryId: z.number(),
  blockId: z.number(),
});
export type CreateCommunityInputSchema = z.infer<
  typeof createCommunityInputSchema
>;

export async function createCommunityInput(
  db: Db,
  data: CreateCommunityInputSchema
) {
  return db.$transaction(async (tx) => {
    if (data.title) {
      const inventory = await saveInventory(db, {
        product: {
          categoryId: data.categoryId,
          name: data.title,
          status: "draft",
          primaryStoreFront: false,
          stockMonitor: false,
        },
        subCategories: [],
        subComponents: [],
      });
      data.uid = inventory.uid;
    }
    await db.communityTemplateInputConfig.create({
      data: {
        uid: data.uid!,
        communityTemplateBlockConfigId: data.blockId,
      },
    });
  });
}

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
  const category = await getCommunitySectionsInventoryCategory(db);
  const communityCategory = await getCommunityBlocksInventoryCategory(db);
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
    communityCategory,
  };
}

export const getModelTemplateSchema = z.object({
  slug: z.string(),
  historySlug: z.string(),
});
export type GetModelTemplateSchema = z.infer<typeof getModelTemplateSchema>;

export async function getModelTemplate(db: Db, query: GetModelTemplateSchema) {
  const homeTemplate = await db.homeTemplates.findFirstOrThrow({
    where: { slug: query.slug },
    select: {
      history: !query.historySlug
        ? undefined
        : {
            where: {
              slug: query.historySlug,
            },
            select: {},
          },
      templateValues: {
        where: {
          deletedAt: null,
          history: query.historySlug
            ? {
                slug: query.historySlug,
              }
            : null,
        },
      },
    },
  });
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
          valueUid: true,
          title: true,
          id: true,
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
    select: {
      uid: true,
      name: true,
      id: true,
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
    ).filter((a) => ({
      ...a,
      title: a.title || a.inv?.name,
    })),
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
      deletedAt: {},
    },
    select: {
      index: true,
      columnSize: true,
      uid: true,
      title: true,
      valueUid: true,
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
    inputs: inputs
      .map((i) => ({
        ...i,
        inv: inventories.find((iv) => iv.uid == i.uid),
      }))
      .filter((a) => ({
        ...a,
        title: a.title || a.inv?.name,
      })),
  };
}

export async function getCommunitySectionsInventoryCategory(db: Db) {
  const response = await inventoryCategories(db, {
    q: COMMUNITY_SECTIONS_INVENTORY_CATEGORY_TITLE,
  });
  return response?.data?.[0];
}
export async function getCommunityListingsInventoryCategory(db: Db) {
  const response = await inventoryCategories(db, {
    q: COMMUNITY_LISTINGS_INVENTORY_CATEGORY_TITLE,
  });
  return response?.data?.[0];
}
export async function getCommunityBlocksInventoryCategory(db: Db) {
  const response = await inventoryCategories(db, {
    q: COMMUNITY_BLOCKS_INVENTORY_CATEGORY_TITLE,
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

export const updateRecordsIndicesSchema = z.object({
  records: z.array(
    z.object({
      id: z.any(),
      index: z.number(),
    })
  ),
  recordName: z.enum([
    "communityTemplateBlockConfig",
    "communityTemplateInputConfig",
  ]),
});
export type UpdateRecordsIndicesSchema = z.infer<
  typeof updateRecordsIndicesSchema
>;

export async function updateRecordsIndices(
  db: Db,
  query: UpdateRecordsIndicesSchema
) {
  await Promise.all(
    query.records.map(async (b) => {
      await (db[query.recordName] as any).update({
        where: { id: b.id },
        data: {
          index: b.index,
        },
      });
    })
  );
}

export const updateCommunityBlockInputSchema = z.object({
  id: z.number(),
  columnSize: z.number().optional().nullable().default(4),
  valueUid: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
});
export type UpdateCommunityBlockInputSchema = z.infer<
  typeof updateCommunityBlockInputSchema
>;

export async function updateCommunityBlockInput(
  db: Db,
  query: UpdateCommunityBlockInputSchema
) {
  await db.communityTemplateInputConfig.update({
    where: {
      id: query.id,
    },
    data: {
      columnSize: query.columnSize,
      valueUid: query.valueUid,
      title: query.title,
    },
  });
}

export const getTemplateInputListingsSchema = z.object({
  // uid: z.string(),
  inputInventoryId: z.number(),
});
export type GetTemplateInputListingsSchema = z.infer<
  typeof getTemplateInputListingsSchema
>;

export async function getTemplateInputListings(
  db: Db,
  query: GetTemplateInputListingsSchema
) {
  const results = await inventoryList(db, {
    // categoryId: query.inputInventoryId,
    subCategoryInvId: query.inputInventoryId,
    size: 99,
  });
  return results?.data?.map((r) => ({
    uid: r.uid,
    title: r.title,
  }));
}

/*
createTemplateInputLisiting: publicProcedure
      .input(createTemplateInputLisitingSchema)
      .mutation(async (props) => {
        return createTemplateInputLisiting(props.ctx, props.input);
      }),
*/
export const createTemplateInputLisitingSchema = z.object({
  uid: z.string(),
  // communityComponentCategoryId: z.number(),
  title: z.string(),
  inputBlockInventoryId: z.number(),
});
export type CreateTemplateInputLisitingSchema = z.infer<
  typeof createTemplateInputLisitingSchema
>;

export async function createTemplateInputLisiting(
  db: Db,
  data: CreateTemplateInputLisitingSchema
) {
  return db.$transaction(async (tx) => {
    let db = tx as any;
    const category = await getCommunityListingsInventoryCategory(db);
    const inventory = await saveInventory(db, {
      product: {
        categoryId: category?.id!,
        name: data.title,
        status: "draft",
        primaryStoreFront: false,
        stockMonitor: false,
      },
      subCategories: [],
      subComponents: [],
    });
    await updateSubCategory(db, {
      inventoryId: inventory.id,
      categoryId: (await getCommunityBlocksInventoryCategory(db))?.id!,
      valueInventoryId: data.inputBlockInventoryId,
    });
    return inventory;
  });
}
