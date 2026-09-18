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
	type createSalesRequestPreview,
	selectSalesRequestSettingId,
} from "@api/services/sales-request-preview";
import { requireSalesRequestUsage } from "@api/services/sales-request-usage";
import { requireStorefrontQuoteCreationPermission } from "@api/utils/storefront-permissions";
import { salesRequestConfigurationCache } from "@gnd/cache/sales-request-configuration-cache";
import type { Database } from "@gnd/db";
import { AppError } from "@gnd/errors";
import {
	SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
	SALES_REQUEST_PROMPT_VERSION,
} from "@gnd/sales/sales-form/request-generation";
import {
	SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
	SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
	getSalesRequestAIRules,
	getSalesRequestAISettings,
	getSalesRequestCatalogSettings,
	getSalesRequestPilotSettings,
	getSalesRequestProviderBenchmarkApproval,
	isSalesRequestCatalogPublicationCurrent,
	isSalesRequestProviderBenchmarkApprovalCurrent,
} from "@gnd/settings";
import { TRPCError } from "@trpc/server";

type SaleType = "order" | "quote";
type PreviewDependencies = Parameters<typeof createSalesRequestPreview>[1];

export async function authorizeSalesRequestPreview(input: {
	db: Database;
	userId: number;
	type: SaleType;
}) {
	if (process.env.SALES_REQUEST_AI_ENABLED !== "true") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Sales request generation is not enabled.",
		});
	}
	await requireSalesRequestPilotAccess({
		db: input.db,
		userId: input.userId,
		surface: input.type,
	});
	await requireStorefrontQuoteCreationPermission({
		db: input.db,
		userId: input.userId,
	});
}

function currentProviderBenchmarkRevision(input: {
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
	// Zero records an unapproved manual draft; automatic finalization requires a
	// positive current approval through its independent server authority.
	return current && input.providerBenchmark.source === "persisted"
		? (input.providerBenchmark.approval?.revision ?? 0)
		: 0;
}

/** Shared native preview dependencies for pasted text and authorized mailbox input. */
export function createSalesRequestPreviewDependencies(input: {
	db: Database;
	userId: number;
	type: SaleType;
}): PreviewDependencies {
	return {
		authorize: () => authorizeSalesRequestPreview(input),
		reserveUsage: () => requireSalesRequestUsage(input.userId),
		readSnapshot: () =>
			input.db.$transaction(
				async (tx) => {
					const rows = await tx.settings.findMany({
						where: { type: "sales-settings", deletedAt: null },
						select: { id: true },
					});
					const settingId = selectSalesRequestSettingId(
						rows.map((row) => row.id),
					);
					const snapshot = await getSalesRequestConfigurationContext(
						tx,
						{ settingId },
						{ cache: salesRequestConfigurationCache },
					);
					const [aiSettings, pilot, providerBenchmark, catalog, adminRules] =
						await Promise.all([
							getSalesRequestAISettings(tx, settingId),
							getSalesRequestPilotSettings(tx, settingId),
							getSalesRequestProviderBenchmarkApproval(tx, settingId),
							getSalesRequestCatalogSettings(tx, settingId),
							getSalesRequestAIRules(tx, settingId),
						]);
					if (
						!isSalesRequestCatalogPublicationCurrent(
							catalog.publication,
							snapshot.revision,
						)
					) {
						throw new AppError({
							code: "VALIDATION_FAILED",
							publicMessage:
								"Regenerate the AI component configuration in Sales Settings before creating a request draft.",
							transportCode: "PRECONDITION_FAILED",
							reportable: false,
						});
					}
					if (aiSettings.source !== "persisted") {
						throw new TRPCError({
							code: "PRECONDITION_FAILED",
							message: "Sales request AI settings need administrator review.",
						});
					}
					const benchmarkRevision = currentProviderBenchmarkRevision({
						aiSettings,
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
						...snapshot,
						adminRules: adminRules.rules
							.filter((rule) => rule.enabled)
							.map(({ id, title, instruction }) => ({
								id,
								title,
								instruction,
								...(id.startsWith("interpretation-warning:")
									? { suppressWarning: true }
									: {}),
							})),
						adminRulesRevision: adminRules.revision,
						aiSelection: aiSettings.selection,
						pilotSettingsRevision: pilot.settings.revision,
						providerBenchmarkApprovalRevision: benchmarkRevision,
					};
				},
				{ isolationLevel: "RepeatableRead" },
			),
		createProvider: (selection) =>
			createSalesRequestProvider({
				selection,
				maxRetries: SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
				maxOutputRepairs: 1,
			}),
		telemetry: {
			beginRun: async (event) => {
				await createSalesRequestGenerationRun(
					input.db as unknown as SalesRequestTelemetryDatabase,
					{ ...event, actorUserId: input.userId },
				);
			},
			markProviderAttempted: async (event) => {
				await markSalesRequestGenerationProviderAttempted(
					input.db as unknown as SalesRequestTelemetryDatabase,
					{ ...event, actorUserId: input.userId },
				);
			},
			completeRun: async (event) => {
				await completeSalesRequestGenerationRun(
					input.db as unknown as SalesRequestTelemetryDatabase,
					{ ...event, actorUserId: input.userId },
				);
			},
		},
	};
}
