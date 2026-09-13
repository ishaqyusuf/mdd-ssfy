import { randomUUID } from "node:crypto";
import type { SalesRequestAISelection } from "@gnd/settings";
import type { getSalesRequestConfigurationSnapshot } from "../db/queries/sales-request-configuration";
import {
	type SalesRequestProvider,
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
type PreviewContext = Snapshot & { aiSelection: SalesRequestAISelection };

type PreviewPhase =
	| "authorization"
	| "snapshot"
	| "provider"
	| "usage"
	| "generation"
	| "snapshot-validation";

export type SalesRequestPreviewSnapshotIdentity = Pick<
	Snapshot,
	"settingId" | "scope" | "revision"
>;

async function notifyTelemetry<T>(
	callback: ((event: T) => Promise<void> | void) | undefined,
	event: T,
) {
	if (!callback) return;
	try {
		await Promise.race([
			Promise.resolve(callback(event)),
			new Promise<void>((resolve) => setTimeout(resolve, 250)),
		]);
	} catch {
		// Telemetry is best effort and must never change the preview contract.
	}
}

function statusForPreviewFailure(
	phase: PreviewPhase,
	signal: AbortSignal,
	failureStage?: SalesRequestGenerationCompleteEvent["failureStage"],
) {
	if (signal.aborted) return "cancelled" as const;
	if (phase === "usage") return "usage-denied" as const;
	if (phase === "provider") return "provider-error" as const;
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
		current.aiSelection.model !== expected.aiSelection.model
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
		telemetry?: SalesRequestGenerationTelemetry;
	},
) {
	const generationId = randomUUID();
	const startedAtMs = Date.now();
	let phase: PreviewPhase = "authorization";
	let snapshot: PreviewContext | undefined;
	let providerFailureStage: SalesRequestGenerationCompleteEvent["failureStage"];
	let lifecycleStarted = false;
	let lifecycleCompleted = false;

	const complete = async (
		event: Omit<
			SalesRequestGenerationCompleteEvent,
			"generationId" | "latencyMs" | "completedAt"
		>,
	) => {
		if (lifecycleCompleted || !lifecycleStarted) return;
		lifecycleCompleted = true;
		await notifyTelemetry(dependencies.telemetry?.onComplete, {
			...event,
			generationId,
			completedAt: new Date(),
			latencyMs: Math.max(0, Date.now() - startedAtMs),
		});
	};

	try {
		await dependencies.authorize();
		input.signal.throwIfAborted();
		phase = "snapshot";
		snapshot = await dependencies.readSnapshot();
		lifecycleStarted = true;
		await notifyTelemetry(dependencies.telemetry?.onStart, {
			generationId,
			scope: snapshot.scope,
			configurationRevision: snapshot.revision,
			provider: snapshot.aiSelection.provider,
			model: snapshot.aiSelection.model,
			hasText: Boolean(input.text.trim()),
			startedAt: new Date(startedAtMs),
		});

		phase = "provider";
		const provider = dependencies.createProvider(snapshot.aiSelection);
		phase = "usage";
		await dependencies.reserveUsage();
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
					providerFailureStage = diagnostic.stage;
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
				providerFailureStage,
			),
			...(snapshot
				? {
						provider: snapshot.aiSelection.provider,
						model: snapshot.aiSelection.model,
					}
				: {}),
			...(providerFailureStage ? { failureStage: providerFailureStage } : {}),
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
