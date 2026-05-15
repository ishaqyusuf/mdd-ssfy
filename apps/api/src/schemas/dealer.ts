import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const getDealersSchema = z
	.object({
		search: z.string().optional().nullable(),
		status: z.string().optional().nullable(),
	})
	.extend(paginationSchema.shape);
export type GetDealersSchema = z.infer<typeof getDealersSchema>;

export const searchDealerCustomerCandidatesSchema = z.object({
	query: z.string().optional().nullable(),
	take: z.number().min(1).max(25).optional().nullable(),
});
export type SearchDealerCustomerCandidatesSchema = z.infer<
	typeof searchDealerCustomerCandidatesSchema
>;

export const createDealerAccountSchema = z
	.object({
		customerId: z.number().optional().nullable(),
		name: z.string().optional().nullable(),
		email: z.string().email(),
	})
	.superRefine((data, ctx) => {
		if (!data.customerId && !data.name?.trim()) {
			ctx.addIssue({
				code: "custom",
				path: ["name"],
				message:
					"Dealer name is required when no existing customer is selected.",
			});
		}
	});
export type CreateDealerAccountSchema = z.infer<
	typeof createDealerAccountSchema
>;

export const resendDealerOnboardingSchema = z.object({
	dealerId: z.number(),
});
export type ResendDealerOnboardingSchema = z.infer<
	typeof resendDealerOnboardingSchema
>;

export const dealerPortalCustomerSchema = z.object({
	id: z.number().optional().nullable(),
	name: z.string().optional().nullable(),
	businessName: z.string().optional().nullable(),
	email: z.string().email().optional().nullable().or(z.literal("")),
	phoneNo: z.string().optional().nullable(),
	address: z.string().optional().nullable(),
	customerTypeId: z.number().optional().nullable(),
});
export type DealerPortalCustomerSchema = z.infer<
	typeof dealerPortalCustomerSchema
>;

export const dealerPortalSalesProfileSchema = z.object({
	id: z.number().optional().nullable(),
	title: z.string().min(1),
	coefficient: z.number().optional().nullable(),
	defaultProfile: z.boolean().optional().nullable(),
});
export type DealerPortalSalesProfileSchema = z.infer<
	typeof dealerPortalSalesProfileSchema
>;

export const dealerPortalSalesDocumentsSchema = z.object({
	type: z.enum(["order", "quote"]),
});
export type DealerPortalSalesDocumentsSchema = z.infer<
	typeof dealerPortalSalesDocumentsSchema
>;

export const dealerPortalSalesLineItemSchema = z.object({
	uid: z.string().min(1),
	title: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	qty: z.number().min(0).optional().nullable(),
	unitPrice: z.number().optional().nullable(),
	lineTotal: z.number().optional().nullable(),
});
export type DealerPortalSalesLineItemSchema = z.infer<
	typeof dealerPortalSalesLineItemSchema
>;

export const dealerPortalSaveQuoteSchema = z.object({
	customerId: z.number(),
	customerProfileId: z.number().optional().nullable(),
	taxRate: z.number().min(0).max(100).optional().nullable(),
	lineItems: z.array(dealerPortalSalesLineItemSchema).min(1),
});
export type DealerPortalSaveQuoteSchema = z.infer<
	typeof dealerPortalSaveQuoteSchema
>;

export const dealerPortalSettingsSchema = z.object({
	name: z.string().optional().nullable(),
	companyName: z.string().optional().nullable(),
	phoneNo: z.string().optional().nullable(),
	logoUrl: z.string().url().optional().nullable().or(z.literal("")),
	address1: z.string().optional().nullable(),
	address2: z.string().optional().nullable(),
	city: z.string().optional().nullable(),
	state: z.string().optional().nullable(),
	country: z.string().optional().nullable(),
});
export type DealerPortalSettingsSchema = z.infer<
	typeof dealerPortalSettingsSchema
>;
