import { z } from "zod";

export const storefrontInquiryStatuses = [
	"DRAFT",
	"NEW",
	"IN_REVIEW",
	"AWAITING_CUSTOMER",
	"QUOTE_CREATED",
	"RESPONDED",
	"CLOSED",
	"SPAM",
] as const;

export const storefrontInquiryStatusSchema = z.enum(storefrontInquiryStatuses);
export const storefrontInquiryOperationalStatusSchema =
	storefrontInquiryStatusSchema.exclude(["DRAFT", "QUOTE_CREATED"]);

export const storefrontProjectTypeSchema = z.enum([
	"CUSTOM_DOOR",
	"TRIM_MOULDING",
	"BUILT_INS_CABINETRY",
	"WALL_PANELING",
	"STAIR_PARTS",
	"OTHER",
]);

export const storefrontProjectBriefSchema = z.object({
	projectTypes: z.array(storefrontProjectTypeSchema).min(1).max(6),
	propertyType: z.enum(["RESIDENTIAL", "COMMERCIAL", "OTHER"]),
	city: z.string().trim().min(1).max(100),
	state: z.string().trim().min(2).max(100),
	postalCode: z.string().trim().min(3).max(20),
	dimensions: z.string().trim().max(2_000).nullable().optional(),
	styleAndMaterials: z.string().trim().max(2_000).nullable().optional(),
	targetDate: z.string().date().nullable().optional(),
	timingFlexible: z.boolean().default(true),
	budget: z.string().trim().max(191).nullable().optional(),
	fulfillmentNotes: z.string().trim().max(2_000).nullable().optional(),
	description: z.string().trim().min(20).max(20_000),
	contactPreference: z.enum(["EMAIL", "PHONE", "EITHER"]),
});

export const storefrontCustomInquiryDraftSchema = z
	.object({
		name: z.string().trim().min(2).max(255),
		email: z.string().trim().email().max(320),
		phone: z.string().trim().max(64).nullable().optional(),
		brief: storefrontProjectBriefSchema,
		website: z.string().max(0).optional(),
	})
	.superRefine((value, ctx) => {
		if (value.brief.contactPreference === "PHONE" && !value.phone?.trim()) {
			ctx.addIssue({
				code: "custom",
				path: ["phone"],
				message: "A phone number is required for phone follow-up.",
			});
		}
	});

export const storefrontInquiryAttachmentSchema = z.object({
	pathname: z.string().trim().min(1).max(512),
	url: z.string().url().max(2_048),
	filename: z.string().trim().min(1).max(255),
	contentType: z.enum([
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/heic",
		"image/heif",
		"application/pdf",
	]),
	size: z
		.number()
		.int()
		.positive()
		.max(10 * 1024 * 1024),
});

export const storefrontFinalizeCustomInquirySchema = z.object({
	inquiryId: z.string().trim().min(1),
	uploadToken: z.string().trim().min(1),
	attachments: z.array(storefrontInquiryAttachmentSchema).max(5).default([]),
});

export type StorefrontProjectBrief = z.infer<
	typeof storefrontProjectBriefSchema
>;
export type StorefrontInquiryStatus = z.infer<
	typeof storefrontInquiryStatusSchema
>;

const allowedTransitions: Record<
	StorefrontInquiryStatus,
	readonly StorefrontInquiryStatus[]
> = {
	DRAFT: ["NEW", "SPAM"],
	NEW: ["IN_REVIEW", "CLOSED", "SPAM"],
	IN_REVIEW: [
		"AWAITING_CUSTOMER",
		"RESPONDED",
		"QUOTE_CREATED",
		"CLOSED",
		"SPAM",
	],
	AWAITING_CUSTOMER: [
		"IN_REVIEW",
		"RESPONDED",
		"QUOTE_CREATED",
		"CLOSED",
		"SPAM",
	],
	QUOTE_CREATED: ["IN_REVIEW", "CLOSED"],
	RESPONDED: ["IN_REVIEW", "QUOTE_CREATED", "CLOSED", "SPAM"],
	CLOSED: ["IN_REVIEW"],
	SPAM: ["IN_REVIEW"],
};

export function canTransitionStorefrontInquiry(
	from: StorefrontInquiryStatus,
	to: StorefrontInquiryStatus,
) {
	return from === to || allowedTransitions[from].includes(to);
}

export function storefrontInquiryReference(
	id: string,
	type: "CONTACT" | "CUSTOM_QUOTE",
) {
	const suffix = id
		.replace(/[^a-z0-9]/gi, "")
		.slice(-10)
		.toUpperCase();
	return `${type === "CUSTOM_QUOTE" ? "CMW" : "MSG"}-${suffix}`;
}

export function storefrontProjectTypeLabel(
	value: z.infer<typeof storefrontProjectTypeSchema>,
) {
	return {
		CUSTOM_DOOR: "Custom door",
		TRIM_MOULDING: "Trim and moulding",
		BUILT_INS_CABINETRY: "Built-ins and cabinetry",
		WALL_PANELING: "Wall paneling",
		STAIR_PARTS: "Stair parts",
		OTHER: "Other",
	}[value];
}
