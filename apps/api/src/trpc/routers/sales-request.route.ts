import {
	type ConfigurationDatabase,
	getSalesRequestGenerationAdminSettings,
} from "@api/db/queries/sales-request-configuration";
import {
	type SalesRequestFinalSaveExceptionDatabase,
	listSalesRequestFinalSaveExceptions,
} from "@api/db/queries/sales-request-exceptions";
import {
	type SalesRequestPilotReviewDatabase,
	getLatestSalesRequestPilotReviewDecisions,
	recordSalesRequestPilotReviewDecision,
} from "@api/db/queries/sales-request-pilot-review";
import {
	type SalesRequestTelemetryDatabase,
	completeSalesRequestGenerationRun,
	createSalesRequestGenerationRun,
	getSalesRequestGenerationPilotSummary,
	markSalesRequestGenerationProviderAttempted,
	recordSalesRequestGenerationOutcome,
} from "@api/db/queries/sales-request-telemetry";
import {
	generateSalesRequestPreviewSchema,
	listSalesRequestFinalSaveExceptionsSchema,
	recordSalesRequestGenerationOutcomeSchema,
	recordSalesRequestPilotReviewDecisionSchema,
	salesRequestGenerationPilotSummarySchema,
	salesRequestPilotAccessSchema,
	setSalesRequestAISettingsSchema,
	setSalesRequestCatalogPolicySchema,
	setSalesRequestDefaultSchema,
	setSalesRequestMailboxPolicySchema,
	setSalesRequestPilotReviewPolicySchema,
	setSalesRequestPilotSettingsSchema,
	setSalesRequestProviderBenchmarkApprovalSchema,
	validateSalesRequestPreviewSchema,
} from "@api/schemas/sales-request";
import { getSalesRequestConfigurationContext } from "@api/services/sales-request-configuration-context";
import {
	SALES_REQUEST_AI_CREDENTIAL_ENV_BY_PROVIDER,
	SALES_REQUEST_LIVE_EVALUATION_MAX_RETRIES,
	createSalesRequestProvider,
	getSalesRequestProviderApiKey,
} from "@api/services/sales-request-generation";
import { requireActiveSalesRequestMailboxEmployees } from "@api/services/sales-request-mailbox-employees";
import { requireSalesRequestSettingsAdmin } from "@api/services/sales-request-permissions";
import {
	getSalesRequestPilotAccess,
	requireActiveSalesRequestPilotActors,
	requireSalesRequestPilotAccess,
} from "@api/services/sales-request-pilot";
import { evaluateSalesRequestPilotAdvancement } from "@api/services/sales-request-pilot-advancement";
import { evaluateSalesRequestPilotThresholds } from "@api/services/sales-request-pilot-evidence";
import {
	createSalesRequestPilotEvidenceDigest,
	createSalesRequestPilotEvidenceSignoff,
	createSalesRequestPilotReviewEvidenceRecord,
	createSalesRequestPilotReviewPolicyDigest,
} from "@api/services/sales-request-pilot-review";
import { resolveSalesRequestPilotReviewAuthority } from "@api/services/sales-request-pilot-review-authority";
import {
	createSalesRequestPreview,
	selectSalesRequestSettingId,
} from "@api/services/sales-request-preview";
import { requireSalesRequestUsage } from "@api/services/sales-request-usage";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import { requireStorefrontQuoteCreationPermission } from "@api/utils/storefront-permissions";
import { salesRequestConfigurationCache } from "@gnd/cache/sales-request-configuration-cache";
import { AppError } from "@gnd/errors";
import {
	SALES_REQUEST_OUTPUT_SCHEMA_VERSION,
	SALES_REQUEST_PROMPT_VERSION,
} from "@gnd/sales/sales-form/request-generation";
import {
	SALES_REQUEST_AI_PROVIDER_CATALOG,
	SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
	SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
	beginSalesRequestCatalogRegeneration,
	completeSalesRequestCatalogRegeneration,
	failSalesRequestCatalogRegeneration,
	getSalesRequestAISettings,
	getSalesRequestCatalogSettings,
	getSalesRequestMailboxPolicy,
	getSalesRequestPilotReviewPolicy,
	getSalesRequestPilotSettings,
	getSalesRequestProviderBenchmarkApproval,
	isSalesRequestCatalogPublicationCurrent,
	isSalesRequestProviderBenchmarkApprovalCurrent,
	updateSalesRequestAISettings,
	updateSalesRequestCatalogPolicy,
	updateSalesRequestGenerationDefault,
	updateSalesRequestMailboxPolicy,
	updateSalesRequestPilotReviewPolicy,
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

function requireCurrentProviderBenchmark(input: {
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

function isUniqueConstraintError(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "P2002"
	);
}

async function readAISettingsSurface(
	db: SalesRequestSettingsDb,
	settingId: number,
) {
	const [
		result,
		catalog,
		requestGeneration,
		pilot,
		providerBenchmark,
		pilotReviewPolicy,
		mailboxPolicy,
	] = await Promise.all([
		getSalesRequestAISettings(db, settingId),
		getSalesRequestCatalogSettings(db, settingId),
		getSalesRequestGenerationAdminSettings(db, { settingId }),
		getSalesRequestPilotSettings(db, settingId),
		getSalesRequestProviderBenchmarkApproval(db, settingId),
		getSalesRequestPilotReviewPolicy(db, settingId),
		getSalesRequestMailboxPolicy(db, settingId),
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
			pilotReviewPolicy: pilotReviewPolicy.policy,
			pilotReviewPolicySource: pilotReviewPolicy.source,
			mailbox: mailboxPolicy.policy,
			mailboxSource: mailboxPolicy.source,
		},
	};
}

async function readAISettingsSurfaceWithSelection(
	db: SalesRequestSettingsDb,
	result: Awaited<ReturnType<typeof updateSalesRequestAISettings>>,
) {
	const [
		catalog,
		requestGeneration,
		pilot,
		providerBenchmark,
		pilotReviewPolicy,
		mailboxPolicy,
	] = await Promise.all([
		getSalesRequestCatalogSettings(db, result.settingId),
		getSalesRequestGenerationAdminSettings(db, {
			settingId: result.settingId,
		}),
		getSalesRequestPilotSettings(db, result.settingId),
		getSalesRequestProviderBenchmarkApproval(db, result.settingId),
		getSalesRequestPilotReviewPolicy(db, result.settingId),
		getSalesRequestMailboxPolicy(db, result.settingId),
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
			pilotReviewPolicy: pilotReviewPolicy.policy,
			pilotReviewPolicySource: pilotReviewPolicy.source,
			mailbox: mailboxPolicy.policy,
			mailboxSource: mailboxPolicy.source,
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
	updateMailboxPolicy: protectedProcedure
		.input(setSalesRequestMailboxPolicySchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesRequestSettingsAdmin(ctx);
			if (input.enabled) {
				await requireActiveSalesRequestMailboxEmployees({
					db: ctx.db,
					userIds: input.eligibleUserIds,
				});
			}
			const rows = await ctx.db.settings.findMany({
				where: { type: "sales-settings", deletedAt: null },
				select: { id: true },
			});
			const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
			return updateSalesRequestMailboxPolicy(ctx.db, {
				settingId,
				...input,
			});
		}),
	updatePilotReviewPolicy: protectedProcedure
		.input(setSalesRequestPilotReviewPolicySchema)
		.mutation(async ({ ctx, input }) => {
			await requireSalesRequestSettingsAdmin(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			const rows = await ctx.db.settings.findMany({
				where: { type: "sales-settings", deletedAt: null },
				select: { id: true },
			});
			const settingId = selectSalesRequestSettingId(rows.map((row) => row.id));
			const digest = createSalesRequestPilotReviewPolicyDigest(input);
			return updateSalesRequestPilotReviewPolicy(
				ctx.db,
				{
					...input,
					settingId,
					changedByUserId: ctx.userId,
					digest,
				},
				(candidate) => {
					if (
						candidate.digest !==
						createSalesRequestPilotReviewPolicyDigest({
							provider: candidate.provider,
							model: candidate.model,
							thresholds: candidate.thresholds,
						})
					) {
						throw new TRPCError({
							code: "CONFLICT",
							message: "Pilot review policy digest verification failed.",
						});
					}
				},
			);
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
								const [aiSettings, pilot, providerBenchmark] =
									await Promise.all([
										getSalesRequestAISettings(tx, settingId),
										getSalesRequestPilotSettings(tx, settingId),
										getSalesRequestProviderBenchmarkApproval(tx, settingId),
									]);
								if (aiSettings.source === "invalid") {
									throw new TRPCError({
										code: "PRECONDITION_FAILED",
										message:
											"Sales request AI settings need administrator review.",
									});
								}
								requireCurrentProviderBenchmark({
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
									...snapshot,
									aiSelection: aiSettings.selection,
									pilotSettingsRevision: pilot.settings.revision,
									providerBenchmarkApprovalRevision:
										providerBenchmark.approval.revision,
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
						beginRun: async (event) => {
							await createSalesRequestGenerationRun(
								ctx.db as unknown as SalesRequestTelemetryDatabase,
								{ ...event, actorUserId: ctx.userId },
							);
						},
						markProviderAttempted: async (event) => {
							await markSalesRequestGenerationProviderAttempted(
								ctx.db as unknown as SalesRequestTelemetryDatabase,
								{ ...event, actorUserId: ctx.userId },
							);
						},
						completeRun: async (event) => {
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
					const [snapshot, aiSettings, catalog, providerBenchmark] =
						await Promise.all([
							getSalesRequestConfigurationContext(tx, { settingId }),
							getSalesRequestAISettings(tx, settingId),
							getSalesRequestCatalogSettings(tx, settingId),
							getSalesRequestProviderBenchmarkApproval(tx, settingId),
						]);
					if (
						!isSalesRequestCatalogPublicationCurrent(
							catalog.publication,
							snapshot.revision,
						)
					) {
						throw new TRPCError({
							code: "CONFLICT",
							message: "The published Sales Request catalog changed.",
						});
					}
					requireCurrentProviderBenchmark({
						aiSettings,
						configurationRevision: snapshot.revision,
						providerBenchmark,
					});
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
	listFinalSaveExceptions: protectedProcedure
		.input(listSalesRequestFinalSaveExceptionsSchema)
		.query(async ({ ctx, input }) => {
			await requireAnyOperationalPermission(
				ctx,
				["editOrders"],
				"You do not have permission to review sales request save exceptions.",
			);
			return listSalesRequestFinalSaveExceptions(
				ctx.db as unknown as SalesRequestFinalSaveExceptionDatabase,
				{
					actorUserId: ctx.userId,
					limit: input.limit,
				},
			);
		}),
	recordPilotReviewDecision: protectedProcedure
		.input(recordSalesRequestPilotReviewDecisionSchema)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			try {
				return await ctx.db.$transaction(
					async (tx) => {
						const reviewAuthority =
							await resolveSalesRequestPilotReviewAuthority({
								db: tx,
								featureEnabled: process.env.SALES_REQUEST_AI_ENABLED === "true",
								reviewerUserId: ctx.userId,
							});
						const summary = await getSalesRequestGenerationPilotSummary(
							tx as unknown as SalesRequestTelemetryDatabase,
							{
								periodStart: input.periodStart,
								authority: reviewAuthority.baseAuthority,
							},
						);
						if (
							summary.period.from === null ||
							summary.period.toExclusive === null ||
							summary.authority.status !== "matched" ||
							!summary.coverage.complete
						) {
							throw new TRPCError({
								code: "PRECONDITION_FAILED",
								message:
									"This pilot period is not closed, complete, and authority-matched.",
							});
						}
						const evidence = createSalesRequestPilotReviewEvidenceRecord({
							periodStart: input.periodStart,
							periodEnd: summary.period.toExclusive.toISOString().slice(0, 10),
							evidence: summary.evidence,
						});
						const evidenceDigest =
							createSalesRequestPilotEvidenceDigest(evidence);
						const signoff = createSalesRequestPilotEvidenceSignoff({
							reviewerUserId: ctx.userId,
							reviewedAt: new Date(),
							evidenceDigest,
							authorityMatched: true,
							values: input.signoff,
						});
						const thresholdEvaluation = evaluateSalesRequestPilotThresholds(
							summary.evidence,
							{
								thresholds: reviewAuthority.reviewPolicy.policy.thresholds,
								signoff,
							},
						);
						if (thresholdEvaluation.status === "not-evaluable") {
							throw new TRPCError({
								code: "PRECONDITION_FAILED",
								message: `Pilot evidence is not evaluable: ${thresholdEvaluation.blockers.join(", ")}`,
							});
						}
						const decision = thresholdEvaluation.status;
						if (input.decision !== decision) {
							throw new TRPCError({
								code: "CONFLICT",
								message: `The server-derived pilot review decision is ${decision}.`,
							});
						}
						await recordSalesRequestPilotReviewDecision(
							tx as unknown as SalesRequestPilotReviewDatabase,
							{
								settingId: reviewAuthority.settingId,
								periodStart: summary.period.from,
								periodEnd: summary.period.toExclusive,
								decision,
								authority: reviewAuthority.currentAuthority,
								evidence,
								evidenceDigest,
								thresholdPolicy: reviewAuthority.reviewPolicy.policy.thresholds,
								signoff,
							},
						);
						const periodDecisions =
							await getLatestSalesRequestPilotReviewDecisions(
								tx as unknown as SalesRequestPilotReviewDatabase,
								reviewAuthority.settingId,
							);
						return {
							periodStart: input.periodStart,
							periodEnd: evidence.periodEnd,
							decision,
							thresholdEvaluation,
							advancement: evaluateSalesRequestPilotAdvancement({
								periodDecisions,
								currentAuthority: reviewAuthority.currentAuthority,
							}),
						};
					},
					{ isolationLevel: "Serializable" },
				);
			} catch (error) {
				if (isUniqueConstraintError(error)) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "This pilot period already has an immutable review.",
					});
				}
				throw error;
			}
		}),
	pilotSummary: protectedProcedure
		.input(salesRequestGenerationPilotSummarySchema)
		.query(async ({ ctx, input }) => {
			await requireSalesRequestSettingsAdmin(ctx);
			return ctx.db.$transaction(
				async (tx) => {
					const reviewAuthority = await resolveSalesRequestPilotReviewAuthority(
						{
							db: tx,
							featureEnabled: process.env.SALES_REQUEST_AI_ENABLED === "true",
						},
					);
					const summary = await getSalesRequestGenerationPilotSummary(
						tx as unknown as SalesRequestTelemetryDatabase,
						{
							...input,
							authority: reviewAuthority.baseAuthority,
							authorityBlockers: reviewAuthority.authorityBlockers,
						},
					);
					let periodDecisions = [] as Awaited<
						ReturnType<typeof getLatestSalesRequestPilotReviewDecisions>
					>;
					let invalidPeriodDecision = false;
					try {
						periodDecisions = await getLatestSalesRequestPilotReviewDecisions(
							tx as unknown as SalesRequestPilotReviewDatabase,
							reviewAuthority.settingId,
						);
					} catch {
						invalidPeriodDecision = true;
					}
					const advancement = invalidPeriodDecision
						? {
								eligible: false,
								blockers: ["invalid-period-decision"] as const,
							}
						: evaluateSalesRequestPilotAdvancement({
								periodDecisions,
								currentAuthority: reviewAuthority.currentAuthority,
							});
					return {
						...summary,
						eligibleForAdvancement: advancement.eligible,
						advancement,
						reviewedPeriods: periodDecisions.map((period) => ({
							periodStart: period.periodStart,
							periodEnd: period.periodEnd,
							decision: period.decision,
							reviewerUserId: period.reviewerUserId,
							reviewedAt: period.reviewedAt,
							authorityDigest: period.authorityDigest,
							evidenceDigest: period.evidenceDigest,
							thresholdPolicyVersion: period.thresholdPolicyVersion,
							thresholdPolicyDigest: period.thresholdPolicyDigest,
						})),
						reviewPolicy: reviewAuthority.reviewPolicy,
					};
				},
				{ isolationLevel: "RepeatableRead" },
			);
		}),
});
