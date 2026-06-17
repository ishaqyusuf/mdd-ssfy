import type { TRPCContext } from "@api/trpc/init";
import { txContext } from "@api/utils/db";
import { salesWorkflowCache } from "@gnd/cache/sales-workflow-cache";
import { queueDykeStepToInventorySync } from "@gnd/inventory";
import { generateRandomString, sum, type RenturnTypeAsync } from "@gnd/utils";
import { composeQuery } from "@gnd/utils/query-response";
import type { DykeStepMeta, Prisma, StepComponentMeta } from "@sales/types";
import { addDays } from "date-fns";
import { z } from "zod";
import {
  saveSupplierSchema,
  type SaveSupplierSchema,
} from "@api/schemas/sales-form";

export const getSuppliersSchema = z.object({});
export type GetSuppliersSchema = z.infer<typeof getSuppliersSchema>;
export async function getSuppliers(
  ctx: TRPCContext,
  query: GetSuppliersSchema,
) {
  const { db } = ctx;
  const step = await db.dykeSteps.findFirst({
    where: {
      title: "Supplier",
    },
    select: {
      id: true,
      uid: true,
      stepProducts: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          uid: true,
        },
      },
    },
  });
  return step;
}
export async function saveSupplier(ctx: TRPCContext, data: SaveSupplierSchema) {
  const { db } = ctx;
  const result = await db.$transaction(async (tx) => {
    const supplierData = await getSuppliers(txContext(ctx, tx), {});
    let stepId = supplierData?.id;
    if (!stepId)
      stepId = (
        await tx.dykeSteps.create({
          data: {
            title: "Supplier",
            uid: generateRandomString(5),
            meta: {} as DykeStepMeta,
          },
        })
      ).id;
    if (data.id) {
      const dp = await tx.dykeStepProducts.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
        },
      });
      await tx.$executeRaw`UPDATE DykeStepForm
          SET meta = JSON_SET(meta, '$.supplierName', ${dp.name})
          WHERE JSON_EXTRACT(meta, '$.supplierUid') = ${dp.uid};`;
      await invalidateSalesWorkflowForStepComponent({
        stepId: dp.dykeStepId,
        componentId: dp.id,
        componentUid: dp.uid,
        routing: true,
      });
      return {
        uid: dp.uid,
        name: dp.name,
        stepId: dp.dykeStepId,
      };
    }
    const dp = await tx.dykeStepProducts.create({
      data: {
        name: data.name,
        uid: generateRandomString(5),
        meta: {},
        step: {
          connect: {
            id: stepId,
          },
        },
      },
    });
    await invalidateSalesWorkflowForStepComponent({
      stepId,
      componentId: dp.id,
      componentUid: dp.uid,
      routing: true,
    });
    return {
      uid: dp.uid,
      name: dp.name,
      stepId,
    };
  });
  await queueDykeStepToInventorySync({
    stepId: result.stepId,
    source: "event",
  });
  return result;
}

export const deleteSupplierSchema = z.object({
  id: z.number(),
});
export type DeleteSupplierSchema = z.infer<typeof deleteSupplierSchema>;

export async function deleteSupplier(
  ctx: TRPCContext,
  data: DeleteSupplierSchema,
) {
  const { db } = ctx;
  const dp = await db.dykeStepProducts.update({
    where: { id: data.id },
    data: {
      deletedAt: new Date(),
    },
  });
  await invalidateSalesWorkflowForStepComponent({
    stepId: dp.dykeStepId,
    componentId: dp.id,
    componentUid: dp.uid,
    routing: true,
  });
  await queueDykeStepToInventorySync({
    stepId: dp.dykeStepId,
    source: "event",
  });
}

export const updateStepMetaSchema = z.object({
  stepId: z.number(),
  meta: z.record(z.string(), z.any()),
});
export type UpdateStepMetaSchema = z.infer<typeof updateStepMetaSchema>;

export async function updateStepMeta(
  ctx: TRPCContext,
  data: UpdateStepMetaSchema,
) {
  const step = await ctx.db.dykeSteps.update({
    where: {
      id: data.stepId,
    },
    data: {
      meta: data.meta as any,
    },
    select: {
      id: true,
      uid: true,
      title: true,
      meta: true,
    },
  });
  await Promise.all([
    salesWorkflowCache.invalidateStepComponentsForStep(data.stepId),
    salesWorkflowCache.invalidateStepRouting(),
  ]);
  return step;
}

