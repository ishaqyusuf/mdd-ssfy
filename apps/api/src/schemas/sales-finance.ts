import {
	SALES_FINANCE_AGING_BUCKETS,
	SALES_FINANCE_APPLICATION_STATUSES,
	SALES_FINANCE_EXCEPTION_CODES,
	SALES_FINANCE_PAYMENT_METHODS,
	SALES_FINANCE_RECEIVABLE_REPORT_TYPES,
	SALES_FINANCE_RECONCILIATION_RESOLUTIONS,
	SALES_FINANCE_REPORT_TYPES,
} from "@gnd/sales/payment-system";
import { resolvePaymentSchema } from "@sales/schema";
import { z } from "zod";

const dateOnlySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.nullable()
	.optional();

export const salesFinanceSortFields = [
	"receivedAt",
	"customerName",
	"receivedAmount",
	"netAmount",
	"unappliedAmount",
	"paymentMethod",
	"status",
] as const;

export const salesFinanceReceivableSortFields = [
	"dueAt",
	"createdAt",
	"customerName",
	"orderNo",
	"grandTotal",
	"amountDue",
	"daysOverdue",
] as const;

const salesFinanceSharedFilterShape = {
	q: z.string().trim().max(120).nullable().optional(),
	from: dateOnlySchema,
	to: dateOnlySchema,
	paymentMethods: z
		.array(z.enum(SALES_FINANCE_PAYMENT_METHODS))
		.max(SALES_FINANCE_PAYMENT_METHODS.length)
		.nullable()
		.optional(),
	statuses: z
		.array(z.string().trim().min(1).max(40))
		.max(20)
		.nullable()
		.optional(),
	exceptionCodes: z
		.array(z.enum(SALES_FINANCE_EXCEPTION_CODES))
		.max(SALES_FINANCE_EXCEPTION_CODES.length)
		.nullable()
		.optional(),
	applicationStatuses: z
		.array(z.enum(SALES_FINANCE_APPLICATION_STATUSES))
		.max(SALES_FINANCE_APPLICATION_STATUSES.length)
		.nullable()
		.optional(),
	salesRepIds: z
		.array(z.number().int().positive())
		.max(100)
		.nullable()
		.optional(),
	customerIds: z
		.array(z.number().int().positive())
		.max(100)
		.nullable()
		.optional(),
};

export const salesFinanceFiltersSchema = z.object({
	...salesFinanceSharedFilterShape,
	tab: z.enum(["all", "review"]).default("all"),
});

export const salesFinanceTransactionsSchema = salesFinanceFiltersSchema.extend({
	cursor: z.number().int().nonnegative().nullable().optional(),
	size: z.number().int().min(20).max(100).default(50),
	sort: z
		.tuple([z.enum(salesFinanceSortFields), z.enum(["asc", "desc"])])
		.nullable()
		.optional(),
});

export const salesFinanceSummarySchema = z.object(
	salesFinanceSharedFilterShape,
);

export const salesFinanceAnalyticsSchema = salesFinanceFiltersSchema;

export const salesFinanceReportSchema = salesFinanceFiltersSchema.extend({
	reportType: z.enum(SALES_FINANCE_REPORT_TYPES),
});

export const salesFinanceTransactionDetailSchema = z.object({
	id: z.number().int().positive(),
});

export const salesFinanceReconciliationStartSchema = z.object({
	id: z.number().int().positive(),
	note: z.string().trim().max(1_000).nullable().optional(),
});

export const salesFinanceReconciliationResolveSchema = z.object({
	id: z.number().int().positive(),
	resolution: z.enum(SALES_FINANCE_RECONCILIATION_RESOLUTIONS),
	note: z.string().trim().min(10).max(2_000),
});

export const salesFinanceResolutionsSchema = z.object({
	q: z.string().trim().max(120).nullable().optional(),
	salesNo: z.string().trim().max(120).nullable().optional(),
	"customer.name": z.string().trim().max(120).nullable().optional(),
	status: z.string().trim().max(40).nullable().optional(),
	cursor: z.string().nullable().optional(),
	size: z.number().int().min(1).max(100).nullable().optional(),
	sort: z.string().trim().max(80).nullable().optional(),
});

