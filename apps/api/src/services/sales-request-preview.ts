import { randomUUID } from "node:crypto";
import {
	SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
	SALES_REQUEST_PROMPT_VERSION,
} from "@gnd/sales/sales-form/request-generation";
import type { SalesRequestAISelection } from "@gnd/settings";
import type { getSalesRequestConfigurationSnapshot } from "../db/queries/sales-request-configuration";
import {
	type SalesRequestGenerationContext,
	salesRequestGroundingText,
} from "./sales-request-context";
import {
	type SalesRequestProvider,
	type SalesRequestProviderFailureDiagnostic,
	generateNewSalesFormSeed,
} from "./sales-request-generation";
import type { SalesRequestImage } from "./sales-request-images";
import { interpretationWarningKey } from "./sales-request-interpretation-warning";
import { deriveSalesRequestComplexity } from "./sales-request-request-shape";
import {
	type SalesRequestGenerationCompleteEvent,
	type SalesRequestGenerationTelemetry,
	countSalesRequestGenerationIssues,
	createSalesRequestSeedDigest,
} from "./sales-request-telemetry";

type Snapshot = Awaited<
	ReturnType<typeof getSalesRequestConfigurationSnapshot>
>;
type PreviewContext = Snapshot & {
	adminRules?: SalesRequestGenerationContext["adminRules"];
	adminRulesRevision?: number;
	aiSelection: SalesRequestAISelection;
	pilotSettingsRevision: number;
	providerBenchmarkApprovalRevision: number;
};

export class SalesRequestPreviewNeedsClarification extends Error {
	constructor(
		readonly generationId: string,
		readonly configurationScope: string,
		readonly configurationRevision: string,
		readonly provider: string,
		readonly model: string,
		readonly usage: { inputTokens?: number; outputTokens?: number },
	) {
		super("The request needs more details before a sales draft can be generated.");
	}
}

type PreviewPhase =
	| "authorization"
	| "snapshot"
	| "provider-evidence"
	| "provider"
	| "usage"
	| "generation"
	| "snapshot-validation";

export type SalesRequestPreviewSnapshotIdentity = Pick<
	Snapshot,
	"settingId" | "scope" | "revision"
>;

function statusForPreviewFailure(
	phase: PreviewPhase,
	signal: AbortSignal,
	failureStage?: SalesRequestGenerationCompleteEvent["failureStage"],
) {
	if (signal.aborted) return "cancelled" as const;
	if (phase === "usage") return "usage-denied" as const;
	if (phase === "provider") return "provider-error" as const;
	if (phase === "provider-evidence") return "configuration-error" as const;
	if (phase === "snapshot-validation") return "configuration-changed" as const;
	if (phase === "snapshot") return "configuration-error" as const;
	if (
		failureStage === "provider-api" ||
		failureStage === "structured-output" ||
		failureStage === "aborted"
	) {
		return "provider-error" as const;
	}
	return "invalid-output" as const;
}

function assertCurrentSnapshot(
	expected: PreviewContext,
	current: PreviewContext,
) {
	if (
		current.settingId !== expected.settingId ||
		(current.adminRulesRevision ?? 0) !== (expected.adminRulesRevision ?? 0) ||
		current.scope !== expected.scope ||
		current.revision !== expected.revision ||
		current.aiSelection.provider !== expected.aiSelection.provider ||
		current.aiSelection.model !== expected.aiSelection.model ||
		current.pilotSettingsRevision !== expected.pilotSettingsRevision ||
		current.providerBenchmarkApprovalRevision !==
			expected.providerBenchmarkApprovalRevision
	) {
		throw new Error(
			"Sales configuration changed during generation. Generate the preview again.",
		);
	}
}