export async function invalidateSalesWorkflowForStep(stepId?: number | null) {
  await Promise.all([
    salesWorkflowCache.invalidateStepComponentsForStep(stepId),
    salesWorkflowCache.invalidateStepRouting(),
  ]);
}

export async function invalidateSalesWorkflowForStepComponent(input: {
  stepId?: number | null;
  componentId?: number | null;
  componentUid?: string | null;
  stepTitle?: string | null;
  routing?: boolean;
}) {
  await Promise.all([
    salesWorkflowCache.invalidateStepComponentsForStep(input.stepId),
    salesWorkflowCache.invalidateStepComponentsForComponentId(
      input.componentId,
    ),
    salesWorkflowCache.invalidateStepComponentsForComponentUid(
      input.componentUid,
    ),
    salesWorkflowCache.invalidateStepComponentsForFamily(input.stepTitle),
    input.routing
      ? salesWorkflowCache.invalidateStepRouting()
      : Promise.resolve(),
  ]);
}

export const getStepComponentsSchema = z.object({
  stepTitle: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  stepId: z.number().optional(),
  id: z.number().optional().nullable(),
  ids: z.array(z.number()).optional().nullable(),
  isCustom: z.boolean().optional().nullable(),
});
export type GetStepComponentsSchema = z.infer<typeof getStepComponentsSchema>;

export async function getStepComponents(
  ctx: TRPCContext,
  query: GetStepComponentsSchema,
) {
  const cached =
    await salesWorkflowCache.getStepComponents<StepComponentData[]>(query);
  if (cached) return cached;

  const result = await fetchStepComponentsFromDb(ctx, query);
  await salesWorkflowCache.setStepComponents(query, result);
  return result;
}

