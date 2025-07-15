import { z } from "zod";
import { paginationSchema } from "./common";
import { salesDispatchStatus } from "@gnd/utils/constants";

export const dispatchQueryParamsSchema = z
  .object({
    status: z.enum(salesDispatchStatus).optional().nullable(),
  })
  .merge(paginationSchema);
export type DispatchQueryParamsSchema = z.infer<
  typeof dispatchQueryParamsSchema
>;
