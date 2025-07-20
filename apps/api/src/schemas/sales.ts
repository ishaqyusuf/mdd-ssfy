import { z } from "@hono/zod-openapi";
import { inboundFilterStatus, salesType } from "@gnd/utils/constants";
import { paginationSchema } from "./common";

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
