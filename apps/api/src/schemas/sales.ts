import { paginationSchema } from "@gnd/utils/schema";
import { salesDispatchStatus } from "@gnd/utils/constants";
import { z } from "@hono/zod-openapi";
import {
  inboundFilterStatus,
  INVOICE_FILTER_OPTIONS,
  PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
  PRODUCTION_FILTER_OPTIONS,
  PRODUCTION_STATUS,
  SALES_DISPATCH_FILTER_OPTIONS,
  salesType,
} from "@gnd/utils/constants";
export const dispatchQueryParamsSchema = z
  .object({
    tab: z.enum(["all", "pending", "completed"]).optional().nullable(),
    driversId: z.array(z.number()).optional().nullable(),
    status: z.enum(salesDispatchStatus).optional().nullable(),
    scheduleDate: z
      .array(z.string().optional().nullable())
      .optional()
      .nullable(),
  })
  .extend(paginationSchema.shape);
export type DispatchQueryParamsSchema = z.infer<
  typeof dispatchQueryParamsSchema
>;

export const updateSalesDeliveryOptionSchema = z.object({
  deliveryId: z.number().nullable().optional(),
  salesId: z.number(),
  driverId: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  option: z.string().nullable().optional(),
  defaultOption: z.string().nullable().optional(),
  date: z.date().nullable().optional(),
});
export type UpdateSalesDeliveryOptionSchema = z.infer<
  typeof updateSalesDeliveryOptionSchema
>;

export const dispatchStatusSchema = z.enum([
  "queue",
  "packed",
  "in progress",
  "completed",
  "cancelled",
]);
export type DispatchStatusSchema = z.infer<typeof dispatchStatusSchema>;

export const updateDispatchDriverSchema = z.object({
  dispatchId: z.number(),
  oldDriverId: z.number().nullable().optional(),
  newDriverId: z.number().nullable().optional(),
});
export type UpdateDispatchDriverSchema = z.infer<
  typeof updateDispatchDriverSchema
>;

export const updateDispatchDueDateSchema = z.object({
  dispatchId: z.number(),
  oldDueDate: z.date().nullable().optional(),
  newDueDate: z.date(),
});
export type UpdateDispatchDueDateSchema = z.infer<
  typeof updateDispatchDueDateSchema
>;

export const completionModeSchema = z.enum(["packed_only", "complete_all"]);
export type CompletionModeSchema = z.infer<typeof completionModeSchema>;

export const updateDispatchStatusSchema = z.object({
  dispatchId: z.number(),
  oldStatus: dispatchStatusSchema,
  newStatus: dispatchStatusSchema,
  completionMode: completionModeSchema.optional(),
});
export type UpdateDispatchStatusSchema = z.infer<
  typeof updateDispatchStatusSchema
>;

export const resolveDuplicateDispatchGroupSchema = z.object({
  salesId: z.number(),
  keepDispatchId: z.number(),
  deleteDispatchIds: z.array(z.number()).min(1),
});
export type ResolveDuplicateDispatchGroupSchema = z.infer<
  typeof resolveDuplicateDispatchGroupSchema
>;

export const salesQueryParamsSchema = z
  .object({
    salesNo: z.string().optional().nullable(),
    salesNos: z.array(z.string()).optional().nullable(),
    dateRange: z.array(z.string()).optional().nullable(),
    salesIds: z.array(z.number()).optional().nullable(),
    salesType: z.enum(salesType).optional().nullable(),
    "customer.name": z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    defaultSearch: z.boolean().optional().nullable(),
    po: z.string().optional().nullable(),
    salesRepId: z.number().optional().nullable(),
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
    showing: z.enum(["all sales"]).optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type SalesQueryParamsSchema = z.infer<typeof salesQueryParamsSchema>;

export const inboundQuerySchema = z
  .object({
    status: z.enum(inboundFilterStatus).optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type InboundQuerySchema = z.infer<typeof inboundQuerySchema>;

export const startNewSalesSchema = z.object({
  customerId: z.number().optional().nullable(),
});

export type StartNewSalesSchema = z.infer<typeof startNewSalesSchema>;
export const salesDashboardFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const getFullSalesDataSchema = z.object({
  salesId: z.number().optional().nullable(),
  salesNo: z.string().optional().nullable(),
  assignedToId: z.number().optional().nullable(),
});
export type GetFullSalesDataSchema = z.infer<typeof getFullSalesDataSchema>;
export const salesDispatchOverviewSchema = z
  .object({
    driverId: z.number().nullable().optional(),
    dispatchId: z.number().nullable().optional(),
  })
  .extend(getFullSalesDataSchema.shape);
export type SalesDispatchOverviewSchema = z.infer<
  typeof salesDispatchOverviewSchema
>;

export const enlistDispatchItemSchema = z.object({
  dispatchId: z.number(),
  submissions: z.array(z.object({})),
});
