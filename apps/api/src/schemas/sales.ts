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
    driversId: z.array(z.number()).optional().nullable(),
    status: z.enum(salesDispatchStatus).optional().nullable(),
    scheduleDate: z
      .array(z.string().optional().nullable())
      .optional()
      .nullable(),
  })
  .merge(paginationSchema);
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
  .merge(paginationSchema);
export type SalesQueryParamsSchema = z.infer<typeof salesQueryParamsSchema>;

export const inboundQuerySchema = z
  .object({
    status: z.enum(inboundFilterStatus).optional().nullable(),
  })
  .merge(paginationSchema);
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
  .merge(getFullSalesDataSchema);
export type SalesDispatchOverviewSchema = z.infer<
  typeof salesDispatchOverviewSchema
>;

export const enlistDispatchItemSchema = z.object({
  dispatchId: z.number(),
  submissions: z.array(z.object({})),
});
