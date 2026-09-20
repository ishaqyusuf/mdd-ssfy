import {
	assistantDirectPermissionSchema,
	getAssistantAccessState,
	listAssistantPermissions,
	setAssistantDirectPermission,
} from "@api/assistant/access-governance";
import { resolveAssistantActor } from "@api/assistant/actor";
import { getAssistantSalesDraftHandoff } from "@api/assistant/sales-draft-handoff";
import {
	answerAssistantSalesRequest,
	answerAssistantSalesRequestSchema,
	readAssistantSalesRequestSession,
	startAssistantSalesRequest,
	startAssistantSalesRequestSchema,
} from "@api/assistant/sales-request-session";
import { reportAssistantClientFailure } from "@api/assistant/client-diagnostics";
import { assistantDiagnosticUiState } from "@api/assistant/diagnostic-rollout";
import { getAssistantCaptureHealth } from "@api/assistant/capture-health";
import {
	AssistantReadRetryUnavailable,
	executeAssistantReadRetry,
} from "@api/assistant/manual-read-retry";
import { runAssistantOperation } from "@api/assistant/operation-diagnostics";
import { assistantClientDiagnosticSchema } from "@api/assistant/diagnostic-contract";
import {
	assistantDiagnosticFilterSchema,
	assistantDiagnosticReferenceSchema,
	assistantDiagnosticReviewSchema,
} from "@api/assistant/diagnostic-details";
import {
	assistantProposalCreateSchema,
	assistantProposalDecisionSchema,
	createAssistantActionProposal,
	decideAssistantActionProposal,
	getAssistantActionProposal,
} from "@api/assistant/approvals";
import { analyzeAssistantFeatureRequest } from "@api/assistant/feature-analysis";
import { deliverAssistantFeatureNotification } from "@api/assistant/feature-notifications";
import {
	assistantCapabilityReleaseSchema,
	assistantFeatureRequestStatuses,
	assistantFeatureRequestSubmitSchema,
	assistantFeatureTriageSchema,
	listAssistantFeatureRequestsForTriage,
	listMyAssistantFeatureRequests,
	prepareAssistantFeatureRequest,
	processNextAssistantFeatureAnalysis,
	publishAssistantCapabilityRelease,
	retryAssistantFeatureAnalysis,
	submitAssistantFeatureRequest,
	triageAssistantFeatureRequest,
	unsubscribeAssistantFeatureRequest,
} from "@api/assistant/feature-requests";
import {
	getAssistantConnectedApps,
	getAssistantConnectorManagementUrl,
} from "@api/assistant/integrations";
import {
	AssistantRuntimeSettingConflictError,
	getAssistantRuntimeSettingsSurface,
	updateAssistantRuntimeSettings,
} from "@api/assistant/runtime-settings";
import {
	assistantPreferenceUpdateSchema,
	assistantRecipeParametersSchema,
	assistantSavedActionCreateSchema,
	assistantSavedActionFromRunSchema,
	assistantSavedActionUpdateSchema,
	createAssistantPersonalMemory,
	createAssistantSavedAction,
	duplicateAssistantSavedAction,
	executeAssistantSavedAction,
	getAssistantPreferences,
	getAssistantSaveActionEligibility,
	listAssistantPersonalMemories,
	listAssistantSavedActions,
	persistAssistantReadRetryResult,
	removeAssistantPersonalMemory,
	removeAssistantSavedAction,
	reorderAssistantSavedActions,
	saveAssistantActionFromRun,
	updateAssistantPreferences,
	updateAssistantSavedAction,
} from "@api/assistant/saved-actions";
import {
	assistantSuggestionCatalog,
	getAssistantSuggestions,
} from "@api/assistant/suggestions";
import {
	AssistantConversationAccessError,
	archiveAssistantConversation,
	createAssistantConversation,
	getAssistantConversation,
	getAssistantConversationRetentionPolicy,
	getAssistantDiagnostic,
	listAssistantDiagnostics,
	reviewAssistantDiagnostic,
	getAssistantQuotaStatus,
	listAssistantConversations,
	listAssistantQuotaPolicies,
	listAssistantUsageReconciliationQueue,
	reconcileAssistantUsageEvent,
	setAssistantUserQuotaPolicy,
	softDeleteAssistantConversation,
} from "@gnd/db/queries";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

