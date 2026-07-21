import { storefrontCatalogFamilies } from "@gnd/sales/storefront-catalog";
import { z } from "zod";

export const storefrontCatalogListSchema = z.object({
	query: z.string().trim().max(191).optional(),
	family: z.enum(storefrontCatalogFamilies).optional(),
	status: z.enum(["online", "offline"]).optional(),
	featured: z.boolean().optional(),
	profileId: z.number().int().positive().optional(),
	cursor: z.number().int().positive().optional(),
	limit: z.number().int().min(1).max(48).default(24),
});

export const storefrontCatalogDetailSchema = z.object({
	componentUid: z.string().trim().min(1).max(191),
});

export const storefrontCatalogStatusSchema =
	storefrontCatalogDetailSchema.extend({
		online: z.boolean(),
	});

export const storefrontCatalogImageSchema =
	storefrontCatalogDetailSchema.extend({
		imageUrl: z.string().trim().max(4_000).nullable(),
	});

export const storefrontCatalogMetadataSchema =
	storefrontCatalogDetailSchema.extend({
		title: z.string().trim().max(255).nullable(),
		description: z.string().trim().max(20_000).nullable(),
		imageUrl: z.string().trim().max(4_000).nullable(),
		galleryImageUrls: z
			.array(z.string().trim().url().max(4_000))
			.max(12)
			.default([]),
	});

export const storefrontCatalogFeaturedSchema =
	storefrontCatalogDetailSchema.extend({
		featured: z.boolean(),
	});

export const storefrontCatalogBulkSchema = z.object({
	componentUids: z.array(z.string().trim().min(1).max(191)).min(1).max(250),
	action: z.enum(["online", "offline", "feature", "unfeature"]),
});

export type StorefrontCatalogListInput = z.infer<
	typeof storefrontCatalogListSchema
>;
