import type { TRPCContext } from "@api/trpc/init";
import { txContext } from "@api/utils/db";
import { generateRandomString, sum, type RenturnTypeAsync } from "@gnd/utils";
import { composeQuery } from "@gnd/utils/query-response";
import type { DykeStepMeta, Prisma, StepComponentMeta } from "@sales/types";
import { addDays } from "date-fns";
import { z } from "zod";

export const getSuppliersSchema = z.object({});
export type GetSuppliersSchema = z.infer<typeof getSuppliersSchema>;
export async function getSuppliers(
  ctx: TRPCContext,
  query: GetSuppliersSchema
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
export const saveSupplierSchema = z.object({
  name: z.string(),
  id: z.number().optional().nullable(),
});
export type SaveSupplierSchema = z.infer<typeof saveSupplierSchema>;
export async function saveSupplier(ctx: TRPCContext, data: SaveSupplierSchema) {
  const { db } = ctx;
  return db.$transaction(async (tx) => {
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
      return {
        uid: dp.uid,
        name: dp.name,
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
    return {
      uid: dp.uid,
      name: dp.name,
    };
  });
}

export const deleteSupplierSchema = z.object({
  id: z.number(),
});
export type DeleteSupplierSchema = z.infer<typeof deleteSupplierSchema>;

export async function deleteSupplier(
  ctx: TRPCContext,
  data: DeleteSupplierSchema
) {
  const { db } = ctx;
  await db.dykeStepProducts.update({
    where: { id: data.id },
    data: {
      deletedAt: new Date(),
    },
  });
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
  query: GetStepComponentsSchema
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
  const result = stepProducts.map(dtoStepComponent);
  const filtered = result.filter(
    (r, i) => result.findIndex((s) => s.title == r.title) == i
  );
  return result.sort((a, b) => {
    if (b.statistics !== a.statistics) {
      return b.statistics - a.statistics; // higher statistics first
    }
    return a.title!.localeCompare(b.title!); // then by title
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
      sorts: true;
      _count: {
        select: {
          housePackageTools: true;
          salesDoors: true;
          stepForms: true;
        };
      };
    };
  }>
) {
  let {
    door,
    product,
    sortIndex,
    sorts,
    _count: { housePackageTools, salesDoors, stepForms },
    ...component
  } = data;
  let meta: StepComponentMeta = component.meta as any;
  return {
    uid: component.uid,
    sortIndex,
    id: component.id,
    title: component.name || door?.title || product?.title,
    img: component.img || product?.img || door?.img,
    productId: product?.id || door?.id,
    variations: meta?.variations || [],
    sectionOverride: meta?.sectionOverride,
    salesPrice: null,
    basePrice: null,
    stepId: component.dykeStepId,
    productCode: component.productCode,
    redirectUid: component.redirectUid,
    _metaData: {
      sorts: (sorts || [])?.map(({ sortIndex, stepComponentId, uid }) => ({
        sortIndex,
        stepComponentId,
        uid,
      })),
      custom: component.custom,
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
