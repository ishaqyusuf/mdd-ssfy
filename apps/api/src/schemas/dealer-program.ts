import { z } from "zod";

export const dealerRecruitmentCampaignSchema = z.object({
	id: z.string().optional(),
	title: z.string().trim().min(1).max(255),
	audienceMode: z.enum(["ALL_ELIGIBLE", "SELECTED"]),
	headline: z.string().trim().min(1).max(255),
	benefitText: z.string().trim().min(1).max(5000),
	ctaLabel: z.string().trim().min(1).max(100),
	imageUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
	accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
	placement: z.enum(["TOP", "BOTTOM"]),
	startsAt: z.coerce.date().optional().nullable(),
	endsAt: z.coerce.date().optional().nullable(),
	customerProfileIds: z.array(z.number().int().positive()).default([]),
	customerIds: z.array(z.number().int().positive()).default([]),
});

export const dealerRecruitmentCampaignStatusSchema = z.object({
	id: z.string(),
	status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
});

export const dealerProgramTokenSchema = z.object({
	token: z.string().min(20).max(500),
});

export const dealerProgramApplicationSubmitSchema =
	dealerProgramTokenSchema.extend({
		consent: z.literal(true),
	});

export const dealerProgramApplicationDecisionSchema = z.object({
	id: z.string(),
	decision: z.enum(["APPROVED", "DENIED"]),
	note: z.string().trim().max(5000).optional().nullable(),
});

export const dealerProgramApplicationResetSchema = z.object({
	id: z.string(),
	reason: z.string().trim().min(1).max(5000),
});

export const dealerAccountSuspensionSchema = z.object({
	dealerId: z.number().int().positive(),
	suspended: z.boolean(),
	reason: z.string().trim().max(5000).optional().nullable(),
});

export const dealerCustomerInvitationSchema = z.object({
	customerId: z.number().int().positive(),
});
