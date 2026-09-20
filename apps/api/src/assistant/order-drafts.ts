import type { ConfigurationDatabase } from "@api/db/queries/sales-request-configuration";
import {
	type SalesRequestTelemetryDatabase,
	completeSalesRequestGenerationRun,
	createSalesRequestGenerationRun,
	markSalesRequestGenerationProviderAttempted,
} from "@api/db/queries/sales-request-telemetry";
import { getSalesRequestConfigurationContext } from "@api/services/sales-request-configuration-context";
import {
	SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
	createSalesRequestProvider,
} from "@api/services/sales-request-generation";
import { requireSalesRequestPilotAccess } from "@api/services/sales-request-pilot";
import {
	createSalesRequestPreview,
	selectSalesRequestSettingId,
} from "@api/services/sales-request-preview";
import { requireSalesRequestUsage } from "@api/services/sales-request-usage";
import { requireStorefrontQuoteCreationPermission } from "@api/utils/storefront-permissions";
import { salesRequestConfigurationCache } from "@gnd/cache/sales-request-configuration-cache";
import { db } from "@gnd/db";
import { AppError } from "@gnd/errors";
import {
	SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
	SALES_REQUEST_PROMPT_VERSION,
} from "@gnd/sales/sales-form/request-generation";
import {
	SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
	SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
	getSalesRequestAIRules,
	getSalesRequestCatalogSettings,
	getSalesRequestPilotSettings,
	getSalesRequestProviderBenchmarkApproval,
	isSalesRequestCatalogPublicationCurrent,
	isSalesRequestProviderBenchmarkApprovalCurrent,
} from "@gnd/settings";
import type { AssistantToolActor } from "./registry";
import { assertAssistantProviderEnabled, getAssistantApiKey } from "./provider-controls";
import type { AssistantRuntimeSelection } from "./runtime";

type AssistantDraftDatabase = typeof db & ConfigurationDatabase;
export type AssistantSalesRequestDraftDependencies = Parameters<
	typeof createSalesRequestPreview
>[1];
type AssistantDraftPreviewContext = Awaited<
	ReturnType<AssistantSalesRequestDraftDependencies["readSnapshot"]>
>;
type AssistantDraftTelemetry =
	AssistantSalesRequestDraftDependencies["telemetry"];

export type AssistantDraftRuntime = {
	authorize: (
		actor: AssistantToolActor,
		input: { type: "order" | "quote" },
		database: AssistantDraftDatabase,
	) => Promise<void>;
	reserveUsage: (actor: AssistantToolActor) => Promise<void>;
	readAuthoritySnapshot: (database: AssistantDraftDatabase, selection: AssistantRuntimeSelection) => Promise<{
		context: AssistantDraftPreviewContext;
		publication: {
			status: "failed" | "pending" | "published" | "stale";
			publishedRevision?: string;
		};
	}>;
	readAssistantSelection?: (database: AssistantDraftDatabase) => Promise<AssistantRuntimeSelection>;
	createProvider: (
		selection: Parameters<AssistantSalesRequestDraftDependencies["createProvider"]>[0],
		environment?: Readonly<Record<string, string | undefined>>,
	) => ReturnType<AssistantSalesRequestDraftDependencies["createProvider"]>;
	telemetry: {
		beginRun: (
			database: AssistantDraftDatabase,
			event: Parameters<AssistantDraftTelemetry["beginRun"]>[0] & {
				actorUserId: number;
			},
		) => Promise<void>;
		markProviderAttempted: (
			database: AssistantDraftDatabase,
			event: Parameters<AssistantDraftTelemetry["markProviderAttempted"]>[0] & {
				actorUserId: number;
			},
		) => Promise<void>;
		completeRun: (
			database: AssistantDraftDatabase,
			event: Parameters<AssistantDraftTelemetry["completeRun"]>[0] & {
				actorUserId: number;
			},
		) => Promise<void>;
	};
};

