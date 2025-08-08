import {
  INVOICE_FILTER_OPTIONS,
  PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
  PRODUCTION_FILTER_OPTIONS,
  PRODUCTION_STATUS,
  SALES_DISPATCH_FILTER_OPTIONS,
  salesType,
} from "@gnd/utils/constants";
import { z } from "zod";
import { SALES_DISPATCH_STATUS } from "./utils/constants";
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
export const resetSalesControlSchema = z.object({
  meta: z.object({
    salesId: z.number(),
    authorId: z.number(),
    authorName: z.string(),
  }),
});
export type ResetSalesControl = z.infer<typeof resetSalesControlSchema>;

export const dispatchForm = z.object({
  dispatchId: z.number(),
  receivedBy: z.string(),
  receivedDate: z.date().optional().nullable(),
  note: z.string().optional(),
  signature: z.string().optional().nullable(),
  attachments: z
    .array(
      z.object({
        pathname: z.string(),
      })
    )
    .optional()
    .nullable(),
});
export const updateSalesControlSchema = z.object({
  meta: z.object({
    salesId: z.number(),
    authorId: z.number(),
    authorName: z.string(),
  }),
  cancelDispatch: z
    .object({
      dispatchId: z.number().nullable().optional(), //if null, it clears all packing for every dispatch
    })
    .nullable()
    .optional(),
  startDispatch: z
    .object({
      dispatchId: z.number().nullable().optional(), //if null, it clears all packing for every dispatch
    })
    .nullable()
    .optional(),
  clearPackings: z
    .object({
      dispatchId: z.number().nullable().optional(), //if null, it clears all packing for every dispatch
    })
    .nullable()
    .optional(),
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
    .nullable()
    .optional(),
  packItems: z
    .object({
      dispatchId: z.number(),
      dispatchStatus: z.enum(SALES_DISPATCH_STATUS),
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
    })
    .nullable()
    .optional(),
  submitDispatch: dispatchForm.optional().nullable(),
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
    orderNo: z.string().optional().nullable(),
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

export const deletePackingSchema = z.object({
  salesId: z.number(),
  packingId: z.number().optional().nullable(),
  packingUid: z.string().optional().nullable(),
  deleteBy: z.string(),
});
export type DeletePackingSchema = z.infer<typeof deletePackingSchema>;