async function fetchStepComponentsFromDb(
  ctx: TRPCContext,
  query: GetStepComponentsSchema,
) {
  const whereCount = {
    where: {
      deletedAt: null,
      createdAt: {
        gte: addDays(new Date(), -30).toISOString(),
      },
    },
  };
  const where = whereStepComponents(query);
  const { db } = ctx;
  const stepProducts = await db.dykeStepProducts.findMany({
    where,
    include: {
      door: query.stepTitle != null,
      product: true,
      step: {
        select: {
          id: true,
          uid: true,
          title: true,
          meta: true,
        },
      },
      sorts: true,
      _count: {
        select: {
          housePackageTools: whereCount,
          salesDoors: whereCount,
          stepForms: whereCount,
        },
      },
    },
  });
  const pricingRows = await db.dykePricingSystem.findMany({
    where: {
      deletedAt: null,
      stepProductUid: {
        in: stepProducts
          .map((sp) => sp.uid)
          .filter((uid): uid is string => Boolean(uid)),
      },
    },
    select: {
      id: true,
      stepProductUid: true,
      dependenciesUid: true,
      price: true,
    },
  });
  const pricingByComponentUid: Record<
    string,
    Record<string, { id: number; price: number | null }>
  > = {};
  pricingRows.forEach((row) => {
    if (!row.stepProductUid) return;
    const root = row.stepProductUid;
    const depKey = row.dependenciesUid || root;
    if (!pricingByComponentUid[root]) pricingByComponentUid[root] = {};
    pricingByComponentUid[root][depKey] = {
      id: row.id,
      price: row.price,
    };
  });
  const result = stepProducts.map((stepProduct) =>
    dtoStepComponent(stepProduct, pricingByComponentUid),
  );
  const filtered = result.filter(
    (r, i) => result.findIndex((s) => s.title == r.title) == i,
  );
  return result.sort((a, b) => {
    const aStatistics = Number(a.statistics || 0);
    const bStatistics = Number(b.statistics || 0);
    if (bStatistics !== aStatistics) {
      return bStatistics - aStatistics; // higher statistics first
    }
    return String(a.title || "").localeCompare(String(b.title || "")); // then by title
  });
  // return stepProducts.map((s) => ({
  //   ...s,
  //   meta: s.meta as any as StepComponentMeta,
  // }));
}
function whereStepComponents(query: GetStepComponentsSchema) {
  const wheres: Prisma.DykeStepProductsWhereInput[] = [];

  if (query.stepTitle == "Door")
    wheres.push({
      OR: [
        { door: { isNot: null }, deletedAt: {} },
        { dykeStepId: query.stepId },
      ],
    });
  else if (query.stepTitle == "Moulding") {
    wheres.push({
      OR: [
        {
          product: {
            category: {
              title: query.stepTitle,
            },
          },
        },
        { dykeStepId: query.stepId },
      ],
    });
  } else {
    if (query.stepId)
      wheres.push({
        dykeStepId: query.stepId,
      });
  }
  if (query.isCustom) wheres.push({ custom: true });
  if (query.title)
    wheres.push({
      name: query.title,
    });
  if (query.id) wheres.push({ id: query.id });
  if (query.ids)
    wheres.push({
      id: {
        in: query.ids,
      },
    });
  return composeQuery(wheres);
}
export type StepComponentData = RenturnTypeAsync<typeof dtoStepComponent>;
export function dtoStepComponent(
  data: Prisma.DykeStepProductsGetPayload<{
    include: {
      door: true;
      product: true;
      step: {
        select: {
          id: true;
          uid: true;
          title: true;
          meta: true;
        };
      };
      sorts: true;
      _count: {
        select: {
          housePackageTools: true;
          salesDoors: true;
          stepForms: true;
        };
      };
    };
  }>,
  pricingByComponentUid: Record<
    string,
    Record<string, { id: number; price: number | null }>
  > = {},
) {
  let {
    door,
    product,
    step,
    sortIndex,
    sorts,
    _count: { housePackageTools, salesDoors, stepForms },
    ...component
  } = data;
  let meta: StepComponentMeta = component.meta as any;
  const componentUid = component.uid || "";
  const stepMeta = (step?.meta || {}) as Record<string, any>;
  const priceStepDeps = Array.isArray(stepMeta?.priceStepDeps)
    ? stepMeta.priceStepDeps
        .map((uid: unknown) => String(uid || ""))
        .filter(Boolean)
    : [];
  const pricing = pricingByComponentUid[componentUid] || {};
  const defaultPrice = Number(pricing?.[componentUid]?.price);
  return {
    uid: componentUid,
    sortIndex,
    id: component.id,
    title: component.name || door?.title || product?.title,
    img: component.img || product?.img || door?.img,
    productId: product?.id || door?.id,
    variations: meta?.variations || [],
    sectionOverride: meta?.sectionOverride,
    salesPrice: Number.isFinite(defaultPrice) ? defaultPrice : null,
    basePrice: Number.isFinite(defaultPrice) ? defaultPrice : null,
    stepId: component.dykeStepId,
    stepUid: step?.uid || null,
    priceStepDeps,
    pricing,
    productCode: component.productCode,
    redirectUid: component.redirectUid,
      _metaData: {
      sorts: (sorts || [])?.map(({ sortIndex, stepComponentId, uid }) => ({
        sortIndex,
        stepComponentId,
        uid,
      })),
      custom: component.custom,
      deletedAt:
        meta && typeof meta.deletedAt === "string" ? meta.deletedAt : null,
      visible: false,
      priceId: null,
      sortId: null,
      sortIndex: null,
      sortUid: null,
    },
    isDeleted: !!component.deletedAt,
    statistics: sum([housePackageTools, salesDoors, stepForms]),
  };
}

/*
getMultiLineComponents: publicProcedure
      .input(getMultiLineComponentsSchema)
      .query(async (props) => {
        return getMultiLineComponents(props.ctx, props.input);
      }),
*/
export const getMultiLineComponentsSchema = z.object({
  uids: z.array(z.string()),
});
export type GetMultiLineComponentsSchema = z.infer<
  typeof getMultiLineComponentsSchema
>;

export async function getMultiLineComponents(
  ctx: TRPCContext,
  query: GetMultiLineComponentsSchema,
) {
  const { db } = ctx;
  const components = await db.dykeStepProducts.findMany({
    where: {
      uid: {
        in: query.uids,
      },
    },
    select: {
      uid: true,
      id: true,
      name: true,
      img: true,
    },
  });
  return components.map((a) => ({
    ...a,
    title: a.name,
  }));
}
