import { SALES_PERFORMANCE_REPORT_TYPES } from "@gnd/sales/performance-reports";
import { z } from "zod";

const dateOnlySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.optional();

export const salesDashboardFilterSchema = z.object({
	from: dateOnlySchema,
	to: dateOnlySchema,
	salesRepIds: z
		.array(z.number().int().positive())
		.max(100)
		.nullable()
		.optional(),
	salesChannels: z
		.array(z.string().trim().min(1).max(64))
		.max(20)
		.nullable()
		.optional(),
});

export type SalesDashboardFilterInput = z.infer<
	typeof salesDashboardFilterSchema
>;

export const salesPerformanceReportSchema = salesDashboardFilterSchema.extend({
	reportType: z.enum(SALES_PERFORMANCE_REPORT_TYPES),
});

export type SalesPerformanceReportInput = z.infer<
	typeof salesPerformanceReportSchema
>;