function currentDraftProviderBenchmarkRevision(input: {
	selection: AssistantRuntimeSelection;
	configurationRevision: string;
	providerBenchmark: Awaited<
		ReturnType<typeof getSalesRequestProviderBenchmarkApproval>
	>;
}) {
	const current = isSalesRequestProviderBenchmarkApprovalCurrent(
		input.providerBenchmark.approval,
		{
			...input.selection,
			configurationRevision: input.configurationRevision,
			promptVersion: SALES_REQUEST_PROMPT_VERSION,
			schemaVersion: SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
			corpusVersion: SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
			policyVersion: SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
		},
	);
	// A manual draft can be reviewed without approval, as with the standalone
	// preview. Revision zero prevents automatic finalization from claiming it.
	return current ? (input.providerBenchmark.approval?.revision ?? 0) : 0;
}

function requirePublishedDraftCatalog(input: {
	publication: {
		status: "failed" | "pending" | "published" | "stale";
		publishedRevision?: string;
	};
	configurationRevision: string;
}) {
	if (
		!isSalesRequestCatalogPublicationCurrent(
			input.publication,
			input.configurationRevision,
		)
	) {
		throw new AppError({
			code: "VALIDATION_FAILED",
			publicMessage:
				"The published Sales Request catalog is unavailable or out of date.",
			transportCode: "PRECONDITION_FAILED",
			reportable: false,
		});
	}
}

function requireAssistantSalesRequestKey(
	selection: AssistantRuntimeSelection,
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	const key = getAssistantApiKey(selection.provider, environment);
	if (!key) throw new Error("The assistant AI provider is not configured");
	return key;
}

const defaultAssistantDraftRuntime: AssistantDraftRuntime = {
	authorize: async (actor, input, database) => {
		await requireSalesRequestPilotAccess({
			db: database,
			userId: actor.userId,
			surface: input.type,
		});
		await requireStorefrontQuoteCreationPermission({
			db: database,
			userId: actor.userId,
		});
	},
	reserveUsage: (actor) => requireSalesRequestUsage(actor.userId),
	readAssistantSelection: async (database) => {
		const { getAssistantRuntimeConfiguration } = await import("./runtime-settings");
		return (await getAssistantRuntimeConfiguration(database)).selection;
	},
	readAuthoritySnapshot: (database, selection) =>
		database.$transaction(
			async (transaction) => {
				const rows = await transaction.settings.findMany({
					where: { type: "sales-settings", deletedAt: null },
					select: { id: true },
				});
				const settingId = selectSalesRequestSettingId(
					rows.map((row) => row.id),
				);
				const [snapshot, catalog, pilot, providerBenchmark, adminRules] =
					await Promise.all([
						getSalesRequestConfigurationContext(
							transaction,
							{ settingId },
							{ cache: salesRequestConfigurationCache },
						),
						getSalesRequestCatalogSettings(transaction, settingId),
						getSalesRequestPilotSettings(transaction, settingId),
						getSalesRequestProviderBenchmarkApproval(transaction, settingId),
						getSalesRequestAIRules(transaction, settingId),
					]);
				const benchmarkRevision = currentDraftProviderBenchmarkRevision({
					selection,
					configurationRevision: snapshot.revision,
					providerBenchmark,
				});
				if (
					pilot.source !== "persisted" ||
					!pilot.settings.enabled ||
					pilot.settings.revision <= 0
				) {
					throw new AppError({
						code: "VALIDATION_FAILED",
						publicMessage:
							"Sales Request pilot authority needs administrator review before generation.",
						transportCode: "PRECONDITION_FAILED",
						reportable: false,
					});
				}
				return {
					context: {
						...snapshot,
						adminRules: adminRules.rules
							.filter((rule) => rule.enabled)
							.map(({ id, title, instruction }) => ({
								id, title, instruction,
								...(id.startsWith("interpretation-warning:")
									? { suppressWarning: true } : {}),
							})),
						adminRulesRevision: adminRules.revision,
						aiSelection: selection,
						pilotSettingsRevision: pilot.settings.revision,
						providerBenchmarkApprovalRevision: benchmarkRevision,
					},
					publication: catalog.publication,
				};
			},
			{ isolationLevel: "RepeatableRead" },
		),
	createProvider: (selection, environment) =>
		createSalesRequestProvider({
			selection,
			apiKey: requireAssistantSalesRequestKey(selection, environment),
			maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
			maxOutputRepairs: 1,
		}),
	telemetry: {
		beginRun: async (database, event) => {
			await createSalesRequestGenerationRun(
				database as unknown as SalesRequestTelemetryDatabase,
				event,
			);
		},
		markProviderAttempted: async (database, event) => {
			await markSalesRequestGenerationProviderAttempted(
				database as unknown as SalesRequestTelemetryDatabase,
				event,
			);
		},
		completeRun: async (database, event) => {
			await completeSalesRequestGenerationRun(
				database as unknown as SalesRequestTelemetryDatabase,
				event,
			);
		},
	},
};

