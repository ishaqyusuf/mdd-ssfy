import { Db, Prisma } from "@gnd/db";
import { z } from "zod";

// export async function getAnalyticsList(db: Db,)
/*
getAnalytics: publicProcedure
      .input(getAnalyticsSchema)
      .query(async (props) => {
        return getAnalytics(props.ctx, props.input);
      }),
*/
// export const getAnalyticsSchema = z.object({
//   //   : z.string(),
// });
// export type GetAnalyticsSchema = z.infer<typeof getAnalyticsSchema>;

// export async function getAnalytics(db: Db, query: GetAnalyticsSchema) {
//   const ai = await db.communityTemplateInputConfig.findMany({
//     where: {
//       enableAnalytics: true,
//     },
//     select: {
//       analyticAttributes: {
//         select: {
//           inputConfig: {
//             select: {
//               uid: true,
//             },
//           },
//         },
//       },
//     },
//   });
//   const a = await db.communityAnalyticAttributes.findMany({
//     where: {
//       // inputConfig:
//     },
//     select: {
//       inputConfig: {
//         select: {
//           uid: true,
//           title: true,
//           blockConfig: {
//             select: {
//               uid: true,
//             },
//           },
//         },
//       },
//     },
//   });
// }

// ---------- replaced / new code (only what's needed) ----------

// old:
// export const getAnalyticsSchema = z.object({
// //   : z.string(),
// });
// export type GetAnalyticsSchema = z.infer<typeof getAnalyticsSchema>;
// export async function getAnalytics(db: PrismaDb, query: GetAnalyticsSchema) {}
//
// new:

export const getAnalyticsSchema = z.object({
  // identify the block either by block config uid or by inventory category uid
  blockUid: z.string().optional(),
  blockCategoryUid: z.string().optional(),

  // pagination
  pageSize: z.number().int().positive().max(100).default(20),
  // cursor is base64 encoded last-seen `groupTitle` (string)
  cursor: z.string().optional(),
});
export type GetAnalyticsSchema = z.infer<typeof getAnalyticsSchema>;

function encodeCursor(s: string) {
  return Buffer.from(s).toString("base64");
}
function decodeCursor(c?: string) {
  if (!c) return undefined;
  try {
    return Buffer.from(c, "base64").toString("utf8");
  } catch {
    return undefined;
  }
}

/**
 * Returns:
 * {
 *  items: { title: string, subtitle: string, sumQty: number, blockTitle: string }[],
 *  nextCursor?: string
 * }
 */
