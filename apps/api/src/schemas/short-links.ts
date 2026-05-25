import { z } from "zod";

const nullableText = z.string().trim().nullable().optional();
const nullableDate = z
	.union([z.string().datetime(), z.date()])
	.nullable()
	.optional();

export const listShortLinksSchema = z.object({
	q: z.string().trim().nullable().optional(),
	page: z.number().int().min(1).optional(),
	size: z.number().int().min(1).max(200).optional(),
	includeInactive: z.boolean().nullable().optional(),
});

export type ListShortLinksSchema = z.infer<typeof listShortLinksSchema>;

export const createShortLinkSchema = z.object({
	targetUrl: z.string().url(),
	slug: nullableText,
	title: nullableText,
	sourceType: nullableText,
	sourceId: nullableText,
	expiresAt: nullableDate,
	active: z.boolean().optional(),
	meta: z.record(z.string(), z.any()).nullable().optional(),
});

export type CreateShortLinkSchema = z.infer<typeof createShortLinkSchema>;

export const updateShortLinkSchema = createShortLinkSchema.partial().extend({
	id: z.string().min(1),
});

export type UpdateShortLinkSchema = z.infer<typeof updateShortLinkSchema>;

export const shortLinkIdSchema = z.object({
	id: z.string().min(1),
});

export type ShortLinkIdSchema = z.infer<typeof shortLinkIdSchema>;
