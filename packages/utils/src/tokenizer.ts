import z from "zod";
import { jwtDecrypt, jwtEncrypt } from "./jwt";

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
export const tokenSchemas = {
	salesPdfToken,
	jobsPdfToken,
	salesPaymentTokenSchema,
} as const;
export type TokenSchemaNames = keyof typeof tokenSchemas;
export type SalesPaymentTokenSchema = z.infer<typeof salesPaymentTokenSchema>;
type KnownToken = SalesPdfToken | JobsPdfToken | SalesPaymentTokenSchema;
export function tokenize<T extends KnownToken>(data: T) {
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
