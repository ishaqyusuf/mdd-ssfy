import { z } from "zod";

const nullableText = (max: number) =>
	z.string().trim().max(max).nullable().optional();

export const storefrontPromotionInputSchema = z
	.object({
		id: z.string().trim().min(1).optional(),
		internalName: z.string().trim().min(1).max(255),
		publicTitle: z.string().trim().min(1).max(255),
		description: nullableText(10_000),
		badgeText: z.string().trim().min(1).max(64),
		bannerText: nullableText(255),
		bannerHref: nullableText(191).refine(
			(value) => !value || (value.startsWith("/") && !value.startsWith("//")),
			"Banner destination must be an internal storefront path.",
		),
		percentageOff: z.number().positive().max(100),
		priority: z.number().int().min(-10_000).max(10_000).default(0),
		audienceMode: z.enum(["EVERYONE", "TARGETED"]),
		scopeMode: z.enum(["ALL_OFFERS", "TARGETED"]),
		startsAt: z.coerce.date(),
		endsAt: z.coerce.date().nullable(),
		customerIds: z.array(z.number().int().positive()).max(5_000).default([]),
		customerProfileIds: z
			.array(z.number().int().positive())
			.max(500)
			.default([]),
		categoryIds: z.array(z.string().trim().min(1)).max(500).default([]),
		offerIds: z.array(z.string().trim().min(1)).max(5_000).default([]),
	})
	.superRefine((value, ctx) => {
		if (value.endsAt && value.endsAt <= value.startsAt) {
			ctx.addIssue({
				code: "custom",
				path: ["endsAt"],
				message: "End time must be after the start time.",
			});
		}
		if (
			value.audienceMode === "TARGETED" &&
			!value.customerIds.length &&
			!value.customerProfileIds.length
		) {
			ctx.addIssue({
				code: "custom",
				path: ["customerIds"],
				message: "Select at least one customer or customer profile.",
			});
		}
		if (
			value.scopeMode === "TARGETED" &&
			!value.categoryIds.length &&
			!value.offerIds.length
		) {
			ctx.addIssue({
				code: "custom",
				path: ["offerIds"],
				message: "Select at least one category or offer.",
			});
		}
	});

export const storefrontPromotionListSchema = z.object({
	query: z.string().trim().max(191).optional(),
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
	cursor: z.string().trim().min(1).optional(),
	limit: z.number().int().min(1).max(50).default(25),
});

export const storefrontPromotionIdSchema = z.object({
	id: z.string().trim().min(1),
});

export const storefrontPromotionOptionSearchSchema = z.object({
	type: z.enum(["CUSTOMER", "OFFER"]),
	query: z.string().trim().max(191).default(""),
	limit: z.number().int().min(1).max(50).default(25),
});

export type StorefrontPromotionInput = z.infer<
	typeof storefrontPromotionInputSchema
>;
export type StorefrontPromotionListInput = z.infer<
	typeof storefrontPromotionListSchema
>;
export type StorefrontPromotionOptionSearchInput = z.infer<
	typeof storefrontPromotionOptionSearchSchema
>;