export function createAssistantSalesRequestPreviewDependencies(
	actor: AssistantToolActor,
	input: { type: "order" | "quote" },
	database: AssistantDraftDatabase = db as AssistantDraftDatabase,
	selection?: AssistantRuntimeSelection,
	runtime: AssistantDraftRuntime = defaultAssistantDraftRuntime,
	environment: Readonly<Record<string, string | undefined>> = process.env,
): AssistantSalesRequestDraftDependencies {
	let runSelection: AssistantRuntimeSelection | undefined = selection;
	return {
		authorize: () => runtime.authorize(actor, input, database),
		reserveUsage: () => runtime.reserveUsage(actor),
		readSnapshot: async () => {
			const configuredSelection = runtime.readAssistantSelection
				? await runtime.readAssistantSelection(database)
				: (await (await import("./runtime-settings")).getAssistantRuntimeConfiguration(database)).selection;
			if (runSelection && (
				runSelection.provider !== configuredSelection.provider ||
				runSelection.model !== configuredSelection.model
			)) {
				throw new Error("Assistant AI configuration changed. Generate the preview again.");
			}
			runSelection ??= configuredSelection;
			const authority = await runtime.readAuthoritySnapshot(database, runSelection);
			assertAssistantProviderEnabled(
				authority.context.aiSelection.provider,
				environment,
			);
			requirePublishedDraftCatalog({
				publication: authority.publication,
				configurationRevision: authority.context.revision,
			});
			return authority.context;
		},
		createProvider: (model) => runtime.createProvider(model, environment),
		telemetry: {
			beginRun: (event) =>
				runtime.telemetry.beginRun(database, {
					...event,
					actorUserId: actor.userId,
				}),
			markProviderAttempted: (event) =>
				runtime.telemetry.markProviderAttempted(database, {
					...event,
					actorUserId: actor.userId,
				}),
			completeRun: (event) =>
				runtime.telemetry.completeRun(database, {
					...event,
					actorUserId: actor.userId,
				}),
		},
	};
}

export async function createAssistantSalesRequestDraft(
	actor: AssistantToolActor,
	input: { type: "order" | "quote"; text: string },
	signal: AbortSignal = new AbortController().signal,
	database: AssistantDraftDatabase = db as AssistantDraftDatabase,
	runtime: AssistantDraftRuntime = defaultAssistantDraftRuntime,
	environment: Readonly<Record<string, string | undefined>> = process.env,
	selection?: AssistantRuntimeSelection,
) {
	return executeAssistantSalesRequestDraft(input, signal,
		createAssistantSalesRequestPreviewDependencies(actor, input, database, selection, runtime, environment));
}

export async function executeAssistantSalesRequestDraft(
	input: { type: "order" | "quote"; text: string },
	signal: AbortSignal,
	dependencies: AssistantSalesRequestDraftDependencies,
) {
	const result = await createSalesRequestPreview(
		{ text: input.text, images: [], signal },
		dependencies,
	);
	if (!result.provider || !result.model) {
		throw new Error("Sales Request provider identity is unavailable");
	}
	return {
		generationId: result.generationId,
		seed: result.seed,
		configurationScope: result.configurationScope,
		configurationRevision: result.configurationRevision,
		promptVersion: result.promptVersion,
		provider: result.provider,
		model: result.model,
		usage: {
			inputTokens: result.usage.inputTokens ?? null,
			outputTokens: result.usage.outputTokens ?? null,
		},
	};
}
