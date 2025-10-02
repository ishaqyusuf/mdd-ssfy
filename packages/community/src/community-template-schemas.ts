import { Db } from "@gnd/db";
import { sortList } from "@gnd/utils";
import {
  inventoryCategories,
  inventoryList,
  saveInventory,
  updateSubCategory,
} from "@sales/inventory";
import { z } from "zod";
import {
  COMMUNITY_BLOCKS_INVENTORY_CATEGORY_TITLE,
  COMMUNITY_LISTINGS_INVENTORY_CATEGORY_TITLE,
  COMMUNITY_SECTIONS_INVENTORY_CATEGORY_TITLE,
} from "./constants";
import { InputType } from "./types";

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
saveCommunityInput: publicProcedure
      .input(saveCommunityInputSchema)
      .mutation(async (props) => {
        return saveCommunityInput(props.ctx, props.input);
      }),
*/
export const saveCommunityInputSchema = z.object({
  title: z.string().optional().nullable(),
  uid: z.string().optional().nullable(),
  blockId: z.number(),
});
export type SaveCommunityInputSchema = z.infer<typeof saveCommunityInputSchema>;

export async function saveCommunityInput(
  db: Db,
  data: SaveCommunityInputSchema
) {
  return db.$transaction(async (tx) => {
    if (data.uid && data.title) {
      await tx.inventory.updateMany({
        where: {
          uid: data.uid,
        },
        data: {
          name: data.title!,
        },
      });
      return;
    }
    if (data.title) {
      const categoryId = (await getCommunityBlocksInventoryCategory(tx as any))
        ?.id!;
      const inventory = await saveInventory(tx as any, {
        product: {
          categoryId,
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
    await tx.communityTemplateInputConfig.create({
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
  const _blocks = await db.communityTemplateBlockConfig.findMany({
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
        in: _blocks.map((b) => b.uid),
      },
    },
  });
  const blocks = sortList(
    _blocks.map((b) => ({
      ...b,
      title: blocksInventories?.find((c) => c.uid === b.uid)?.name,
    })),
    "index"
  );

  return {
    blocks,
    category,
    communityCategory,
  };
}

export const getModelTemplateSchema = z.object({
  slug: z.string().optional(),
  historySlug: z.string().optional().nullable(),
});
export type GetModelTemplateSchema = z.infer<typeof getModelTemplateSchema>;

export async function getModelTemplate(db: Db, query: GetModelTemplateSchema) {
  const homeTemplate = await db.communityModels.findFirstOrThrow({
    where: { slug: query.slug! },
    select: {
      modelName: true,
      id: true,
      project: {
        select: {
          title: true,
          builder: {
            select: {
              name: true,
            },
          },
        },
      },
      history: !query.historySlug
        ? undefined
        : {
            where: {
              slug: query.historySlug,
            },
            select: {},
          },
      templateValues: {
        select: {
          uid: true,
          id: true,
          inventoryId: true,
          value: true,
          inputConfig: {
            select: {
              id: true,
            },
          },
        },
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
  return {
    title: `${homeTemplate?.project?.title} | ${homeTemplate?.modelName}`,
    values: homeTemplate.templateValues,
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
          valueUid: true,
          title: true,
          id: true,
          uid: true,
          columnSize: true,
          inputType: true,
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
    ).map((a) => ({
      ...a,
      title: a.title || a.inv?.name,
      inputType: a.inputType as InputType,
      _formMeta: {
        // row: 0,
        rowEdge: false,
        // formIndex: 0,
        formUid: "",
        rowNo: null as any,
        inventoryId: null as any,
        valueId: null as any,
        value: null as any,
      },
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
      id: true,
      index: true,
      columnSize: true,
      uid: true,
      title: true,
      // valueUid: true,
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
      inventoryCategoryId: true,
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
  inputType: z.string().optional().nullable(),
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
      inputType: query.inputType,
    },
  });
}
export const updateCommunityBlockInputAnalyticsSchema = z.object({
  id: z.number(),
});
export type UpdateCommunityBlockInputAnalyticsSchema = z.infer<
  typeof updateCommunityBlockInputAnalyticsSchema
>;

export async function updateCommunityBlockInputAnalytics(
  db: Db,
  data: UpdateCommunityBlockInputAnalyticsSchema
) {
  // await db.communityTemplateInputConfig.update({
  //   where: {
  //     id: query.id,
  //   },
  //   data: {
  //   },
  // });
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

export const saveTemplateInputListingSchema = z.object({
  uid: z.string(),

  // communityComponentCategoryId: z.number(),
  title: z.string(),
  inputBlockInventoryId: z.number(),
});
export type SaveTemplateInputListingSchema = z.infer<
  typeof saveTemplateInputListingSchema
>;

export async function saveTemplateInputListing(
  db: Db,
  data: SaveTemplateInputListingSchema
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

export const deleteInputSchemaSchema = z.object({
  id: z.number(),
});
export type DeleteInputSchemaSchema = z.infer<typeof deleteInputSchemaSchema>;

export async function deleteInputSchema(
  db: Db,
  query: DeleteInputSchemaSchema
) {
  await db.communityTemplateInputConfig.update({
    where: { id: query.id },
    data: {
      deletedAt: new Date(),
    },
  });
}
export const deleteInputInventoryBlockSchema = z.object({
  uid: z.string(),
});
export type DeleteInputInventoryBlockSchema = z.infer<
  typeof deleteInputInventoryBlockSchema
>;

export async function deleteInputInventoryBlock(
  db: Db,
  query: DeleteInputInventoryBlockSchema
) {
  await db.inventory.updateMany({
    where: {
      uid: query.uid,
    },
    data: {
      deletedAt: new Date(),
    },
  });
  await db.communityTemplateInputConfig.updateMany({
    where: { uid: query.uid },
    data: {
      deletedAt: new Date(),
    },
  });
}
