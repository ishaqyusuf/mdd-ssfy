import {
  INVOICE_FILTER_OPTIONS,
  PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
  PRODUCTION_FILTER_OPTIONS,
  PRODUCTION_STATUS,
  SALES_DISPATCH_FILTER_OPTIONS,
  salesType,
} from "@gnd/utils/constants";
import { z } from "zod";
export const getFullSalesDataSchema = z.object({
  salesId: z.number().optional().nullable(),
  salesNo: z.string().optional().nullable(),
  assignedToId: z.number().optional().nullable(),
});
export type GetFullSalesDataSchema = z.infer<typeof getFullSalesDataSchema>;
const qty = z.object({
  lh: z.number().nullable().optional(),
  rh: z.number().nullable().optional(),
  qty: z.number().nullable().optional(),
});
export const updateSalesControlSchema = z.object({
  meta: z.object({
    salesId: z.number(),
    authorId: z.number(),
    authorName: z.string(),
  }),
  submitAll: z
    .object({
      assignedToId: z.number().nullable().optional(),
      itemUids: z.array(z.string()).optional().nullable(),
      selections: z
        .array(
          z.object({
            assignmentId: z.number(),
            qty: qty.optional().nullable(),
          })
        )
        .optional()
        .nullable(),
    })
    .nullable(),
  packItems: z.object({
    dispatchId: z.number(),
    dispatchStatus: z.string(),
    packingList: z
      .array(
        z.object({
          salesItemId: z.number(),
          // itemControlUid: z.string(),
          submissions: z.array(
            z.object({
              submissionId: z.number(),
              qty: qty,
            })
          ),
          note: z.string().optional(),
        })
      )
      .nullable(),
  }),
});
export type UpdateSalesControl = z.infer<typeof updateSalesControlSchema>;

export const paginationSchema = z.object({
  size: z.number().nullable().optional(),
  sort: z.string().nullable().optional(),
  // start: z.number().nullable().optional(),
  cursor: z.string().nullable().optional(),
  q: z.string().nullable().optional(),
});

export const salesQueryParamsSchema = z
  .object({
    salesNo: z.string().optional().nullable(),
    salesNos: z.array(z.string()).optional().nullable(),
    salesIds: z.array(z.number()).optional().nullable(),
    salesType: z.enum(salesType).optional().nullable(),
    "customer.name": z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    po: z.string().optional().nullable(),
    "sales.rep": z.string().optional().nullable(),
    "order.no": z.string().optional().nullable(),
    "dispatch.status": z
      .enum(SALES_DISPATCH_FILTER_OPTIONS)
      .optional()
      .nullable(),
    "production.dueDate": z.array(z.any()).optional().nullable(),
    "production.status": z.enum(PRODUCTION_STATUS).optional().nullable(),
    "production.assignment": z
      .enum(PRODUCTION_ASSIGNMENT_FILTER_OPTIONS)
      .optional()
      .nullable(),
    invoice: z.enum(INVOICE_FILTER_OPTIONS).optional().nullable(),
    production: z.enum(PRODUCTION_FILTER_OPTIONS).optional().nullable(),
  })
  .merge(paginationSchema);
export type SalesQueryParamsSchema = z.infer<typeof salesQueryParamsSchema>;
