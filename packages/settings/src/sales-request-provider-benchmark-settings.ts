import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import { z } from "zod";
import {
	SALES_REQUEST_AI_PROVIDERS,
	isSalesRequestAIModel,
	salesRequestAISelectionSchema,
} from "./sales-request-ai-catalog";

const SALES_SETTINGS_TYPE = "sales-settings";
const SETTINGS_TRANSACTION_TIMEOUT_MS = 60_000;
const MAX_VERSION_TOKEN_LENGTH = 64;
const MAX_RUN_ID_LENGTH = 120;
const MAX_APPROVAL_REVISION = 2_147_483_647;

export const SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION =
	"sales-request-text-v1";
export const SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION = "pilot-gates-v1";

const versionTokenSchema = z
	.string()
	.trim()
	.min(1)
	.max(MAX_VERSION_TOKEN_LENGTH)
	.regex(
		/^[A-Za-z0-9][A-Za-z0-9._-]*$/,
		"Version must be a bounded token containing only letters, numbers, dots, underscores, or hyphens",
	);

const benchmarkDecisionFields = {
	approved: z.boolean(),
	provider: z.enum(SALES_REQUEST_AI_PROVIDERS),
	model: z.string().trim().min(1).max(128),
	evaluationRunId: z
		.string()
		.trim()
		.min(1)
		.max(MAX_RUN_ID_LENGTH)
		.regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
	corpusVersion: versionTokenSchema,
	policyVersion: versionTokenSchema,
	configurationRevision: z.string().regex(/^[a-f0-9]{64}$/),
	promptVersion: versionTokenSchema,
	schemaVersion: z.number().int().positive().max(100),
	evidenceDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
};

const benchmarkApprovalFields = {
	...benchmarkDecisionFields,
	approvedByUserId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
};

function refineProviderModel(
	value: {
		provider: (typeof SALES_REQUEST_AI_PROVIDERS)[number];
		model: string;
	},
	ctx: z.RefinementCtx,
) {
	if (!isSalesRequestAIModel(value.provider, value.model)) {
		ctx.addIssue({
			code: "custom",
			path: ["model"],
			message: `Model ${value.model} is not allowed for ${value.provider}`,
		});
	}
}

export const salesRequestProviderBenchmarkApprovalInputSchema = z
	.object(benchmarkApprovalFields)
	.strict()
	.superRefine(refineProviderModel);

export const salesRequestProviderBenchmarkDecisionSchema = z
	.object(benchmarkDecisionFields)
	.strict()
	.superRefine(refineProviderModel);

export type SalesRequestProviderBenchmarkDecision = z.infer<
	typeof salesRequestProviderBenchmarkDecisionSchema
>;

export type SalesRequestProviderBenchmarkApprovalInput = z.infer<
	typeof salesRequestProviderBenchmarkApprovalInputSchema
>;

export const salesRequestProviderBenchmarkApprovalSchema = z
	.object({
		...benchmarkApprovalFields,
		approvedAt: z.string().datetime(),
		revision: z.number().int().positive().max(MAX_APPROVAL_REVISION),
	})
	.strict()
	.superRefine(refineProviderModel);

export type SalesRequestProviderBenchmarkApproval = z.infer<
	typeof salesRequestProviderBenchmarkApprovalSchema
>;

export type SalesRequestProviderBenchmarkIdentity = Pick<
	SalesRequestProviderBenchmarkApproval,
	| "provider"
	| "model"
	| "configurationRevision"
	| "promptVersion"
	| "schemaVersion"
	| "corpusVersion"
	| "policyVersion"
>;

export function isSalesRequestProviderBenchmarkApprovalCurrent(
	approval: SalesRequestProviderBenchmarkApproval | null | undefined,
	identity: SalesRequestProviderBenchmarkIdentity,
) {
	return Boolean(
		approval?.approved &&
			approval.provider === identity.provider &&
			approval.model === identity.model &&
			approval.configurationRevision === identity.configurationRevision &&
			approval.promptVersion === identity.promptVersion &&
			approval.schemaVersion === identity.schemaVersion &&
			approval.corpusVersion === identity.corpusVersion &&
			approval.policyVersion === identity.policyVersion,
	);
}