export async function getAnalytics(db: Db, query: GetAnalyticsSchema) {
  const { blockUid, blockCategoryUid, pageSize, cursor } = query;

  if (!blockUid && !blockCategoryUid) {
    throw new Error("Either blockUid or blockCategoryUid must be provided.");
  }

  // 1) Resolve block (CommunityTemplateBlockConfig) and/or inventory category (InventoryCategory)
  let blockConfig: { id: number; uid: string /* maybe meta/title */ } | null =
    null;
  if (blockUid) {
    blockConfig = await db.communityTemplateBlockConfig.findUnique({
      where: { uid: blockUid },
      select: {
        id: true,
        uid: true /* if you store a title in meta, fetch it here */,
      },
    });
    if (!blockConfig) throw new Error(`blockUid not found: ${blockUid}`);
  }

  let blockCategory: { id: number; uid: string; title?: string } | null = null;
  if (blockCategoryUid) {
    blockCategory = await db.inventoryCategory.findFirst({
      where: { uid: blockCategoryUid },
      select: { id: true, uid: true, title: true },
    });
    if (!blockCategory)
      throw new Error(`blockCategoryUid not found: ${blockCategoryUid}`);
  }

  // 2) Find analytic input configs for the given blockConfig (enableAnalytics = true)
  // If we resolved blockConfig use that; otherwise find analytic input configs that have values linked to the inventory category.
  let analyticInputs: Prisma.CommunityTemplateInputConfigGetPayload<{
    select: {
      id: true;
      uid: true;
      title: true;
      // include analytic attributes (entries where attrInput === this owner input)
      analyticAttributes: {
        where: { attrInputId: { not: null } };
        select: {
          id: true;
          inputConfigId: true; // this points to the attribute input config (e.g., Door type)
          inputConfig: { select: { id: true; uid: true; title: true } };
        };
      };
    };
  }>[] = [];
  if (blockConfig) {
    analyticInputs = await db.communityTemplateInputConfig.findMany({
      where: {
        communityTemplateBlockConfigId: blockConfig.id,
        enableAnalytics: true,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        // include analytic attributes (entries where attrInput === this owner input)
        analyticAttributes: {
          where: { attrInputId: { not: null } },
          select: {
            id: true,
            inputConfigId: true, // this points to the attribute input config (e.g., Door type)
            inputConfig: { select: { id: true, uid: true, title: true } },
          },
        },
      },
    });
  } else if (blockCategory) {
    // fallback: find analytic inputs that have template values attached to this inventory category
    analyticInputs = await db.communityTemplateInputConfig.findMany({
      where: {
        enableAnalytics: true,
        values: { some: { inventoryCategoryId: blockCategory.id } },
      },
      select: {
        id: true,
        uid: true,
        title: true,
        analyticAttributes: {
          where: { attrInputId: { not: null } },
          select: {
            id: true,
            inputConfigId: true,
            inputConfig: { select: { id: true, uid: true, title: true } },
          },
        },
      },
    });
  }

  // If none found, return empty
  if (!analyticInputs || analyticInputs.length === 0) {
    return { items: [], nextCursor: undefined };
  }

  const results: Array<{
    title: string;
    subtitle: string;
    sumQty: number;
    blockTitle: string;
  }> = [];

  // 3) For each analytic input owner, gather template values for analytic + all its attribute inputs
  for (const analytic of analyticInputs) {
    const attributeInputIds = analytic.analyticAttributes
      .map((a: any) => a.inputConfigId)
      .filter(Boolean);

    // fetch all template values that belong to this analytic input OR any attribute input,
    // optionally restricted to a specific inventoryCategory (blockCategory)
    const whereClause: any = {
      inputConfigId: { in: [analytic.id, ...attributeInputIds] },
    };
    if (blockCategory) {
      whereClause.inventoryCategoryId = blockCategory.id;
    }

    const rawValues = await db.communityModelTemplateValue.findMany({
      where: whereClause,
      include: {
        inventory: { select: { id: true, name: true } },
        // we include inputConfig to know which input the value is for
        inputConfig: { select: { id: true, uid: true, title: true } },
        communityModel: { select: { id: true } },
      },
    });

    // 4) Group by communityModelId and then build group-key from attribute values
    // Map: groupKey -> sumQty
    const groupMap = new Map<
      string,
      { sumQty: number; blockTitle: string; subtitle: string }
    >();

    // Index rawValues by communityModelId then by inputConfigId
    const byModel = new Map<number, Array<any>>();
    for (const v of rawValues) {
      const cmId = v.communityModelId;
      if (!byModel.has(cmId)) byModel.set(cmId, []);
      byModel.get(cmId)!.push(v);
    }

    // for each model assemble attribute titles and analytic qty
    for (const [cmId, vals] of byModel.entries()) {
      // find analytic value entry for this analytic input id
      const analyticEntry = vals.find(
        (v: any) => v.inputConfigId === analytic.id
      );
      // analytic quantity: if analyticEntry has .value use it else if it has inventoryId default to 1
      let qty = 0;
      if (analyticEntry) {
        qty = analyticEntry.value ?? (analyticEntry.inventoryId ? 1 : 0);
      } else {
        // if analytic missing for this model, skip
        continue;
      }

      // for each attributeInputId, pick the templateValue for this model
      const attrParts: string[] = [];
      for (const attrId of attributeInputIds) {
        const attrVal = vals.find((v: any) => v.inputConfigId === attrId);
        let part = "Unknown";
        if (attrVal) {
          if (attrVal.inventory) {
            part = String(attrVal.inventory.title);
          } else if (attrVal.value !== null && attrVal.value !== undefined) {
            part = String(attrVal.value);
          } else if (attrVal.uid) {
            part = String(attrVal.uid);
          } else {
            part = "Unknown";
          }
        }
        attrParts.push(part);
      }

      // compose title: `${doorTypeInvTitle} ${configurationInvTitle} ${casingStyle} LH QTY`
      const attrTitle = attrParts.join(" ").trim();
      const groupTitle =
        `${attrTitle} ${analytic.title ?? analytic.uid}`.trim(); // analytic.title likely "LH Qty"
      const subtitle = "LH QTY";

      // blockTitle: prefer blockCategory.title if we resolved it, otherwise the CommunityTemplateBlockConfig.uid (or meta)
      let blockTitle =
        blockCategory?.title ?? blockConfig?.uid ?? "Unknown Block";

      const existing = groupMap.get(groupTitle);
      if (!existing) {
        groupMap.set(groupTitle, { sumQty: qty, blockTitle, subtitle });
      } else {
        existing.sumQty += qty;
      }
    }

    // append groups to results
    for (const [title, data] of groupMap.entries()) {
      results.push({
        title,
        subtitle: data.subtitle,
        sumQty: data.sumQty,
        blockTitle: data.blockTitle,
      });
    }
  }

  // 5) Sort groups by title (you can change to sumQty desc if needed)
  results.sort((a, b) => {
    // primary: sumQty desc, secondary: title asc
    if (b.sumQty !== a.sumQty) return b.sumQty - a.sumQty;
    return a.title.localeCompare(b.title);
  });

  // 6) Cursor pagination
  // cursor is base64 encoded title of last seen item; we find its index and slice from next item
  const decodedCursor = decodeCursor(cursor);
  let startIndex = 0;
  if (decodedCursor) {
    const idx = results.findIndex((r) => r.title === decodedCursor);
    if (idx >= 0) startIndex = idx + 1;
  }

  const pageItems = results.slice(startIndex, startIndex + pageSize);
  const lastItem = pageItems[pageItems.length - 1];
  const nextCursor = lastItem ? encodeCursor(lastItem.title) : undefined;

  return {
    items: pageItems,
    nextCursor,
  };
}
// import { z } from "zod";

