import { z } from "zod";

import { salesProductionQueryParamsSchema } from "../schema";

export const productionV2ScopeSchema = z.enum(["worker", "admin"]);

export const productionV2ListQuerySchema =
	salesProductionQueryParamsSchema.extend({
		scope: productionV2ScopeSchema,
	});
export type ProductionV2ListQuery = z.infer<typeof productionV2ListQuerySchema>;

export const productionV2DetailQuerySchema = z.object({
	salesNo: z.string(),
	scope: productionV2ScopeSchema,
	workerId: z.number().optional().nullable(),
});
export type ProductionV2DetailQuery = z.infer<
	typeof productionV2DetailQuerySchema
>;