export type SalesRequestProviderBenchmarkApprovalSource =
	| "missing"
	| "invalid"
	| "missing-selection"
	| "invalid-selection"
	| "stale"
	| "persisted";

export type SalesRequestProviderBenchmarkApprovalResult = {
	settingId: number;
	approval: SalesRequestProviderBenchmarkApproval | null;
	approved: boolean;
	source: SalesRequestProviderBenchmarkApprovalSource;
};

export type UpdateSalesRequestProviderBenchmarkApprovalInput =
	SalesRequestProviderBenchmarkApprovalInput & {
		settingId: number;
		approvedAt?: Date;
	};

export type SalesRequestProviderBenchmarkApprovalUpdate =
	SalesRequestProviderBenchmarkApprovalResult & {
		changed: boolean;
	};

export type SalesRequestProviderBenchmarkApprovalVerifier = (
	tx: TransactionClient,
	input: SalesRequestProviderBenchmarkApprovalInput,
) => Promise<void>;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function strictRecord(value: unknown, label: string): RecordValue {
	if (value == null) return {};
	if (typeof value === "string") {
		try {
			return strictRecord(JSON.parse(value), label);
		} catch {
			throw new Error(`Invalid sales settings ${label}`);
		}
	}
	if (!isRecord(value)) throw new Error(`Invalid sales settings ${label}`);
	return value;
}

function requireSettingId(value: unknown): asserts value is number {
	if (!Number.isSafeInteger(value) || (value as number) <= 0) {
		throw new Error("A valid sales settings ID is required");
	}
}

function requireDate(value: unknown): Date {
	if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
		throw new Error("A valid benchmark approval date is required");
	}
	return value;
}

function readApproval(
	meta: unknown,
	settingId: number,
): SalesRequestProviderBenchmarkApprovalResult {
	const settings = strictRecord(meta, "metadata");
	const requestGeneration = strictRecord(
		settings.requestGeneration,
		"requestGeneration",
	);
	if (!Object.hasOwn(requestGeneration, "providerBenchmarkApproval")) {
		return { settingId, approval: null, approved: false, source: "missing" };
	}

	const approval = salesRequestProviderBenchmarkApprovalSchema.safeParse(
		requestGeneration.providerBenchmarkApproval,
	);
	if (!approval.success) {
		return { settingId, approval: null, approved: false, source: "invalid" };
	}

	if (!Object.hasOwn(requestGeneration, "ai")) {
		return {
			settingId,
			approval: approval.data,
			approved: false,
			source: "missing-selection",
		};
	}
	const selection = salesRequestAISelectionSchema.safeParse(
		requestGeneration.ai,
	);
	if (!selection.success) {
		return {
			settingId,
			approval: approval.data,
			approved: false,
			source: "invalid-selection",
		};
	}
	if (
		selection.data.provider !== approval.data.provider ||
		selection.data.model !== approval.data.model
	) {
		return {
			settingId,
			approval: approval.data,
			approved: false,
			source: "stale",
		};
	}

	return {
		settingId,
		approval: approval.data,
		approved: approval.data.approved,
		source: "persisted",
	};
}

/**
 * Read the current provider-benchmark decision. Approval is effective only
 * when the record and the explicitly persisted provider/model are both valid
 * and still match; defaults never grant approval.
 */
export async function getSalesRequestProviderBenchmarkApproval(
	db: Pick<Db, "settings">,
	settingId: number,
): Promise<SalesRequestProviderBenchmarkApprovalResult> {
	requireSettingId(settingId);
	const setting = await db.settings.findFirst({
		where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
		select: { id: true, meta: true },
	});
	if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
	if (setting.id !== settingId) {
		throw new Error(`Sales settings identity mismatch: ${settingId}`);
	}

	return readApproval(setting.meta, settingId);
}

