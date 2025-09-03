import type { TRPCContext } from "@api/trpc/init";
import { slugify, slugModel } from "@gnd/utils";
import { z } from "zod";

export const workOrderFormSchema = z.object({
  id: z.number().optional().nullable(),
  techId: z.number().optional().nullable(),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  lot: z.string(),
  block: z.string(),
  projectName: z.string().optional().nullable(),
  builderName: z.string().optional().nullable(),
  requestDate: z.date().optional().nullable(),
  supervisor: z.string().optional().nullable(),
  scheduleDate: z.date().optional().nullable(),
  scheduleTime: z.string().optional().nullable(),
  homeAddress: z.string().optional().nullable(),
  homeOwner: z.string().optional().nullable(),
  homePhone: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  assignedAt: z.string().optional().nullable(),
  meta: z.object({
    lotBlock: z.string(),
  }),
});
export type WorkOrderForm = z.infer<typeof workOrderFormSchema>;

export async function getWorkOrderForm(ctx: TRPCContext, id) {
  const wo = await ctx.db.workOrders.findUniqueOrThrow({
    where: {
      id,
    },
  });
  return wo;
}

export async function saveWorkOrderForm(ctx: TRPCContext, data: WorkOrderForm) {
  if (!data.slug)
    data.slug = await slugModel(
      [data.projectName, data.lot, data.block],
      ctx.db.workOrders
    );
  const { id, techId, ...updateData } = data;
  if (id)
    await ctx.db.workOrders.update({
      where: {
        id,
      },
      data: {
        ...(updateData as any),
      },
    });
  else
    await ctx.db.workOrders.create({
      data: { ...(updateData as any) },
    });
}
