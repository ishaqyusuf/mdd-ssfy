import {
	type ConfigurationDatabase,
	getSalesRequestGenerationAdminSettings,
} from "@api/db/queries/sales-request-configuration";
import {
	type SalesRequestTelemetryDatabase,
	completeSalesRequestGenerationRun,
	createSalesRequestGenerationRun,
	getSalesRequestGenerationPilotSummary,
	recordSalesRequestGenerationOutcome,
} from "@api/db/queries/sales-request-telemetry";
import {
	generateSalesRequestPreviewSchema,
	recordSalesRequestGenerationOutcomeSchema,
	salesRequestGenerationPilotSummarySchema,
	salesRequestPilotAccessSchema,
	setSalesRequestAISettingsSchema,
	setSalesRequestCatalogPolicySchema,
	setSalesRequestDefaultSchema,
	setSalesRequestPilotSettingsSchema,
	setSalesRequestProviderBenchmarkApprovalSchema,
	validateSalesRequestPreviewSchema,
} from "@api/schemas/sales-request";
import { getSalesRequestConfigurationContext } from "@api/services/sales-request-configuration-context";
import {
	SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER,
	createSalesRequestProvider,
	getSalesRequestProviderApiKey,
} from "@api/services/sales-request-generation";
import { requireSalesRequestSettingsAdmin } from "@api/services/sales-request-permissions";
import {
	getSalesRequestPilotAccess,
	requireActiveSalesRequestPilotActors,
	requireSalesRequestPilotAccess,
} from "@api/services/sales-request-pilot";
import {
	createSalesRequestPreview,
	selectSalesRequestSettingId,
} from "@api/services/sales-request-preview";
import { requireSalesRequestUsage } from "@api/services/sales-request-usage";
import { requireStorefrontQuoteCreationPermission } from "@api/utils/storefront-permissions";
import { salesRequestConfigurationCache } from "@gnd/cache/sales-request-configuration-cache";
import { AppError } from "@gnd/errors";
import { SALES_REQUEST_PROMPT_VERSION } from "@gnd/sales/sales-form/request-generation";
import {
	SALES_REQUEST_AI_PROVIDER_CATALOG,
	SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
	SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
	beginSalesRequestCatalogRegeneration,
	completeSalesRequestCatalogRegeneration,
	failSalesRequestCatalogRegeneration,
	getSalesRequestAISettings,
	getSalesRequestCatalogSettings,
	getSalesRequestPilotSettings,
	getSalesRequestProviderBenchmarkApproval,
	isSalesRequestProviderBenchmarkApprovalCurrent,
	updateSalesRequestAISettings,
	updateSalesRequestCatalogPolicy,
	updateSalesRequestGenerationDefault,
	updateSalesRequestPilotSettings,
	updateSalesRequestProviderBenchmarkApproval,
} from "@gnd/settings";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../init";

function getProviderOptions() {
	return SALES_REQUEST_AI_PROVIDER_CATALOG.map((provider) => ({
		...provider,
		configured: Boolean(
			process.env[
				SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER[provider.id]
			]?.trim(),
		),
	}));
}

type SalesRequestSettingsDb = Parameters<typeof getSalesRequestAISettings>[0] &
	ConfigurationDatabase;

const SALES_REQUEST_OUTPUT_SCHEMA_VERSION = 2;

function providerBenchmarkSurface(
	result: Awaited<ReturnType<typeof getSalesRequestAISettings>>,
	requestGeneration: Awaited<
		ReturnType<typeof getSalesRequestGenerationAdminSettings>
	>,
	providerBenchmark: Awaited<
		ReturnType<typeof getSalesRequestProviderBenchmarkApproval>
	>,
) {
	const current = isSalesRequestProviderBenchmarkApprovalCurrent(
		providerBenchmark.approval,
		{
			...result.selection,
			configurationRevision: requestGeneration.configurationRevision ?? "",
			promptVersion: SALES_REQUEST_PROMPT_VERSION,
			schemaVersion: SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
			corpusVersion: SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
			policyVersion: SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
		},
	);
	return { ...providerBenchmark, approved: current, current };
}