/**
 * Persist one explicit approval decision against the active provider/model.
 * Each write creates a new revision; the digest identifies the immutable
 * external evidence reviewed for that decision without storing its contents.
 */
export async function updateSalesRequestProviderBenchmarkApproval(
	db: Db,
	rawInput: UpdateSalesRequestProviderBenchmarkApprovalInput,
	verifyCurrentIdentity: SalesRequestProviderBenchmarkApprovalVerifier,
): Promise<SalesRequestProviderBenchmarkApprovalUpdate> {
	const settingId = rawInput?.settingId;
	requireSettingId(settingId);
	const input = salesRequestProviderBenchmarkApprovalInputSchema.parse({
		approved: rawInput?.approved,
		provider: rawInput?.provider,
		model: rawInput?.model,
		evaluationRunId: rawInput?.evaluationRunId,
		corpusVersion: rawInput?.corpusVersion,
		policyVersion: rawInput?.policyVersion,
		configurationRevision: rawInput?.configurationRevision,
		promptVersion: rawInput?.promptVersion,
		schemaVersion: rawInput?.schemaVersion,
		evidenceDigest: rawInput?.evidenceDigest,
		approvedByUserId: rawInput?.approvedByUserId,
	});
	const approvedAt = requireDate(
		rawInput.approvedAt ?? new Date(),
	).toISOString();

	return db.$transaction(
		async (tx) => {
			const lockedRows = await tx.$queryRaw<Array<{ id: number }>>(
				Prisma.sql`SELECT id FROM Settings
					WHERE type=${SALES_SETTINGS_TYPE}
					  AND deletedAt IS NULL
					ORDER BY id ASC
					LIMIT 1
					FOR UPDATE`,
			);
			if (lockedRows[0]?.id !== settingId) {
				throw new Error(
					`Sales settings is no longer the active row: ${settingId}`,
				);
			}

			const setting = await tx.settings.findFirst({
				where: { id: settingId, type: SALES_SETTINGS_TYPE, deletedAt: null },
				select: { id: true, meta: true },
			});
			if (!setting) throw new Error(`Sales settings not found: ${settingId}`);
			if (setting.id !== settingId) {
				throw new Error(`Sales settings identity mismatch: ${settingId}`);
			}

			const meta = { ...strictRecord(setting.meta, "metadata") };
			const requestGeneration = {
				...strictRecord(meta.requestGeneration, "requestGeneration"),
			};
			const selection = salesRequestAISelectionSchema.safeParse(
				requestGeneration.ai,
			);
			if (
				!selection.success ||
				selection.data.provider !== input.provider ||
				selection.data.model !== input.model
			) {
				throw new Error(
					"Benchmark approval must match the active sales request AI selection",
				);
			}
			await verifyCurrentIdentity(tx, input);

			const current = salesRequestProviderBenchmarkApprovalSchema.safeParse(
				requestGeneration.providerBenchmarkApproval,
			);
			const revision = current.success ? current.data.revision + 1 : 1;
			if (revision > MAX_APPROVAL_REVISION) {
				throw new Error("Benchmark approval revision limit reached");
			}
			const approval: SalesRequestProviderBenchmarkApproval = {
				...input,
				approvedAt,
				revision,
			};
			requestGeneration.providerBenchmarkApproval = approval;
			meta.requestGeneration = requestGeneration;
			await tx.settings.update({
				where: { id: settingId },
				data: { meta },
			});

			return {
				changed: true,
				settingId,
				approval,
				approved: approval.approved,
				source: "persisted" as const,
			};
		},
		{
			isolationLevel: "Serializable",
			timeout: SETTINGS_TRANSACTION_TIMEOUT_MS,
		},
	);
}
