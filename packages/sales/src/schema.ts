import { z } from "zod";
export const getFullSalesDataSchema = z.object({
  salesId: z.number().optional().nullable(),
  salesNo: z.string().optional().nullable(),
  assignedToId: z.number().optional().nullable(),
});
export type GetFullSalesDataSchema = z.infer<typeof getFullSalesDataSchema>;
export const updateSalesControlSchema = z.object({
  meta: z.object({
    salesId: z.number(),
    authorId: z.number(),
  }),
  submitAll: z
    .object({
      itemUid: z.string().optional().nullable(),
      orderId: z.number(),
    })
    .nullable(),
  packItem: z
    .object({
      salesItemId: z.number(),
      dispatchId: z.number(),
      // itemUid: z.string(),
      // itemControlUid: z.string(),
      // note: z.string().optional(),
      qty: z.object({
        lh: z.number().nullable(),
        rh: z.number().nullable(),
        qty: z.number().nullable(),
      }),
    })
    .nullable(),
});
export type UpdateSalesControl = z.infer<typeof updateSalesControlSchema>;