async function readAISettingsSurface(
	db: SalesRequestSettingsDb,
	settingId: number,
) {
	const [result, catalog, requestGeneration, pilot, providerBenchmark] =
		await Promise.all([
			getSalesRequestAISettings(db, settingId),
			getSalesRequestCatalogSettings(db, settingId),
			getSalesRequestGenerationAdminSettings(db, { settingId }),
			getSalesRequestPilotSettings(db, settingId),
			getSalesRequestProviderBenchmarkApproval(db, settingId),
		]);
	return {
		settingId: result.settingId,
		settings: result.selection,
		source: result.source,
		providers: getProviderOptions(),
		catalog: { policy: catalog.policy, publication: catalog.publication },
		providerBenchmark: providerBenchmarkSurface(
			result,
			requestGeneration,
			providerBenchmark,
		),
		requestGeneration: {
			...requestGeneration,
			featureEnabled: process.env.SALES_REQUEST_AI_ENABLED === "true",
			pilot: pilot.settings,
			pilotSource: pilot.source,
		},
	};
}

async function readAISettingsSurfaceWithSelection(
	db: SalesRequestSettingsDb,
	result: Awaited<ReturnType<typeof updateSalesRequestAISettings>>,
) {
	const [catalog, requestGeneration, pilot, providerBenchmark] =
		await Promise.all([
			getSalesRequestCatalogSettings(db, result.settingId),
			getSalesRequestGenerationAdminSettings(db, {
				settingId: result.settingId,
			}),
			getSalesRequestPilotSettings(db, result.settingId),
			getSalesRequestProviderBenchmarkApproval(db, result.settingId),
		]);
	return {
		changed: result.changed,
		settingId: result.settingId,
		settings: result.selection,
		source: result.source,
		providers: getProviderOptions(),
		catalog: { policy: catalog.policy, publication: catalog.publication },
		providerBenchmark: providerBenchmarkSurface(
			result,
			requestGeneration,
			providerBenchmark,
		),
		requestGeneration: {
			...requestGeneration,
			featureEnabled: process.env.SALES_REQUEST_AI_ENABLED === "true",
			pilot: pilot.settings,
			pilotSource: pilot.source,
		},
	};
}

