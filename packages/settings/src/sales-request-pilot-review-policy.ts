import { type Db, Prisma } from "@gnd/db";
import { z } from "zod";
import {
	SALES_REQUEST_AI_PROVIDERS,
	isSalesRequestAIModel,
	salesRequestAISelectionSchema,
} from "./sales-request-ai-catalog";
import { salesRequestPilotSettingsSchema } from "./sales-request-pilot-settings";

const SALES_SETTINGS_TYPE = "sales-settings";
const SETTINGS_TRANSACTION_TIMEOUT_MS = 60_000;
const MAX_REVISION = 2_147_483_647;
const MAX_COUNT = 100_000_000;
const versionTokenSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const boundedCount = z.number().int().nonnegative().max(MAX_COUNT);

export const salesRequestPilotThresholdPolicySchema = z
	.object({
		policyVersion: versionTokenSchema,
		minimumSucceededRuns: z.number().int().positive().max(10_000),
		minimumAppliedRuns: z.number().int().positive().max(10_000),
		maxProviderP95Ms: z.number().int().positive().max(300_000),
		maxInputTokensPerAttempt: boundedCount,
		maxOutputTokensPerAttempt: boundedCount,
		pricingCurrency: z.string().regex(/^[A-Z]{3}$/),
		pricingEffectiveAt: z.string().datetime({ offset: false }).regex(/Z$/),
		pricingEvidenceDigest: digestSchema,
		inputPriceMicrosPerMillionTokens: z
			.number()
			.int()
			.nonnegative()
			.max(1_000_000_000),
		outputPriceMicrosPerMillionTokens: z
			.number()
			.int()
			.nonnegative()
			.max(1_000_000_000),
		maxEstimatedPeriodCostMicros: boundedCount,
		manualBaselineRequestFamily: versionTokenSchema,
		manualBaselineMeasuredAt: z
			.string()
			.datetime({ offset: false })
			.regex(/Z$/),
		manualBaselineSampleCount: z.number().int().positive().max(10_000),
		manualBaselineEvidenceDigest: digestSchema,
		manualCorrectionBaselineP95Ms: z.number().int().positive().max(86_400_000),
		maxUnsafeSelectionFeedbackCount: z.number().int().nonnegative().max(10_000),
		maxUnsafeApplyCount: z.number().int().nonnegative().max(10_000),
		minimumSaveReopenChecks: z.number().int().positive().max(10_000),
	})
	.strict();

export const salesRequestPilotReviewPolicyInputSchema = z
	.object({
		provider: z.enum(SALES_REQUEST_AI_PROVIDERS),
		model: z.string().trim().min(1).max(128),
		thresholds: salesRequestPilotThresholdPolicySchema,
	})
	.strict()
	.superRefine((value, context) => {
		if (!isSalesRequestAIModel(value.provider, value.model)) {
			context.addIssue({
				code: "custom",
				path: ["model"],
				message: "Model is not allowed for the selected provider",
			});
		}
	});

export const salesRequestPilotReviewPolicySchema =
	salesRequestPilotReviewPolicyInputSchema.extend({
		digest: digestSchema,
		revision: z.number().int().positive().max(MAX_REVISION),
		changedAt: z.string().datetime({ offset: false }).regex(/Z$/),
		changedByUserId: z.number().int().positive(),
	});

export type SalesRequestPilotThresholdPolicy = z.infer<
	typeof salesRequestPilotThresholdPolicySchema
>;
export type SalesRequestPilotReviewPolicy = z.infer<
	typeof salesRequestPilotReviewPolicySchema
>;
export type SalesRequestPilotReviewPolicySource =
	| "missing"
	| "invalid"
	| "persisted";
export type SalesRequestPilotReviewPolicyVerifier = (input: {
	provider: z.infer<
		typeof salesRequestPilotReviewPolicyInputSchema
	>["provider"];
	model: string;
	thresholds: SalesRequestPilotThresholdPolicy;
	digest: string;
}) => void | Promise<void>;

type RecordValue = Record<string, unknown>;
function record(value: unknown, label: string): RecordValue {
	if (value == null) return {};
	if (typeof value === "string") {
		try {
			return record(JSON.parse(value), label);
		} catch {
			throw new Error(`Invalid sales settings ${label}`);
		}
	}
	if (typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`Invalid sales settings ${label}`);
	}
	return value as RecordValue;
}