async function actorOrThrow(ctx: {
	db: Parameters<typeof resolveAssistantActor>[0];
	userId: number;
}) {
	const actor = await resolveAssistantActor(ctx.db, ctx.userId);
	if (!actor) throw new TRPCError({ code: "FORBIDDEN" });
	return actor;
}

async function featureAdminOrThrow(ctx: {
	db: Parameters<typeof resolveAssistantActor>[0];
	userId: number;
}) {
	const user = await ctx.db.users.findFirst({
		where: { id: ctx.userId, deletedAt: null, accessRevokedAt: null },
		select: {
			roles: {
				where: {
					deletedAt: null,
					organization: { deletedAt: null },
					role: { deletedAt: null },
				},
				select: { role: { select: { name: true } } },
			},
		},
	});
	if (
		!user?.roles.some(
			(entry) => entry.role?.name?.toLowerCase() === "super admin",
		)
	)
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can manage Assistant feature requests.",
		});
	return ctx.userId;
}

function scope(actor: { userId: number; scopeType: string; scopeId: string }) {
	return {
		ownerUserId: actor.userId,
		scopeType: actor.scopeType,
		scopeId: actor.scopeId,
	};
}

function notFound(error: unknown): never {
	if (error instanceof AssistantConversationAccessError) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Conversation was not found",
		});
	}
	throw error;
}

const nullableQuotaInteger = z
	.number()
	.int()
	.nonnegative()
	.nullable()
	.optional();
const assistantQuotaPolicyUpdateSchema = z
	.object({
		userId: z.number().int().positive(),
		name: z.string().trim().min(1).max(120),
		sourceTemplateId: z.string().trim().min(1).max(191).nullable().optional(),
		dailyRequestLimit: nullableQuotaInteger,
		monthlyRequestLimit: nullableQuotaInteger,
		dailyTokenLimit: nullableQuotaInteger,
		monthlyTokenLimit: nullableQuotaInteger,
		concurrentRunLimit: nullableQuotaInteger,
		dailyCostLimitMicros: nullableQuotaInteger,
		monthlyCostLimitMicros: nullableQuotaInteger,
		warningPercent: z.number().int().min(1).max(100).default(80),
		timezone: z.string().trim().min(1).max(64).default("UTC"),
		enforcementMode: z.enum(["hard", "warning", "dry_run"]).default("hard"),
		effectiveFrom: z.coerce.date().optional(),
		effectiveTo: z.coerce.date().nullable().optional(),
	})
	.strict();

