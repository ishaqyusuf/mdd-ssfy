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
	getSalesRequestAISettings,
	getSalesRequestCatalogSettings,
	getSalesRequestPilotSettings,
	getSalesRequestProviderBenchmarkApproval,
	isSalesRequestCatalogPublicationCurrent,
	isSalesRequestProviderBenchmarkApprovalCurrent,
} from "@gnd/settings";
import type { AssistantToolActor } from "./registry";

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
		input: { type: "order" | "quote"; text: string },
		database: AssistantDraftDatabase,
	) => Promise<void>;
	reserveUsage: (actor: AssistantToolActor) => Promise<void>;
	readAuthoritySnapshot: (database: AssistantDraftDatabase) => Promise<{
		context: AssistantDraftPreviewContext;
		publication: {
			status: "failed" | "pending" | "published" | "stale";
			publishedRevision?: string;
		};
	}>;
	createProvider: AssistantSalesRequestDraftDependencies["createProvider"];
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

function requireCurrentDraftProvider(input: {
	aiSettings: Awaited<ReturnType<typeof getSalesRequestAISettings>>;
	configurationRevision: string;
	providerBenchmark: Awaited<
		ReturnType<typeof getSalesRequestProviderBenchmarkApproval>
	>;
}) {
	const current = isSalesRequestProviderBenchmarkApprovalCurrent(
		input.providerBenchmark.approval,
		{
			...input.aiSettings.selection,
			configurationRevision: input.configurationRevision,
			promptVersion: SALES_REQUEST_PROMPT_VERSION,
			schemaVersion: SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
			corpusVersion: SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
			policyVersion: SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
		},
	);
	if (
		input.aiSettings.source !== "persisted" ||
		input.providerBenchmark.source !== "persisted" ||
		!current
	) {
		throw new AppError({
			code: "VALIDATION_FAILED",
			publicMessage:
				"The selected Sales Request provider and model need a current benchmark approval before generation.",
			transportCode: "PRECONDITION_FAILED",
			reportable: false,
		});
	}
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
	readAuthoritySnapshot: (database) =>
		database.$transaction(
			async (transaction) => {
				const rows = await transaction.settings.findMany({
					where: { type: "sales-settings", deletedAt: null },
					select: { id: true },
				});
				const settingId = selectSalesRequestSettingId(
					rows.map((row) => row.id),
				);
				const [snapshot, aiSettings, catalog, pilot, providerBenchmark] =
					await Promise.all([
						getSalesRequestConfigurationContext(
							transaction,
							{ settingId },
							{ cache: salesRequestConfigurationCache },
						),
						getSalesRequestAISettings(transaction, settingId),
						getSalesRequestCatalogSettings(transaction, settingId),
						getSalesRequestPilotSettings(transaction, settingId),
						getSalesRequestProviderBenchmarkApproval(transaction, settingId),
					]);
				requireCurrentDraftProvider({
					aiSettings,
					configurationRevision: snapshot.revision,
					providerBenchmark,
				});
				if (
					pilot.source !== "persisted" ||
					!pilot.settings.enabled ||
					pilot.settings.revision <= 0 ||
					!providerBenchmark.approval
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
						aiSelection: aiSettings.selection,
						pilotSettingsRevision: pilot.settings.revision,
						providerBenchmarkApprovalRevision:
							providerBenchmark.approval.revision,
					},
					publication: catalog.publication,
				};
			},
			{ isolationLevel: "RepeatableRead" },
		),
	createProvider: (selection) =>
		createSalesRequestProvider({
			selection,
			maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
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

export async function createAssistantSalesRequestDraft(
	actor: AssistantToolActor,
	input: { type: "order" | "quote"; text: string },
	signal: AbortSignal = new AbortController().signal,
	database: AssistantDraftDatabase = db as AssistantDraftDatabase,
	runtime: AssistantDraftRuntime = defaultAssistantDraftRuntime,
) {
	return executeAssistantSalesRequestDraft(input, signal, {
		authorize: () => runtime.authorize(actor, input, database),
		reserveUsage: () => runtime.reserveUsage(actor),
		readSnapshot: async () => {
			const authority = await runtime.readAuthoritySnapshot(database);
			requirePublishedDraftCatalog({
				publication: authority.publication,
				configurationRevision: authority.context.revision,
			});
			return authority.context;
		},
		createProvider: runtime.createProvider,
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
	});
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
