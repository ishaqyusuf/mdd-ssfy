import { z } from "zod";

export const storefrontProfileInputSchema = z.object({
	name: z.string().trim().min(1).max(191).nullable(),
	businessName: z.string().trim().min(1).max(191).nullable(),
	phoneNo: z.string().trim().min(7).max(40).nullable(),
});

export const storefrontAddressInputSchema = z.object({
	id: z.number().int().positive().optional(),
	name: z.string().trim().min(1).max(191),
	email: z.string().trim().email().max(191),
	phone: z.string().trim().min(7).max(40),
	address1: z.string().trim().min(1).max(300),
	address2: z.string().trim().max(300).nullable().optional(),
	city: z.string().trim().min(1).max(191),
	state: z.string().trim().min(1).max(191),
	postalCode: z.string().trim().min(3).max(30),
	country: z.string().trim().min(2).max(191),
	isPrimary: z.boolean().default(false),
});

export const storefrontAddressIdSchema = z.object({
	id: z.number().int().positive(),
});

export const storefrontOrderListSchema = z.object({
	query: z.string().trim().max(191).optional(),
	status: z
		.enum(["all", "processing", "in-transit", "delivered", "cancelled"])
		.default("all"),
	cursor: z.number().int().positive().optional(),
	limit: z.number().int().min(1).max(50).default(20),
});

export const storefrontOrderIdSchema = z.object({
	orderId: z.string().trim().min(1).max(255),
});

export type StorefrontProfileInput = z.infer<
	typeof storefrontProfileInputSchema
>;
export type StorefrontAddressInput = z.infer<
	typeof storefrontAddressInputSchema
>;
export type StorefrontOrderListInput = z.infer<
	typeof storefrontOrderListSchema
>;
