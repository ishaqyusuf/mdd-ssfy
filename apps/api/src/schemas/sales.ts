import { z } from "@hono/zod-openapi";
import { inboundFilterStatus, salesType } from "@gnd/utils/constants";
export const paginationSchema = z.object({
  size: z.number().nullable().optional(),
  sort: z.string().nullable().optional(),
  start: z.number().nullable().optional(),
  search: z.string().nullable().optional(),
});
export const salesQueryParamsSchema = z
  .object({
    salesNo: z.string().optional().nullable(),
    salesIds: z.array(z.number()).optional().nullable(),
    salesType: z.enum(salesType).optional().nullable(),
  })
  .merge(paginationSchema);
export type SalesQueryParamsSchema = z.infer<typeof salesQueryParamsSchema>;

export const inboundQuerySchema = z.object({
  status: z.enum(inboundFilterStatus).optional().nullable(),
});
export type InboundQuerySchema = z.infer<typeof inboundQuerySchema>;
