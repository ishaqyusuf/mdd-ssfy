import { z } from "zod";

const dateOnlySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.optional();

export const salesRepDashboardPeriodSchema = z.object({
	from: dateOnlySchema,
	to: dateOnlySchema,
});

export type SalesRepDashboardPeriodInput = z.infer<
	typeof salesRepDashboardPeriodSchema
>;
