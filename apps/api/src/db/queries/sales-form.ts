import type { TRPCContext } from "@api/trpc/init";
import { txContext } from "@api/utils/db";
import { generateRandomString } from "@gnd/utils";
import type { DykeStepMeta } from "@sales/types";
import { z } from "zod";

/*
getSuppliers: publicProcedure
      .input(getSuppliersSchema)
      .query(async (props) => {
        return getSuppliers(props.ctx, props.input);
      }),
*/
export const getSuppliersSchema = z.object({});
export type GetSuppliersSchema = z.infer<typeof getSuppliersSchema>;
export async function getSuppliers(
  ctx: TRPCContext,
  query: GetSuppliersSchema
) {
  const { db } = ctx;
  const step = await db.dykeSteps.findFirst({
    where: {
      title: "Suppliers",
    },
    select: {
      id: true,
      uid: true,
      stepProducts: {
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

/*
saveSupplier: publicProcedure
      .input(saveSupplierSchema)
      .mutation(async (props) => {
        return saveSupplier(props.ctx, props.input);
      }),
*/
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
    if (data.id)
      await tx.dykeStepProducts.update({
        where: {
          id: data.id,
        },
        data: {
          // uid: generateRandomString(5),
          name: data.name,
        },
      });
    else
      await tx.dykeStepProducts.create({
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
  });
}