export const assistantRouter = createTRPCRouter({
	salesRequestSession: protectedProcedure
		.input(z.object({ conversationId: z.string().min(1).max(191) }).strict())
		.query(async ({ ctx, input }) =>
			readAssistantSalesRequestSession(ctx.db, await actorOrThrow(ctx), input.conversationId),
		),
	startSalesRequest: protectedProcedure
		.input(startAssistantSalesRequestSchema)
		.mutation(async ({ ctx, input, signal }) =>
			startAssistantSalesRequest(
				ctx.db, await actorOrThrow(ctx), input,
				signal ?? new AbortController().signal,
			),
		),
	answerSalesRequest: protectedProcedure
		.input(answerAssistantSalesRequestSchema)
		.mutation(async ({ ctx, input, signal }) =>
			answerAssistantSalesRequest(
				ctx.db, await actorOrThrow(ctx), input,
				signal ?? new AbortController().signal,
			),
		),
	captureHealth: protectedProcedure.query(async ({ ctx }) => {
		await featureAdminOrThrow(ctx);
		const health = await getAssistantCaptureHealth();
		return {
			...health,
			conversationRetention: getAssistantConversationRetentionPolicy(),
		};
	}),
	reportClientFailure: protectedProcedure.input(assistantClientDiagnosticSchema).mutation(async ({ ctx, input }) => {
		const actor = await actorOrThrow(ctx);
		return reportAssistantClientFailure(ctx.db, actor, input);
	}),
	diagnosticAccess: protectedProcedure.query(async ({ ctx }) => {
		try {
			await featureAdminOrThrow(ctx);
			return assistantDiagnosticUiState(true);
		} catch (error) {
			if (error instanceof TRPCError && error.code === "FORBIDDEN") return assistantDiagnosticUiState(false);
			throw error;
		}
	}),
	diagnostics: protectedProcedure
		.input(assistantDiagnosticFilterSchema)
		.query(async ({ ctx, input }) => {
			await featureAdminOrThrow(ctx);
			return listAssistantDiagnostics(ctx.db, ctx.userId, input);
		}),
	diagnostic: protectedProcedure
		.input(z.object({ reference: assistantDiagnosticReferenceSchema }).strict())
		.query(async ({ ctx, input }) => {
			await featureAdminOrThrow(ctx);
			const diagnostic = await getAssistantDiagnostic(ctx.db, ctx.userId, input.reference);
			if (!diagnostic) throw new TRPCError({ code: "NOT_FOUND", message: "This diagnostic is no longer available." });
			return diagnostic;
		}),
	reviewDiagnostic: protectedProcedure
		.input(assistantDiagnosticReviewSchema)
		.mutation(async ({ ctx, input }) => {
			await featureAdminOrThrow(ctx);
			return reviewAssistantDiagnostic(ctx.db, ctx.userId, input);
		}),
	bootstrap: protectedProcedure.query(async ({ ctx }) => {
		const [access, quota] = await Promise.all([
			getAssistantAccessState(ctx.db, ctx.userId),
			getAssistantQuotaStatus(ctx.db, { actorUserId: ctx.userId }),
		]);
		return { ...access, quota };
	}),
	adminPermissions: protectedProcedure
		.input(
			z.object({
				search: z.string().trim().max(100).optional(),
				take: z.number().int().min(1).max(100).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			await featureAdminOrThrow(ctx);
			return listAssistantPermissions(ctx.db, input);
		}),
	updateDirectPermission: protectedProcedure
		.input(assistantDirectPermissionSchema)
		.mutation(async ({ ctx, input }) => {
			await featureAdminOrThrow(ctx);
			return setAssistantDirectPermission(ctx.db, input);
		}),
	runtimeSettings: protectedProcedure.query(async ({ ctx }) => {
		await featureAdminOrThrow(ctx);
		return getAssistantRuntimeSettingsSurface(ctx.db);
	}),
	updateRuntimeSettings: protectedProcedure
		.input(
			z
				.object({
					provider: z.enum(["openai", "anthropic", "deepseek", "google"]),
					model: z.string().trim().min(1).max(100),
					expectedVersion: z.number().int().nonnegative(),
				})
				.strict(),
		)
		.mutation(async ({ ctx, input }) => {
			const adminUserId = await featureAdminOrThrow(ctx);
			try {
				return await updateAssistantRuntimeSettings(ctx.db, adminUserId, input);
			} catch (error) {
				if (error instanceof AssistantRuntimeSettingConflictError) {
					throw new TRPCError({ code: "CONFLICT", message: error.message });
				}
				throw error;
			}
		}),
	usageReconciliationQueue: protectedProcedure
		.input(z.object({ take: z.number().int().min(1).max(100).default(50) }))
		.query(async ({ ctx, input }) => {
			await featureAdminOrThrow(ctx);
			return listAssistantUsageReconciliationQueue(ctx.db, input);
		}),
	reconcileUsage: protectedProcedure
		.input(
			z.object({
				usageEventId: z.string().trim().min(1).max(191),
				inputTokens: z.number().int().nonnegative().nullable(),
				cachedInputTokens: z.number().int().nonnegative().nullable(),
				outputTokens: z.number().int().nonnegative().nullable(),
				reasoningTokens: z.number().int().nonnegative().nullable(),
				totalTokens: z.number().int().nonnegative().nullable(),
				note: z.string().trim().min(3).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const adminUserId = await featureAdminOrThrow(ctx);
			return reconcileAssistantUsageEvent(ctx.db, {
				usageEventId: input.usageEventId,
				inputTokens: input.inputTokens ?? null,
				cachedInputTokens: input.cachedInputTokens ?? null,
				outputTokens: input.outputTokens ?? null,
				reasoningTokens: input.reasoningTokens ?? null,
				totalTokens: input.totalTokens ?? null,
				note: input.note,
				actorUserId: adminUserId,
			});
		}),
	quotaPolicies: protectedProcedure
		.input(
			z.object({
				userId: z.number().int().positive().optional(),
				take: z.number().int().min(1).max(100).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			await featureAdminOrThrow(ctx);
			return listAssistantQuotaPolicies(ctx.db, input);
		}),
	setQuotaPolicy: protectedProcedure
		.input(assistantQuotaPolicyUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const adminUserId = await featureAdminOrThrow(ctx);
			return setAssistantUserQuotaPolicy(ctx.db, adminUserId, {
				...input,
				effectiveFrom: input.effectiveFrom ?? new Date(),
			});
		}),
	createProposal: protectedProcedure
		.input(assistantProposalCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return runAssistantOperation({ stage: "action", operation: "assistant.prepareApproval", requestId: ctx.requestId, actorUserId: actor.userId, scopeType: actor.scopeType, scopeId: actor.scopeId }, () => createAssistantActionProposal(ctx.db, actor, input));
		}),
	proposal: protectedProcedure
		.input(z.object({ proposalId: z.string().trim().min(1).max(191) }))
		.query(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return runAssistantOperation({ stage: "action", operation: "assistant.readApproval", requestId: ctx.requestId, actorUserId: actor.userId, scopeType: actor.scopeType, scopeId: actor.scopeId }, () => getAssistantActionProposal(ctx.db, actor, input.proposalId));
		}),
	decideProposal: protectedProcedure
		.input(assistantProposalDecisionSchema)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return runAssistantOperation({ stage: "action", operation: "assistant.decideApproval", requestId: ctx.requestId, actorUserId: actor.userId, scopeType: actor.scopeType, scopeId: actor.scopeId }, () => decideAssistantActionProposal(ctx.db, actor, input), { uncertainOnFailure: true });
		}),
	prepareFeatureRequest: protectedProcedure
		.input(z.object({ summary: z.string().trim().min(10).max(500) }))
		.query(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return prepareAssistantFeatureRequest(actor, input.summary);
		}),
	submitFeatureRequest: protectedProcedure
		.input(assistantFeatureRequestSubmitSchema)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return submitAssistantFeatureRequest(ctx.db, actor, input);
		}),
	featureRequestsMine: protectedProcedure.query(async ({ ctx }) => {
		const actor = await actorOrThrow(ctx);
		return listMyAssistantFeatureRequests(ctx.db, actor);
	}),
	unsubscribeFeatureRequest: protectedProcedure
		.input(z.object({ requestId: z.string().trim().min(1).max(191) }))
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return unsubscribeAssistantFeatureRequest(ctx.db, actor, input.requestId);
		}),
	featureRequestAdminAccess: protectedProcedure.query(async ({ ctx }) => {
		try {
			await featureAdminOrThrow(ctx);
			return { canTriage: true as const };
		} catch (error) {
			if (!(error instanceof TRPCError) || error.code !== "FORBIDDEN")
				throw error;
			return { canTriage: false as const };
		}
	}),
	featureRequestsTriage: protectedProcedure
		.input(
			z.object({
				status: z.enum(assistantFeatureRequestStatuses).optional(),
				take: z.number().int().min(1).max(100).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			await featureAdminOrThrow(ctx);
			return listAssistantFeatureRequestsForTriage(ctx.db, input);
		}),
	triageFeatureRequest: protectedProcedure
		.input(assistantFeatureTriageSchema)
		.mutation(async ({ ctx, input }) => {
			const adminUserId = await featureAdminOrThrow(ctx);
			return triageAssistantFeatureRequest(ctx.db, adminUserId, input);
		}),
	retryFeatureAnalysis: protectedProcedure
		.input(z.object({ requestId: z.string().trim().min(1).max(191) }))
		.mutation(async ({ ctx, input }) => {
			await featureAdminOrThrow(ctx);
			return retryAssistantFeatureAnalysis(ctx.db, input.requestId);
		}),
	processFeatureAnalysis: protectedProcedure.mutation(async ({ ctx }) => {
		await featureAdminOrThrow(ctx);
		return processNextAssistantFeatureAnalysis(
			ctx.db,
			analyzeAssistantFeatureRequest,
		);
	}),
	processFeatureNotification: protectedProcedure.mutation(async ({ ctx }) => {
		await featureAdminOrThrow(ctx);
		return deliverAssistantFeatureNotification(ctx.db);
	}),
	publishFeatureRelease: protectedProcedure
		.input(assistantCapabilityReleaseSchema)
		.mutation(async ({ ctx, input }) => {
			const adminUserId = await featureAdminOrThrow(ctx);
			return publishAssistantCapabilityRelease(ctx.db, adminUserId, input);
		}),
	savedActions: protectedProcedure.query(async ({ ctx }) => {
		const actor = await actorOrThrow(ctx);
		return listAssistantSavedActions(ctx.db, actor);
	}),
	createSavedAction: protectedProcedure
		.input(assistantSavedActionCreateSchema)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return createAssistantSavedAction(ctx.db, actor, input);
		}),
	updateSavedAction: protectedProcedure
		.input(assistantSavedActionUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return updateAssistantSavedAction(ctx.db, actor, input);
		}),
	removeSavedAction: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1).max(191),
				expectedVersion: z.number().int().positive(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return removeAssistantSavedAction(ctx.db, actor, input);
		}),
	duplicateSavedAction: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1).max(191),
				name: z.string().trim().min(1).max(120),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return duplicateAssistantSavedAction(ctx.db, actor, input);
		}),
	reorderSavedActions: protectedProcedure
		.input(
			z.object({
				items: z
					.array(
						z.object({
							id: z.string().min(1).max(191),
							expectedVersion: z.number().int().positive(),
						}),
					)
					.max(100),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return reorderAssistantSavedActions(ctx.db, actor, input.items);
		}),
	executeSavedAction: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1).max(191),
				parameters: assistantRecipeParametersSchema,
				conversationId: z.string().min(1).max(191).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return executeAssistantSavedAction(ctx.db, actor, input);
		}),
	retryRead: protectedProcedure
		.input(z.object({ retryId: z.string().uuid() }).strict())
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			try {
				const retried = await executeAssistantReadRetry(actor, input.retryId, {
					signal: AbortSignal.timeout(15_000),
					resolveActor: () => actorOrThrow(ctx),
					persist: (completed) =>
						persistAssistantReadRetryResult(ctx.db, actor, {
							conversationId: completed.conversationId,
							retryId: input.retryId,
							toolId: completed.toolId,
							toolVersion: completed.version,
							result: completed.result,
						}),
					authorize: async (ticket) => {
						const [failedRead, consumedRetry] = await Promise.all([
							ctx.db.assistantToolExecution.findFirst({
								where: {
									runId: ticket.runId,
									toolCallId: ticket.toolCallId,
									toolId: ticket.toolId,
									toolVersion: ticket.version,
									effect: "read",
									status: "failed",
									run: {
										actorUserId: actor.userId,
										conversation: {
											id: ticket.conversationId,
											ownerUserId: actor.userId,
											scopeType: actor.scopeType,
											scopeId: actor.scopeId,
											archivedAt: null,
											deletedAt: null,
										},
									},
								},
								select: { id: true },
							}),
							ctx.db.assistantRun.findFirst({
								where: {
									id: input.retryId,
									actorUserId: actor.userId,
									conversation: {
										id: ticket.conversationId,
										ownerUserId: actor.userId,
										scopeType: actor.scopeType,
										scopeId: actor.scopeId,
										deletedAt: null,
									},
								},
								select: { id: true },
							}),
						]);
						return Boolean(failedRead) && !consumedRetry;
					},
				});
				const persisted = retried.persistence as Awaited<
					ReturnType<typeof persistAssistantReadRetryResult>
				>;
				return {
					message: {
						id: persisted.message.id,
						role: persisted.message.role,
						parts: persisted.message.parts,
					},
				};
			} catch (error) {
				if (error instanceof AssistantReadRetryUnavailable) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: error.message,
					});
				}
				throw error;
			}
		}),
	saveActionFromRun: protectedProcedure
		.input(assistantSavedActionFromRunSchema)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return saveAssistantActionFromRun(ctx.db, actor, input);
		}),
	savedActionEligibility: protectedProcedure
		.input(z.object({ runId: z.string().min(1).max(191) }))
		.query(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return getAssistantSaveActionEligibility(ctx.db, actor, input.runId);
		}),
	preferences: protectedProcedure.query(async ({ ctx }) => {
		const actor = await actorOrThrow(ctx);
		return getAssistantPreferences(ctx.db, actor);
	}),
	updatePreferences: protectedProcedure
		.input(assistantPreferenceUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return updateAssistantPreferences(ctx.db, actor, input);
		}),
	memories: protectedProcedure.query(async ({ ctx }) => {
		const actor = await actorOrThrow(ctx);
		return listAssistantPersonalMemories(ctx.db, actor);
	}),
	createMemory: protectedProcedure
		.input(z.object({ content: z.string().trim().min(1).max(500) }))
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return createAssistantPersonalMemory(ctx.db, actor, input.content);
		}),
	removeMemory: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1).max(191),
				expectedVersion: z.number().int().positive(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return removeAssistantPersonalMemory(ctx.db, actor, input);
		}),
	suggestions: protectedProcedure.query(async ({ ctx }) => {
		const actor = await actorOrThrow(ctx);
		return getAssistantSuggestions(actor.grants);
	}),
	recordSuggestionUse: protectedProcedure
		.input(
			z.object({
				id: z.enum(
					assistantSuggestionCatalog.map(({ id }) => id) as [
						(typeof assistantSuggestionCatalog)[number]["id"],
						...(typeof assistantSuggestionCatalog)[number]["id"][],
					],
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await actorOrThrow(ctx);
			await ctx.db.event.create({
				data: {
					type: "assistant_suggestion_used",
					data: { suggestionId: input.id },
					userId: ctx.userId,
				},
			});
			return { recorded: true as const };
		}),
	providers: protectedProcedure.query(async ({ ctx }) => {
		const actor = await actorOrThrow(ctx);
		return {
			webSearch: {
				id: "web_search" as const,
				name: "Web search",
				enabled: Boolean(process.env.ASSISTANT_WEB_SEARCH_API_KEY?.trim()),
				alwaysActive: true as const,
			},
			connectedApps: await getAssistantConnectedApps(actor),
			managementUrl: getAssistantConnectorManagementUrl(),
		};
	}),
	create: protectedProcedure
		.input(
			z.object({ title: z.string().trim().max(500).optional() }).optional(),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			const conversation = await createAssistantConversation(ctx.db, {
				...scope(actor),
				title: input?.title,
			});
			return {
				id: conversation.id,
				title: conversation.title,
				updatedAt: conversation.updatedAt,
				archivedAt: conversation.archivedAt,
			};
		}),
	list: protectedProcedure
		.input(
			z.object({
				search: z.string().trim().max(500).optional(),
				includeArchived: z.boolean().default(false),
				take: z.number().int().min(1).max(100).default(30),
			}),
		)
		.query(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			const conversations = await listAssistantConversations(ctx.db, {
				...scope(actor),
				...input,
			});
			return conversations.map((conversation) => ({
				id: conversation.id,
				title: conversation.title,
				updatedAt: conversation.updatedAt,
				archivedAt: conversation.archivedAt,
			}));
		}),
	get: protectedProcedure
		.input(z.object({ conversationId: z.string().min(1).max(191) }))
		.query(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			const conversation = await getAssistantConversation(ctx.db, {
				...scope(actor),
				conversationId: input.conversationId,
			});
			if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
			const latestRun = await ctx.db.assistantRun.findFirst({
				where: {
					conversationId: conversation.id,
					actorUserId: actor.userId,
				},
				orderBy: { createdAt: "desc" },
				select: { id: true, status: true, lastSequence: true },
			});
			return {
				id: conversation.id,
				title: conversation.title,
				updatedAt: conversation.updatedAt,
				archivedAt: conversation.archivedAt,
				messages: conversation.messages.map((message) => ({
					id: message.id,
					role: message.role,
					parts: message.parts,
					sequence: message.sequence,
				})),
				latestRun,
			};
		}),
	setTitle: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().min(1).max(191),
				title: z.string().trim().min(1).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			const result = await ctx.db.assistantConversation.updateMany({
				where: { id: input.conversationId, ...scope(actor), deletedAt: null },
				data: { title: input.title },
			});
			if (result.count !== 1)
				return notFound(new AssistantConversationAccessError());
			return { id: input.conversationId, title: input.title };
		}),
	archive: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().min(1).max(191),
				archived: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			try {
				const conversation = await archiveAssistantConversation(ctx.db, {
					...scope(actor),
					...input,
				});
				if (!conversation)
					return notFound(new AssistantConversationAccessError());
				return { id: conversation.id, archivedAt: conversation.archivedAt };
			} catch (error) {
				return notFound(error);
			}
		}),
	delete: protectedProcedure
		.input(z.object({ conversationId: z.string().min(1).max(191) }))
		.mutation(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			try {
				const conversation = await softDeleteAssistantConversation(ctx.db, {
					...scope(actor),
					...input,
				});
				return { id: conversation.id, deleted: true as const };
			} catch (error) {
				return notFound(error);
			}
		}),
	getSalesDraftHandoff: protectedProcedure
		.input(
			z.object({
				conversationId: z.string().trim().min(1).max(191),
				generationId: z.string().uuid(),
			}).strict(),
		)
		.query(async ({ ctx, input }) => {
			const actor = await actorOrThrow(ctx);
			return getAssistantSalesDraftHandoff(ctx.db, actor, input);
		}),
});