export async function getSalesRequestPilotReviewPolicy(
	db: Pick<Db, "settings">,
	settingId: number,
) {
	if (!Number.isSafeInteger(settingId) || settingId <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
	const setting = await db.settings.findFirst({
		where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
		select: { id: true, meta: true },
	});
	if (!setting || setting.id !== settingId) {
		throw new Error(`Sales settings not found: ${settingId}`);
	}
	const meta = record(setting.meta, "metadata");
	const requestGeneration = record(meta.requestGeneration, "requestGeneration");
	const parsed = salesRequestPilotReviewPolicySchema.safeParse(
		requestGeneration.pilotReviewPolicy,
	);
	return {
		settingId,
		policy: parsed.success ? parsed.data : null,
		source: parsed.success
			? ("persisted" as const)
			: Object.hasOwn(requestGeneration, "pilotReviewPolicy")
				? ("invalid" as const)
				: ("missing" as const),
	};
}

export async function updateSalesRequestPilotReviewPolicy(
	db: Db,
	rawInput: z.input<typeof salesRequestPilotReviewPolicyInputSchema> & {
		settingId: number;
		changedByUserId: number;
		digest: string;
		changedAt?: Date;
	},
	verifyDigest: SalesRequestPilotReviewPolicyVerifier,
) {
	const input = salesRequestPilotReviewPolicyInputSchema.parse({
		provider: rawInput.provider,
		model: rawInput.model,
		thresholds: rawInput.thresholds,
	});
	if (!Number.isSafeInteger(rawInput.settingId) || rawInput.settingId <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
	if (
		!Number.isSafeInteger(rawInput.changedByUserId) ||
		rawInput.changedByUserId <= 0
	) {
		throw new Error("A valid policy actor is required");
	}
	const digest = digestSchema.parse(rawInput.digest);
	const changedAt = rawInput.changedAt ?? new Date();
	if (!Number.isFinite(changedAt.getTime()))
		throw new Error("A valid policy date is required");
	await verifyDigest({ ...input, digest });

	return db.$transaction(
		async (tx) => {
			const locked = await tx.$queryRaw<Array<{ id: number }>>(
				Prisma.sql`SELECT id FROM Settings WHERE type=${SALES_SETTINGS_TYPE} AND deletedAt IS NULL ORDER BY id ASC LIMIT 1 FOR UPDATE`,
			);
			if (locked[0]?.id !== rawInput.settingId) {
				throw new Error("Sales settings is no longer the active row");
			}
			const setting = await tx.settings.findFirst({
				where: {
					id: rawInput.settingId,
					type: SALES_SETTINGS_TYPE,
					deletedAt: null,
				},
				select: { id: true, meta: true },
			});
			if (!setting)
				throw new Error(`Sales settings not found: ${rawInput.settingId}`);
			const meta = { ...record(setting.meta, "metadata") };
			const requestGeneration = {
				...record(meta.requestGeneration, "requestGeneration"),
			};
			const pilot = salesRequestPilotSettingsSchema.safeParse(
				requestGeneration.pilot,
			);
			if (!pilot.success) {
				throw new Error(
					"Persist valid pilot settings before updating the review policy",
				);
			}
			const selection = salesRequestAISelectionSchema.safeParse(
				requestGeneration.ai,
			);
			if (
				!selection.success ||
				selection.data.provider !== input.provider ||
				selection.data.model !== input.model
			) {
				throw new Error(
					"Pilot review policy must match the active sales request AI selection",
				);
			}
			const current = salesRequestPilotReviewPolicySchema.safeParse(
				requestGeneration.pilotReviewPolicy,
			);
			if (current.success && current.data.digest === digest) {
				return {
					changed: false,
					settingId: rawInput.settingId,
					policy: current.data,
					source: "persisted" as const,
				};
			}
			if (
				current.success &&
				current.data.thresholds.policyVersion === input.thresholds.policyVersion
			) {
				throw new Error(
					"Increment the pilot review policy version when thresholds change",
				);
			}
			if (pilot.data.revision >= MAX_REVISION) {
				throw new Error("Pilot settings revision limit reached");
			}
			const revision = current.success ? current.data.revision + 1 : 1;
			if (revision > MAX_REVISION)
				throw new Error("Pilot review policy revision limit reached");
			const policy: SalesRequestPilotReviewPolicy = {
				...input,
				digest,
				revision,
				changedAt: changedAt.toISOString(),
				changedByUserId: rawInput.changedByUserId,
			};
			requestGeneration.pilotReviewPolicy = policy;
			requestGeneration.pilot = {
				...pilot.data,
				revision: pilot.data.revision + 1,
				changedAt: changedAt.toISOString(),
			};
			meta.requestGeneration = requestGeneration;
			await tx.settings.update({
				where: { id: rawInput.settingId },
				data: { meta },
			});
			return {
				changed: true,
				settingId: rawInput.settingId,
				policy,
				source: "persisted" as const,
			};
		},
		{
			isolationLevel: "Serializable",
			timeout: SETTINGS_TRANSACTION_TIMEOUT_MS,
		},
	);
}
