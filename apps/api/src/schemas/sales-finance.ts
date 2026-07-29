import {
	SALES_FINANCE_APPLICATION_STATUSES,
	SALES_FINANCE_EXCEPTION_CODES,
	SALES_FINANCE_PAYMENT_METHODS,
} from "@gnd/sales/payment-system";
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

export const salesFinanceFiltersSchema = z.object({
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

export const salesFinanceSummarySchema = salesFinanceFiltersSchema.omit({
	tab: true,
});

export const salesFinanceTransactionDetailSchema = z.object({
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
