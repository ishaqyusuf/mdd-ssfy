import type { TRPCContext } from "@api/trpc/init";
import { txContext } from "@api/utils/db";
import { generateRandomString } from "@gnd/utils";
import type { DykeStepMeta } from "@sales/types";
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