export const salesRequestRouter = createTRPCRouter({
	getAISettings: protectedProcedure.query(async ({ ctx }) => {
		await requireSalesRequestSettingsAdmin(ctx);
		const rows = await ctx.db.settings.findMany({
			where: { type: "sales-settings", deletedAt: null },
			select: { id: true },
		});
		const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
		return readAISettingsSurface(ctx.db, settingId);
	}),
	updateAISettings: protectedProcedure
		.input(setSalesRequestAISettingsSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesRequestSettingsAdmin(ctx);
			try {
				getSalesRequestProviderApiKey(input.provider);
			} catch {
				throw new AppError({
					code: "PROVIDER_UNAVAILABLE",
					publicMessage: `Configure the ${input.provider} sales request API key before selecting it.`,
					transportCode: "PRECONDITION_FAILED",
					reportable: false,
				});
			}
			const rows = await ctx.db.settings.findMany({
				where: { type: "sales-settings", deletedAt: null },
				select: { id: true },
			});
			const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
			const result = await updateSalesRequestAISettings(ctx.db, {
				settingId,
				...input,
			});
			return readAISettingsSurfaceWithSelection(ctx.db, result);
		}),
	updateProviderBenchmarkApproval: protectedProcedure
		.input(setSalesRequestProviderBenchmarkApprovalSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesRequestSettingsAdmin(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			const rows = await ctx.db.settings.findMany({
				where: { type: "sales-settings", deletedAt: null },
				select: { id: true },
			});
			const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
			return updateSalesRequestProviderBenchmarkApproval(
				ctx.db,
				{
					...input,
					settingId,
					approvedByUserId: ctx.userId,
				},
				async (tx, decision) => {
					const current = await getSalesRequestConfigurationContext(tx, {
						settingId,
					});
					if (
						decision.configurationRevision !== current.revision ||
						decision.promptVersion !== SALES_REQUEST_PROMPT_VERSION ||
						decision.schemaVersion !== SALES_REQUEST_OUTPUT_SCHEMA_VERSION ||
						decision.corpusVersion !==
							SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION ||
						decision.policyVersion !==
							SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION
					) {
						throw new TRPCError({
							code: "CONFLICT",
							message:
								"Benchmark evidence does not match the current Sales Request configuration, prompt, schema, corpus, and policy.",
						});
					}
				},
			);
		}),
	updateCatalogPolicy: protectedProcedure
		.input(setSalesRequestCatalogPolicySchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesRequestSettingsAdmin(ctx);
			const rows = await ctx.db.settings.findMany({
				where: { type: "sales-settings", deletedAt: null },
				select: { id: true },
			});
			const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
			return updateSalesRequestCatalogPolicy(ctx.db, {
				settingId,
				policy: input,
			});
		}),
	getPilotAccess: protectedProcedure
		.input(salesRequestPilotAccessSchema)
		.query(async ({ ctx, input }) => {
			const access = await getSalesRequestPilotAccess({
				db: ctx.db,
				userId: ctx.userId,
				surface: input.type,
			});
			if (!access.eligible) return access;
			try {
				await requireStorefrontQuoteCreationPermission({
					db: ctx.db,
					userId: ctx.userId,
				});
				return access;
			} catch (error) {
				if (
					error instanceof TRPCError &&
					(error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED")
				) {
					return { ...access, eligible: false, reason: "permission" as const };
				}
				throw error;
			}
		}),
	updatePilotSettings: protectedProcedure
		.input(setSalesRequestPilotSettingsSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesRequestSettingsAdmin(ctx);
			if (input.enabled) {
				await requireActiveSalesRequestPilotActors({
					db: ctx.db,
					cohortUserIds: input.cohortUserIds,
					reviewerUserIds: input.reviewerUserIds,
				});
			}
			const rows = await ctx.db.settings.findMany({
				where: { type: "sales-settings", deletedAt: null },
				select: { id: true },
			});
			const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
			return updateSalesRequestPilotSettings(ctx.db, {
				settingId,
				...input,
			});
		}),
	regenerateConfiguration: protectedProcedure.mutation(async ({ ctx }) => {
		await requireSalesRequestSettingsAdmin(ctx);
		const rows = await ctx.db.settings.findMany({
			where: { type: "sales-settings", deletedAt: null },
			select: { id: true },
		});
		const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
		const pending = await beginSalesRequestCatalogRegeneration(ctx.db, {
			settingId,
			requestedBy: ctx.userId,
		});
		const generation = pending.publication.generation;
		try {
			const built = await ctx.db.$transaction(
				async (tx) => {
					const snapshot = await getSalesRequestConfigurationContext(tx, {
						settingId,
					});
					await salesRequestConfigurationCache.set({
						scope: snapshot.scope,
						revision: snapshot.revision,
						content: snapshot.configurationJson,
					});
					return {
						revision: snapshot.revision,
						counts: {
							...((
								snapshot as typeof snapshot & {
									diagnostics?: Record<string, number>;
								}
							).diagnostics ?? {
								finalTupleCount: snapshot.configuration.steps.reduce(
									(total, step) => total + step.components.length,
									0,
								),
							}),
							serviceNameCount: snapshot.configuration.serviceNames.length,
						},
					};
				},
				{ isolationLevel: "RepeatableRead" },
			);
			return completeSalesRequestCatalogRegeneration(ctx.db, {
				settingId,
				generation,
				publishedRevision: built.revision,
				counts: built.counts,
			});
		} catch (error) {
			await failSalesRequestCatalogRegeneration(ctx.db, {
				settingId,
				generation,
				error:
					error instanceof Error ? error.message : "Configuration build failed",
			});
			throw error;
		}
	}),
	generatePreview: protectedProcedure
		.input(generateSalesRequestPreviewSchema)
		.mutation(async ({ ctx, input, signal }) => {
			if (process.env.SALES_REQUEST_AI_ENABLED !== "true") {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Sales request generation is not enabled.",
				});
			}
			let telemetryStart: Promise<unknown> | null = null;
			return createSalesRequestPreview(
				{
					text: input.text,
					images: [],
					signal: signal ?? new AbortController().signal,
				},
				{
					authorize: async () => {
						await requireSalesRequestPilotAccess({
							db: ctx.db,
							userId: ctx.userId,
							surface: input.type,
						});
						await requireStorefrontQuoteCreationPermission({
							db: ctx.db,
							userId: ctx.userId,
						});
					},
					reserveUsage: () => requireSalesRequestUsage(ctx.userId),
					readSnapshot: () =>
						ctx.db.$transaction(
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
								const aiSettings = await getSalesRequestAISettings(
									tx,
									settingId,
								);
								if (aiSettings.source === "invalid") {
									throw new TRPCError({
										code: "PRECONDITION_FAILED",
										message:
											"Sales request AI settings need administrator review.",
									});
								}
								return { ...snapshot, aiSelection: aiSettings.selection };
							},
							{ isolationLevel: "RepeatableRead" },
						),
					createProvider: (selection) =>
						createSalesRequestProvider({ selection }),
					telemetry: {
						onStart: async (event) => {
							telemetryStart = createSalesRequestGenerationRun(
								ctx.db as unknown as SalesRequestTelemetryDatabase,
								{ ...event, actorUserId: ctx.userId },
							);
							await telemetryStart;
						},
						onComplete: async (event) => {
							await telemetryStart?.catch(() => undefined);
							await completeSalesRequestGenerationRun(
								ctx.db as unknown as SalesRequestTelemetryDatabase,
								{ ...event, actorUserId: ctx.userId },
							);
						},
					},
				},
			);
		}),
	validatePreview: protectedProcedure
		.input(validateSalesRequestPreviewSchema)
		.mutation(async ({ ctx, input }) => {
			if (process.env.SALES_REQUEST_AI_ENABLED !== "true") {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Sales request generation is not enabled.",
				});
			}
			await requireSalesRequestPilotAccess({
				db: ctx.db,
				userId: ctx.userId,
				surface: input.type,
			});
			await requireStorefrontQuoteCreationPermission({
				db: ctx.db,
				userId: ctx.userId,
			});
			const current = await ctx.db.$transaction(
				async (tx) => {
					const rows = await tx.settings.findMany({
						where: { type: "sales-settings", deletedAt: null },
						select: { id: true },
					});
					const settingId = selectSalesRequestSettingId(
						rows.map((row) => row.id),
					);
					const [snapshot, aiSettings] = await Promise.all([
						getSalesRequestConfigurationContext(tx, { settingId }),
						getSalesRequestAISettings(tx, settingId),
					]);
					return {
						configurationScope: snapshot.scope,
						configurationRevision: snapshot.revision,
						provider: aiSettings.selection.provider,
						model: aiSettings.selection.model,
					};
				},
				{ isolationLevel: "RepeatableRead" },
			);
			if (
				current.configurationScope !== input.configurationScope ||
				current.configurationRevision !== input.configurationRevision ||
				current.provider !== input.provider ||
				current.model !== input.model
			) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Sales configuration changed after generation. Generate the preview again.",
				});
			}
			return { type: input.type, ...current };
		}),
	setDefault: protectedProcedure
		.input(setSalesRequestDefaultSchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesRequestSettingsAdmin(ctx);
			const rows = await ctx.db.settings.findMany({
				where: { type: "sales-settings", deletedAt: null },
				select: { id: true },
			});
			const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
			return updateSalesRequestGenerationDefault(ctx.db, {
				settingId,
				rootUid: input.rootUid,
				stepUid: input.stepUid,
				componentUid: input.componentUid ?? null,
			});
		}),
	recordOutcome: protectedProcedure
		.input(recordSalesRequestGenerationOutcomeSchema)
		.mutation(async ({ ctx, input }) =>
			recordSalesRequestGenerationOutcome(
				ctx.db as unknown as SalesRequestTelemetryDatabase,
				{ ...input, actorUserId: ctx.userId },
			),
		),
	pilotSummary: protectedProcedure
		.input(salesRequestGenerationPilotSummarySchema)
		.query(async ({ ctx, input }) => {
			await requireSalesRequestSettingsAdmin(ctx);
			return getSalesRequestGenerationPilotSummary(
				ctx.db as unknown as SalesRequestTelemetryDatabase,
				input,
			);
		}),
});
