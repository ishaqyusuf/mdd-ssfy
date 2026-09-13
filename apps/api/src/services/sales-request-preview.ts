import { randomUUID } from "node:crypto";
import {
	SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
	SALES_REQUEST_PROMPT_VERSION,
} from "@gnd/sales/sales-form/request-generation";
import type { SalesRequestAISelection } from "@gnd/settings";
import type { getSalesRequestConfigurationSnapshot } from "../db/queries/sales-request-configuration";
import {
	type SalesRequestProvider,
	type SalesRequestProviderFailureDiagnostic,
	generateNewSalesFormSeed,
} from "./sales-request-generation";
import type { SalesRequestImage } from "./sales-request-images";
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
	aiSelection: SalesRequestAISelection;
	pilotSettingsRevision: number;
	providerBenchmarkApprovalRevision: number;
};

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
	input: {
		text: string;
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
		await complete({
			status: "succeeded",
			provider: result.provider ?? snapshot.aiSelection.provider,
			model: result.model ?? snapshot.aiSelection.model,
			promptVersion: result.promptVersion,
			schemaVersion: result.seed.schemaVersion,
			seedDigest: createSalesRequestSeedDigest({
				seed: result.seed,
				generationId,
				configurationScope: snapshot.scope,
				configurationRevision: snapshot.revision,
			}),
			...(result.usage.inputTokens !== undefined
				? { inputTokens: result.usage.inputTokens }
				: {}),
			...(result.usage.outputTokens !== undefined
				? { outputTokens: result.usage.outputTokens }
				: {}),
			issueCounts: countSalesRequestGenerationIssues(result.seed),
		});
		return {
			...result,
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
						...(providerFailure.inputTokens !== undefined
							? { inputTokens: providerFailure.inputTokens }
							: {}),
						...(providerFailure.outputTokens !== undefined
							? { outputTokens: providerFailure.outputTokens }
							: {}),
					}
				: {}),
		});
		throw error;
	}
}

export function selectSalesRequestSettingId(activeIds: readonly number[]) {
	const selectedId = [...activeIds].sort((a, b) => a - b)[0];
	if (!selectedId)
		throw new Error("Active sales settings record is unavailable");
	return selectedId;
}