/** Internal orchestration: authorize before reading catalog or invoking a paid model. */
export async function createSalesRequestPreview(
	input: Pick<SalesRequestGenerationContext, "clarifications" | "guidance"> & {
		text: string;
		/** Decoded source for grounding when text is a canonical safety envelope. */
		groundingText?: string;
		/** Assistant questionnaires may recover a failed structured conversion with source-grounded questions. */
		allowClarificationFallback?: boolean;
		images: SalesRequestImage[];
		signal: AbortSignal;
	},
	dependencies: {
		authorize: () => Promise<void>;
		reserveUsage: () => Promise<void>;
		readSnapshot: () => Promise<PreviewContext>;
		createProvider: (
			selection: SalesRequestAISelection,
		) => SalesRequestProvider;
		telemetry: Required<SalesRequestGenerationTelemetry>;
	},
) {
	const generationId = randomUUID();
	const startedAtMs = Date.now();
	let phase: PreviewPhase = "authorization";
	let snapshot: PreviewContext | undefined;
	let providerFailure: SalesRequestProviderFailureDiagnostic | undefined;
	let lifecycleStarted = false;
	let lifecycleCompleted = false;
	let providerAttemptedAtMs: number | null = null;

	const complete = async (
		event: Omit<
			SalesRequestGenerationCompleteEvent,
			"generationId" | "latencyMs" | "completedAt"
		>,
	) => {
		if (lifecycleCompleted || !lifecycleStarted) return;
		lifecycleCompleted = true;
		try {
			const completedAtMs = Date.now();
			await dependencies.telemetry.completeRun({
				...event,
				generationId,
				completedAt: new Date(completedAtMs),
				latencyMs: Math.max(0, completedAtMs - startedAtMs),
				...(providerAttemptedAtMs == null
					? {}
					: {
							providerLatencyMs: Math.max(
								0,
								completedAtMs - providerAttemptedAtMs,
							),
						}),
			});
		} catch {
			// A missing terminal event leaves an explicitly incomplete run for the
			// advancement report, but never discards an otherwise valid preview.
		}
	};

	try {
		await dependencies.authorize();
		input.signal.throwIfAborted();
		phase = "snapshot";
		snapshot = await dependencies.readSnapshot();
		await dependencies.telemetry.beginRun({
			generationId,
			scope: snapshot.scope,
			configurationRevision: snapshot.revision,
			provider: snapshot.aiSelection.provider,
			model: snapshot.aiSelection.model,
			promptVersion: SALES_REQUEST_PROMPT_VERSION,
			schemaVersion: SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
			pilotSettingsRevision: snapshot.pilotSettingsRevision,
			providerBenchmarkApprovalRevision:
				snapshot.providerBenchmarkApprovalRevision,
			hasText: Boolean(input.text.trim()),
			startedAt: new Date(startedAtMs),
		});
		lifecycleStarted = true;

		phase = "usage";
		await dependencies.reserveUsage();
		phase = "provider-evidence";
		providerAttemptedAtMs = Date.now();
		await dependencies.telemetry.markProviderAttempted({
			generationId,
			attemptedAt: new Date(providerAttemptedAtMs),
		});
		phase = "provider";
		const provider = dependencies.createProvider(snapshot.aiSelection);
		phase = "generation";
		const result = await generateNewSalesFormSeed(
			{
				...input,
				groundingText: salesRequestGroundingText(
					input.groundingText ?? input.text,
					input.clarifications,
				),
				adminRules: snapshot.adminRules,
				configurationJson: snapshot.configurationJson,
				configurationRevision: snapshot.revision,
			},
			provider,
			{
				onProviderFailure: (diagnostic) => {
					providerFailure = diagnostic;
				},
			},
		);

		phase = "snapshot-validation";
		const current = await dependencies.readSnapshot();
		input.signal.throwIfAborted();
		assertCurrentSnapshot(snapshot, current);
		const suppressedWarningKeys = new Set(
			(snapshot.adminRules ?? [])
				.filter((rule) => rule.suppressWarning)
				.flatMap((rule) => {
					const key = rule.id?.startsWith("interpretation-warning:")
						? rule.id.slice("interpretation-warning:".length)
						: "";
					return key ? [key] : [];
				}),
		);
		const effectiveResult = suppressedWarningKeys.size
			? {
					...result,
					seed: {
						...result.seed,
						interpretations: result.seed.interpretations?.filter(
							(warning) =>
								!suppressedWarningKeys.has(interpretationWarningKey(warning)),
						),
					},
				}
			: result;
		const requestComplexity = deriveSalesRequestComplexity(
			effectiveResult.seed,
		);
		await complete({
			status: "succeeded",
			provider: effectiveResult.provider ?? snapshot.aiSelection.provider,
			model: effectiveResult.model ?? snapshot.aiSelection.model,
			promptVersion: effectiveResult.promptVersion,
			schemaVersion: effectiveResult.seed.schemaVersion,
			...(requestComplexity
				? {
						requestComplexityVersion: requestComplexity.version,
						requestComplexityStratum: requestComplexity.stratum,
					}
				: {}),
			seedDigest: createSalesRequestSeedDigest({
				seed: effectiveResult.seed,
				generationId,
				configurationScope: snapshot.scope,
				configurationRevision: snapshot.revision,
			}),
			...(effectiveResult.usage.inputTokens !== undefined
				? { inputTokens: effectiveResult.usage.inputTokens }
				: {}),
			...(effectiveResult.usage.outputTokens !== undefined
				? { outputTokens: effectiveResult.usage.outputTokens }
				: {}),
			issueCounts: countSalesRequestGenerationIssues(effectiveResult.seed),
		});
		return {
			...effectiveResult,
			generationId,
			configurationScope: snapshot.scope,
		};
	} catch (error) {
		await complete({
			status: statusForPreviewFailure(
				phase,
				input.signal,
				providerFailure?.stage,
			),
			...(snapshot
				? {
						provider: snapshot.aiSelection.provider,
						model: snapshot.aiSelection.model,
					}
				: {}),
			...(providerFailure
				? {
						failureStage: providerFailure.stage,
						issueCounts: {
							providerFailure: {
								...(providerFailure.structuredOutputCause
									? {
											structuredOutputCause:
											providerFailure.structuredOutputCause,
										}
									: {}),
								...(providerFailure.finishReason
									? { finishReason: providerFailure.finishReason }
									: {}),
								...(providerFailure.outputShape
									? { outputShape: providerFailure.outputShape }
									: {}),
								...(providerFailure.repairAttempted !== undefined
									? { repairAttempted: providerFailure.repairAttempted }
									: {}),
								...(providerFailure.configurationIssue
									? { configurationIssue: providerFailure.configurationIssue }
									: {}),
								...(providerFailure.schemaIssues
									? { schemaIssues: providerFailure.schemaIssues }
									: {}),
								...(providerFailure.statusCode !== undefined
									? { statusCode: providerFailure.statusCode }
									: {}),
								...(providerFailure.providerCode !== undefined
									? { providerCode: providerFailure.providerCode }
									: {}),
								...(providerFailure.providerStatus
									? { providerStatus: providerFailure.providerStatus }
									: {}),
								...(providerFailure.retryable !== undefined
									? { retryable: providerFailure.retryable }
									: {}),
							},
						},
						...(providerFailure.inputTokens !== undefined
							? { inputTokens: providerFailure.inputTokens }
							: {}),
						...(providerFailure.outputTokens !== undefined
							? { outputTokens: providerFailure.outputTokens }
							: {}),
					}
				: {}),
		});
		if (
			input.allowClarificationFallback &&
			!input.signal.aborted &&
			snapshot &&
			providerFailure?.stage === "structured-output"
		) {
			throw new SalesRequestPreviewNeedsClarification(
				generationId,
				snapshot.scope,
				snapshot.revision,
				snapshot.aiSelection.provider,
				snapshot.aiSelection.model,
				{
					...(providerFailure.inputTokens !== undefined
						? { inputTokens: providerFailure.inputTokens } : {}),
					...(providerFailure.outputTokens !== undefined
						? { outputTokens: providerFailure.outputTokens } : {}),
				},
			);
		}
		throw error;
	}
}

export function selectSalesRequestSettingId(activeIds: readonly number[]) {
	const selectedId = [...activeIds].sort((a, b) => a - b)[0];
	if (!selectedId)
		throw new Error("Active sales settings record is unavailable");
	return selectedId;
}
