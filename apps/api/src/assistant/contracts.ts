import { z } from "zod";

export const assistantCapabilityStates = [
	"implemented",
	"coming_soon",
	"disabled",
	"degraded",
] as const;

export const assistantEffects = [
	"read",
	"draft",
	"artifact",
	"write",
	"external_send",
	"destructive",
] as const;

export const assistantResultStatuses = [
	"success",
	"partial",
	"pending",
	"requires_input",
	"requires_approval",
	"unavailable",
	"denied",
	"conflict",
	"failed",
] as const;

export const assistantSourceKinds = [
	"record",
	"document",
	"report",
	"web",
] as const;

export const assistantArtifactStatuses = [
	"queued",
	"running",
	"ready",
	"failed",
	"cancelled",
] as const;

export const assistantJobStatuses = [
	"queued",
	"running",
	"retrying",
	"succeeded",
	"failed",
	"cancelled",
] as const;

export const assistantCapabilityStateSchema = z.enum(assistantCapabilityStates);
export const assistantEffectSchema = z.enum(assistantEffects);
export const assistantResultStatusSchema = z.enum(assistantResultStatuses);
export const assistantSourceKindSchema = z.enum(assistantSourceKinds);
export const assistantArtifactStatusSchema = z.enum(assistantArtifactStatuses);
export const assistantJobStatusSchema = z.enum(assistantJobStatuses);

export const assistantToolIdSchema = z
	.string()
	.regex(
		/^[a-z][a-z0-9]*_[a-z][a-z0-9_]*$/,
		"Tool IDs must use lower snake case <domain>_<action> naming.",
	);

export const assistantToolIdentitySchema = z
	.object({
		toolId: assistantToolIdSchema,
		toolVersion: z.number().int().positive(),
	})
	.strict();

export const assistantSourceSchema = z
	.object({
		kind: assistantSourceKindSchema,
		id: z.string().min(1),
		label: z.string().min(1),
		href: z.string().min(1).optional(),
	})
	.strict();

export const assistantArtifactReferenceSchema = z
	.object({
		id: z.string().min(1),
		status: assistantArtifactStatusSchema,
	})
	.strict();

export const assistantJobReferenceSchema = z
	.object({
		id: z.string().min(1),
		status: assistantJobStatusSchema,
	})
	.strict();

const assistantResultEnvelopeBaseSchema = z
	.object({
		status: assistantResultStatusSchema,
		sources: z.array(assistantSourceSchema).max(50),
		observedAt: z.string().datetime({ offset: true }),
		revision: z.string().min(1).optional(),
		nextCursor: z.string().min(1).optional(),
		warnings: z.array(z.string().min(1)).max(50),
		artifact: assistantArtifactReferenceSchema.optional(),
		job: assistantJobReferenceSchema.optional(),
		allowedNextActions: z.array(assistantToolIdentitySchema).max(50),
	})
	.strict();

export function createAssistantResultEnvelopeSchema<
	TDataSchema extends z.ZodType,
>(dataSchema: TDataSchema) {
	return assistantResultEnvelopeBaseSchema
		.extend({ data: dataSchema.optional() })
		.strict();
}

export type AssistantCapabilityState = z.infer<
	typeof assistantCapabilityStateSchema
>;
export type AssistantEffect = z.infer<typeof assistantEffectSchema>;
export type AssistantResultEnvelope<TData = unknown> = z.infer<
	typeof assistantResultEnvelopeBaseSchema
> & { data?: TData };
export type AssistantToolIdentity = z.infer<typeof assistantToolIdentitySchema>;
