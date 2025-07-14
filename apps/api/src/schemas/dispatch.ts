import { z } from "zod";
import { paginationSchema } from "./common";

export const dispatchQueryParamsSchema = z
  .object({
    salesNo: z.string().optional().nullable(),
    salesNos: z.array(z.string()).optional().nullable(),
    salesIds: z.array(z.number()).optional().nullable(),
    // salesType: z.enum(salesType).optional().nullable(),
  })
  .merge(paginationSchema);
export type DispatchQueryParamsSchema = z.infer<
  typeof dispatchQueryParamsSchema
>;