// export const getAnalyticsSchema = z.object({
//   blockUid: z.string(),
//   cursor: z.string().optional(),
//   pageSize: z.number().int().positive().max(100).default(20),
// });
// export type GetAnalyticsSchema = z.infer<typeof getAnalyticsSchema>;

export async function getAnalyticsOptimized(db: Db, query: GetAnalyticsSchema) {
  const { blockUid, cursor, pageSize } = query;

  // Step 1: find block
  const block = await db.communityTemplateBlockConfig.findUnique({
    where: { uid: blockUid },
    select: {
      id: true,
      uid: true,
      inputConfigs: {
        where: { enableAnalytics: true },
        select: {
          id: true,
          title: true,
          analyticAttributes: {
            select: {
              inputConfigId: true, // attribute input id
              inputConfig: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });
  if (!block) throw new Error("Block not found");

  const analyticInputIds = block.inputConfigs.map((i) => i.id);
  if (analyticInputIds.length === 0) return { items: [], nextCursor: null };

  // Step 2: collect all attribute input ids used by these analytic inputs
  const attributeInputIds = block.inputConfigs
    .flatMap((i) => i.analyticAttributes.map((a) => a.inputConfigId))
    .filter(Boolean);

  // Step 3: query DB once for all template values (analytics + attributes)
  const allValues = await db.communityModelTemplateValue.findMany({
    where: {
      inputConfigId: {
        in: [...analyticInputIds, ...attributeInputIds]
          .filter((a) => !!a)
          .map((id) => id!),
      },
    },
    select: {
      inputConfigId: true,
      communityModelId: true,
      value: true,
      inventoryId: true,
      inventory: { select: { name: true } },
    },
  });

  // Step 4: group values by communityModelId for fast in-memory mapping
  const modelMap = new Map<number, any[]>();
  for (const v of allValues) {
    const arr = modelMap.get(v.communityModelId) ?? [];
    arr.push(v);
    modelMap.set(v.communityModelId, arr);
  }

  // Step 5: Aggregate analytics per model in-memory (light, since grouped)
  const resultMap = new Map<
    string,
    { sumQty: number; blockTitle: string; subtitle: string }
  >();

  for (const analytic of block.inputConfigs) {
    const attrs = analytic.analyticAttributes.map((a) => a.inputConfigId);

    for (const [cmId, values] of modelMap) {
      const analyticValue = values.find((v) => v.inputConfigId === analytic.id);
      if (!analyticValue) continue;

      const qty = analyticValue.value ?? (analyticValue.inventoryId ? 1 : 0);

      const attrTitles = attrs
        .map((attrId) => {
          const val = values.find((v) => v.inputConfigId === attrId);
          return val?.inventory?.title ?? val?.value?.toString() ?? "Unknown";
        })
        .filter(Boolean)
        .join(" ");

      const title = `${attrTitles} ${analytic.title ?? "QTY"}`.trim();
      const key = `${block.uid}|${title}`;
      const prev = resultMap.get(key);
      if (!prev) {
        resultMap.set(key, {
          sumQty: qty,
          blockTitle: block.uid,
          subtitle: analytic.title ?? "Qty",
        });
      } else {
        prev.sumQty += qty;
      }
    }
  }

  // Step 6: sort + paginate
  const allResults = Array.from(resultMap.entries()).map(([key, val]) => ({
    key,
    title: key.split("|")[1],
    subtitle: val.subtitle,
    sumQty: val.sumQty,
    blockTitle: val.blockTitle,
  }));

  allResults.sort(
    (a, b) => b.sumQty - a.sumQty || a.title!.localeCompare(b.title!)
  );

  const start = cursor ? allResults.findIndex((r) => r.key === cursor) + 1 : 0;
  const paginated = allResults.slice(start, start + pageSize);
  const nextCursor = paginated.length
    ? paginated!?.[paginated.length - 1]?.key
    : null;

  return { items: paginated, nextCursor };
}
