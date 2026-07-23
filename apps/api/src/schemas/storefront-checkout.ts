import { z } from "zod";

export const storefrontAddressSchema = z.object({
	id: z.number().int().positive().optional().nullable(),
	name: z.string().trim().min(1).max(255),
	email: z.string().trim().email().max(255),
	phone: z.string().trim().min(7).max(40),
	address1: z.string().trim().min(1).max(300),
	address2: z.string().trim().max(300).optional().nullable(),
	city: z.string().trim().min(1).max(255),
	state: z.string().trim().min(1).max(255),
	postalCode: z.string().trim().min(3).max(20),
	country: z.string().trim().min(2).max(255).default("US"),
	placeId: z.string().trim().min(1).max(191).optional().nullable(),
	formattedAddress: z.string().trim().min(1).max(500).optional().nullable(),
	lat: z.number().min(-90).max(90).optional().nullable(),
	lng: z.number().min(-180).max(180).optional().nullable(),
});

export const createStorefrontCheckoutSchema = z.object({
	idempotencyKey: z.string().uuid(),
	cartVersion: z.number().int().positive(),
	fulfillment: z.enum(["pickup", "delivery"]),
	shippingQuoteId: z.string().trim().min(1).optional().nullable(),
	shippingAddress: storefrontAddressSchema,
	billingSameAsShipping: z.boolean().default(true),
	billingAddress: storefrontAddressSchema.optional().nullable(),
});

export const storefrontCheckoutIdSchema = z.object({
	checkoutId: z.string().trim().min(1),
});

export type StorefrontAddressInput = z.infer<typeof storefrontAddressSchema>;
export type CreateStorefrontCheckoutInput = z.infer<
	typeof createStorefrontCheckoutSchema
>;