export const salesFinanceResolutionSyncSchema = z.object({
	salesId: z.number().int().positive(),
	note: z.string().trim().min(10).max(1_000),
});

export const salesFinancePaymentResolutionSchema = resolvePaymentSchema
	.extend({
		reason: z.string().trim().min(3).max(120),
		note: z.string().trim().min(10).max(1_000),
	})
	.superRefine((input, ctx) => {
		if (
			input.action === "refund" &&
			(!input.refundAmount || input.refundAmount <= 0)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Refund amount must be greater than zero.",
				path: ["refundAmount"],
			});
		}
	});

export const salesFinanceAdoptionSurfaceSchema = z.enum([
	"payments",
	"review",
	"receivables",
	"resolution",
	"legacy-accounting",
]);

export const salesFinanceAdoptionPingSchema = z.object({
	surface: salesFinanceAdoptionSurfaceSchema,
});

const salesFinanceReceivableFilterShape = {
	q: z.string().trim().max(120).nullable().optional(),
	from: dateOnlySchema,
	to: dateOnlySchema,
	agingBuckets: z
		.array(z.enum(SALES_FINANCE_AGING_BUCKETS))
		.max(SALES_FINANCE_AGING_BUCKETS.length)
		.nullable()
		.optional(),
};

export const salesFinanceReceivablesSchema = z
	.object(salesFinanceReceivableFilterShape)
	.extend({
		cursor: z.number().int().nonnegative().nullable().optional(),
		size: z.number().int().min(20).max(100).default(50),
		sort: z
			.tuple([
				z.enum(salesFinanceReceivableSortFields),
				z.enum(["asc", "desc"]),
			])
			.nullable()
			.optional(),
	});

export const salesFinanceReceivablesSummarySchema = z.object(
	salesFinanceReceivableFilterShape,
);

export const salesFinanceReceivablesReportSchema = z
	.object(salesFinanceReceivableFilterShape)
	.extend({
		reportType: z.enum(SALES_FINANCE_RECEIVABLE_REPORT_TYPES),
	});

export const salesFinanceReceivableDetailSchema = z.object({
	id: z.number().int().positive(),
});

export type SalesFinanceFiltersInput = z.infer<
	typeof salesFinanceFiltersSchema
>;
export type SalesFinanceTransactionsInput = z.infer<
	typeof salesFinanceTransactionsSchema
>;
export type SalesFinanceSummaryInput = z.infer<
	typeof salesFinanceSummarySchema
>;
export type SalesFinanceAnalyticsInput = z.infer<
	typeof salesFinanceAnalyticsSchema
>;
export type SalesFinanceReportInput = z.infer<typeof salesFinanceReportSchema>;
export type SalesFinanceReceivablesInput = z.infer<
	typeof salesFinanceReceivablesSchema
>;
export type SalesFinanceReceivablesSummaryInput = z.infer<
	typeof salesFinanceReceivablesSummarySchema
>;
export type SalesFinanceReceivablesReportInput = z.infer<
	typeof salesFinanceReceivablesReportSchema
>;
export type SalesFinanceReconciliationStartInput = z.infer<
	typeof salesFinanceReconciliationStartSchema
>;
export type SalesFinanceReconciliationResolveInput = z.infer<
	typeof salesFinanceReconciliationResolveSchema
>;
export type SalesFinanceResolutionsInput = z.infer<
	typeof salesFinanceResolutionsSchema
>;
export type SalesFinanceResolutionSyncInput = z.infer<
	typeof salesFinanceResolutionSyncSchema
>;
export type SalesFinancePaymentResolutionInput = z.infer<
	typeof salesFinancePaymentResolutionSchema
>;
export type SalesFinanceAdoptionPingInput = z.infer<
	typeof salesFinanceAdoptionPingSchema
>;
