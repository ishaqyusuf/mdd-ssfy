import z from "zod";
import { hasJwtSecret, jwtDecrypt, jwtEncrypt } from "./jwt";

type XOR<T, U> = T | U extends object
	? Exclude<keyof T, keyof U> extends never
		? never
		: Exclude<keyof U, keyof T> extends never
			? never
			: T | U
	: T | U;
export const salesPdfToken = z.object({
	salesIds: z.array(z.number()),
	expiry: z.string(),
	mode: z.string(),
	dispatchId: z.number().optional().nullable(),
});
export type SalesPdfToken = z.infer<typeof salesPdfToken>;
export const jobsPdfToken = z.object({
	jobIds: z.array(z.number()).min(1).optional().nullable(),
	expiry: z.string(),
	context: z
		.enum(["jobs-page", "payment-portal", "payroll-report"])
		.optional()
		.nullable(),
	scope: z.enum(["selection", "all-unpaid"]).optional().nullable(),
});
export type JobsPdfToken = z.infer<typeof jobsPdfToken>;
export const payoutPdfToken = z.object({
	paymentIds: z.array(z.number()).min(1),
	expiry: z.string(),
});
export type PayoutPdfToken = z.infer<typeof payoutPdfToken>;
export const communityInvoiceAgingPdfToken = z.object({
	expiry: z.string(),
	q: z.string().optional().nullable(),
	builderSlug: z.string().optional().nullable(),
	projectSlug: z.string().optional().nullable(),
	production: z.string().optional().nullable(),
	invoice: z.string().optional().nullable(),
	installation: z.string().optional().nullable(),
	dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
});
export type CommunityInvoiceAgingPdfToken = z.infer<
	typeof communityInvoiceAgingPdfToken
>;
export const communityInvoiceTaskDetailPdfToken = z.object({
	expiry: z.string(),
	q: z.string().optional().nullable(),
	builderSlug: z.string().optional().nullable(),
	projectSlug: z.string().optional().nullable(),
	production: z.string().optional().nullable(),
	invoice: z.string().optional().nullable(),
	installation: z.string().optional().nullable(),
	dateRange: z.array(z.string().optional().nullable()).optional().nullable(),
});
export type CommunityInvoiceTaskDetailPdfToken = z.infer<
	typeof communityInvoiceTaskDetailPdfToken
>;
export const salesPaymentTokenSchema = z.object({
	salesIds: z.array(z.number()),
	expiry: z.string(),
	percentage: z.number().optional().nullable(),
	payPlan: z
		.union([
			z.number(),
			z.literal("full"),
			z.literal("custom"),
			z.literal("flexible"),
		])
		.optional()
		.nullable(),
	preferredAmount: z.number().optional().nullable(),
	walletId: z.number(),
	amount: z.number().optional().nullable(),
	paymentId: z.string().optional().nullable(),
});
export const quoteAcceptanceTokenSchema = z.object({
	salesId: z.number(),
	orderId: z.string(),
	expiry: z.string(),
});
export const tokenSchemas = {
	salesPdfToken,
	jobsPdfToken,
	payoutPdfToken,
	communityInvoiceAgingPdfToken,
	communityInvoiceTaskDetailPdfToken,
	salesPaymentTokenSchema,
	quoteAcceptanceTokenSchema,
} as const;
export type TokenSchemaNames = keyof typeof tokenSchemas;
export type SalesPaymentTokenSchema = z.infer<typeof salesPaymentTokenSchema>;
export type QuoteAcceptanceTokenSchema = z.infer<
	typeof quoteAcceptanceTokenSchema
>;
type KnownToken =
	| SalesPdfToken
	| JobsPdfToken
	| PayoutPdfToken
	| CommunityInvoiceAgingPdfToken
	| CommunityInvoiceTaskDetailPdfToken
	| SalesPaymentTokenSchema
	| QuoteAcceptanceTokenSchema;
export function tokenize<T extends KnownToken>(data: T) {
	return jwtEncrypt(data);
}

export function tryTokenize<T extends KnownToken>(data: T) {
	if (!hasJwtSecret()) {
		return null;
	}

	return jwtEncrypt(data);
}
export function validateToken<T>(
	data: string,
	schema: z.ZodSchema<T>,
): T | null {
	try {
		const result = jwtDecrypt(data);
		const parsed = schema.safeParse(result);
		if (!parsed.success) return null;
		return parsed.data;
	} catch {
		return null;
	}
}
