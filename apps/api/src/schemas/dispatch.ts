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
