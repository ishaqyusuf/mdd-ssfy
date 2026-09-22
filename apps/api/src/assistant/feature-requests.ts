import { createHash } from "node:crypto";
import { type Database, Prisma } from "@gnd/db";
import { z } from "zod";
import {
	ASSISTANT_TOOL_CATALOG_VERSION,
	type AssistantToolActor,
	getAssistantRegistryKnowledgeDefinitions,
	getAssistantRegistryPublicDefinitions,
	getAssistantReleaseAuthority,
	getAssistantToolCatalog,
} from "./registry";

export const ASSISTANT_FEATURE_CLASSIFIER_VERSION =
	"assistant-feature-classifier-v1";
export const ASSISTANT_FEATURE_CONSENT_VERSION = "assistant-feature-consent-v1";
export const ASSISTANT_FEATURE_ANALYSIS_VERSION =
	"assistant-feature-analysis-v1";

export const assistantFeatureClassificationSchema = z.enum([
	"missing_capability",
	"access_denied",
	"unmet_prerequisite",
	"outage",
	"degraded_rollout",
	"ambiguity",
	"available",
]);

export const assistantFeatureCategorySchema = z.enum([
	"sales",
	"customers",
	"community",
	"inventory",
	"production",
	"fulfillment",
	"documents",
	"finance",
	"employees",
	"system",
	"other",
]);

export const assistantFeatureRequestEvidenceSchema = z
	.object({
		source: z.enum(["assistant_card", "assistant_menu"]),
		conversationId: z.string().trim().min(1).max(191).optional(),
		runId: z.string().trim().min(1).max(191).optional(),
		messageId: z.string().trim().min(1).max(191).optional(),
	})
	.strict()
	.superRefine((evidence, context) => {
		if ((evidence.runId || evidence.messageId) && !evidence.conversationId)
			context.addIssue({
				code: "custom",
				message: "Run and message evidence require a conversation ID",
			});
		if (
			evidence.source === "assistant_card" &&
			(!evidence.conversationId || !evidence.runId || !evidence.messageId)
		)
			context.addIssue({
				code: "custom",
				message:
					"Assistant card evidence requires related conversation, run, and message IDs",
			});
	});

export const assistantFeatureRequestSubmitSchema = z
	.object({
		clientRequestId: z.string().uuid(),
		summary: z.string().trim().min(10).max(500),
		releaseOptIn: z.boolean().default(false),
		evidence: assistantFeatureRequestEvidenceSchema,
	})
	.strict();

export const assistantFeatureAnalysisSchema = z
	.object({
		version: z.literal(ASSISTANT_FEATURE_ANALYSIS_VERSION),
		normalizedNeed: z.string().trim().min(1).max(500),
		existingAlternatives: z.array(z.string().trim().min(1).max(240)).max(8),
		affectedDomains: z.array(assistantFeatureCategorySchema).min(1).max(8),
		requiredInputs: z.array(z.string().trim().min(1).max(160)).max(20),
		requiredOutputs: z.array(z.string().trim().min(1).max(160)).max(20),
		permissionChanges: z.array(z.string().trim().min(1).max(240)).max(20),
		dataChanges: z.array(z.string().trim().min(1).max(240)).max(20),
		queryAndIndexPlan: z.array(z.string().trim().min(1).max(300)).max(20),
		dependencies: z.array(z.string().trim().min(1).max(200)).max(20),
		migrationImpact: z.string().trim().min(1).max(1_000),
		uiSurfaces: z.array(z.string().trim().min(1).max(200)).max(20),
		acceptanceCases: z.array(z.string().trim().min(1).max(300)).min(1).max(30),
		risks: z.array(z.string().trim().min(1).max(300)).max(20),
		openQuestions: z.array(z.string().trim().min(1).max(300)).max(20),
		size: z.enum(["small", "medium", "large", "extra_large"]),
		confidence: z.number().min(0).max(1),
		citations: z
			.array(
				z
					.object({
						id: z.string().trim().min(1).max(160),
						label: z.string().trim().min(1).max(200),
						version: z.string().trim().min(1).max(100),
					})
					.strict(),
			)
			.min(1)
			.max(12),
	})
	.strict();

export const assistantFeatureRequestStatuses = [
	"submitted",
	"analyzing",
	"needs_clarification",
	"triaged",
	"planned",
	"building",
	"testing",
	"available",
	"duplicate",
	"declined",
	"cancelled",
] as const;

export type AssistantFeatureRequestStatus =
	(typeof assistantFeatureRequestStatuses)[number];

const assistantFeatureTriageStatuses = [
	"needs_clarification",
	"triaged",
	"planned",
	"building",
	"testing",
	"declined",
	"cancelled",
] as const;

export const assistantFeatureTriageSchema = z
	.object({
		requestId: z.string().trim().min(1).max(191),
		status: z.enum(assistantFeatureTriageStatuses).optional(),
		assignedToUserId: z.number().int().positive().nullable().optional(),
		mergedIntoId: z.string().trim().min(1).max(191).optional(),
		reviewAnalysis: z.boolean().optional(),
		note: z.string().trim().max(500).optional(),
		expectedUpdatedAt: z.coerce.date(),
	})
	.strict()
	.refine(
		(input) =>
			input.status !== undefined ||
			input.assignedToUserId !== undefined ||
			input.mergedIntoId !== undefined ||
			input.reviewAnalysis === true,
		"A triage change is required",
	);

export const assistantCapabilityReleaseSchema = z
	.object({
		capabilityKey: z.string().trim().min(3).max(191),
		version: z.string().trim().min(1).max(64),
		rolloutEvidence: z
			.object({
				verificationId: z.string().trim().min(1).max(191),
				verifiedAt: z.coerce.date(),
				notes: z.string().trim().min(1).max(1_000),
			})
			.strict(),
		requestIds: z.array(z.string().trim().min(1).max(191)).min(1).max(200),
	})
	.strict();

function hash(value: unknown) {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizedSummary(summary: string) {
	return summary
		.toLowerCase()
		.normalize("NFKC")
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

function scoreTool(
	summary: string,
	tool: { toolId: string; title: string; description: string },
) {
	const stopWords = new Set([
		"about",
		"assistant",
		"from",
		"into",
		"that",
		"their",
		"this",
		"with",
	]);
	const terms = new Set(
		normalizedSummary(summary)
			.split(" ")
			.filter((term) => term.length > 2 && !stopWords.has(term)),
	);
	const haystack = normalizedSummary(
		`${tool.toolId} ${tool.title} ${tool.description}`,
	);
	return [...terms].filter((term) => haystack.includes(term)).length;
}

export function classifyAssistantCapabilityOutcome(input: {
	resultStatus?: string | null;
	capability?: "implemented" | "coming_soon" | "disabled" | "degraded" | null;
	authorized?: boolean;
	ambiguous?: boolean;
	hasRegistryMatch?: boolean;
}) {
	if (input.ambiguous || input.resultStatus === "requires_input")
		return "ambiguity" as const;
	if (input.resultStatus === "unavailable") return "outage" as const;
	if (input.capability === "degraded") return "degraded_rollout" as const;
	if (input.capability === "disabled") return "unmet_prerequisite" as const;
	if (input.capability === "coming_soon" || input.hasRegistryMatch === false)
		return "missing_capability" as const;
	if (input.resultStatus === "denied" || input.authorized === false)
		return "access_denied" as const;
	return "available" as const;
}

export function prepareAssistantFeatureRequest(
	actor: AssistantToolActor,
	rawSummary: string,
) {
	const summary = z.string().trim().min(10).max(500).parse(rawSummary);
	const globalMatches = getAssistantRegistryPublicDefinitions()
		.filter((tool) => tool.toolId !== "system_request_capability")
		.map((tool) => ({ tool, score: scoreTool(summary, tool) }))
		.filter(({ score }) => score >= 2)
		.sort(
			(left, right) =>
				right.score - left.score ||
				left.tool.toolId.localeCompare(right.tool.toolId),
		);
	const match = globalMatches[0]?.tool;
	const actorToolIds = new Set(
		getAssistantToolCatalog(actor).map(({ toolId }) => toolId),
	);
	const classification = classifyAssistantCapabilityOutcome({
		capability: match?.capability ?? null,
		authorized: match ? actorToolIds.has(match.toolId) : true,
		hasRegistryMatch: Boolean(match),
	});
	const category = assistantFeatureCategorySchema.safeParse(match?.domain)
		.success
		? (match?.domain as z.infer<typeof assistantFeatureCategorySchema>)
		: "other";
	return {
		summary,
		classification,
		category,
		capabilityKey: match?.toolId ?? null,
		alternative:
			classification === "available" || classification === "access_denied"
				? match
					? {
							toolId: match.toolId,
							title: match.title,
							capability: match.capability,
						}
					: null
				: null,
		classifierVersion: ASSISTANT_FEATURE_CLASSIFIER_VERSION,
		catalogVersion: ASSISTANT_TOOL_CATALOG_VERSION,
	};
}

export const ASSISTANT_FEATURE_KNOWLEDGE_MAX_BYTES = 64_000;

export function assistantFeatureKnowledgeSnapshot(
	category: z.infer<typeof assistantFeatureCategorySchema> = "other",
) {
	const registry = getAssistantRegistryKnowledgeDefinitions({
		domain: category,
		maxSchemaContracts: 4,
	});
	const dataModel = {
		entities: [
			{
				name: "AssistantConversation",
				fields: ["id", "ownerUserId", "scopeType", "scopeId", "deletedAt"],
				joins: ["messages.conversationId", "runs.conversationId"],
				authority: "ownerUserId plus the server-resolved actor scope",
			},
			{
				name: "AssistantFeatureRequest",
				fields: ["id", "canonicalKey", "category", "status", "analysisStatus"],
				joins: [
					"submissions.requestId",
					"subscriptions.requestId",
					"analysisJobs.requestId",
					"outbox.requestId",
				],
				authority: "request scope and caller-owned submission membership",
			},
			{
				name: "SalesOrders",
				fields: ["id", "orderId", "customerId", "type", "status", "deletedAt"],
				joins: [
					"Customers.id = SalesOrders.customerId",
					"SalesOrderItems.salesOrderId = SalesOrders.id",
				],
				authority: "sales query services plus viewOrders/editOrders grants",
			},
			{
				name: "Customers",
				fields: ["id", "name", "phoneNo", "email", "deletedAt"],
				joins: ["SalesOrders.customerId = Customers.id"],
				authority:
					"customers_find requires viewSalesCustomers, editSalesCustomers, or viewOrders; summary and order history require viewOrders",
			},
			{
				name: "Projects",
				fields: ["id", "title", "builderId", "orgId", "deletedAt"],
				joins: ["CommunityModels.projectId = Projects.id"],
				authority:
					"community query services plus any of viewCommunity/viewCommunityUnit/editCommunityUnit",
			},
			{
				name: "CommunityModels",
				fields: ["id", "modelName", "projectId", "deletedAt"],
				joins: [
					"CommunityModels.projectId = Projects.id",
					"SalesOrders.communityModelId = CommunityModels.id",
				],
				authority:
					"community query services plus any of viewCommunity/viewCommunityUnit/editCommunityUnit",
			},
			{
				name: "Notifications",
				fields: ["id", "userId", "type", "message", "assistantDeliveryKey"],
				joins: ["Notifications.userId = Users.id"],
				authority: "server-selected recipient; assistantDeliveryKey is unique",
			},
		],
		constraints: [
			"Every business read and action derives actor scope and grants on the server",
			"SQL identifiers come only from reviewed repositories; model input is semantic and values are parameterized",
			"Generated artifacts and writes require existing durable proposal and approval boundaries",
			"Cross-domain joins must use the named repository/query service rather than model-authored SQL",
		],
	};
	const engineeringContract = {
		api: "tRPC and Assistant MCP tools use strict Zod input/output contracts",
		permissions:
			"Reuse existing grants and reauthorize at execution and delivery time",
		ui: "Render typed cards and canvases inside the normal dashboard shell",
		repositories: [
			"apps/api/src/assistant/registry.ts owns versioned tool contracts and handlers",
			"apps/api/src/assistant/actor.ts owns server-side actor scope and grant resolution",
			"packages/db/src/schema/*.prisma owns model fields, relations, and indexes",
			"packages/sales and existing API query services own business SQL and mutations",
		],
	};
	const schemaVersion = `assistant-schema-${hash({ registry, dataModel, engineeringContract }).slice(0, 16)}`;
	const brainVersion = "progressive-ai-chat-2026-09-13";
	const snapshot = {
		analysisVersion: ASSISTANT_FEATURE_ANALYSIS_VERSION,
		catalogVersion: ASSISTANT_TOOL_CATALOG_VERSION,
		schemaVersion,
		brainVersion,
		registry,
		dataModel,
		engineeringContract,
		citations: [
			{
				id: "assistant-tool-registry",
				label: "Versioned Assistant tool registry",
				version: ASSISTANT_TOOL_CATALOG_VERSION,
			},
			{
				id: "assistant-schema",
				label: "Assistant persistence schema",
				version: schemaVersion,
			},
			{
				id: "progressive-ai-chat-brain",
				label: "Progressive AI Chat feature contract",
				version: brainVersion,
			},
		],
	};
	if (
		Buffer.byteLength(JSON.stringify(snapshot), "utf8") >
		ASSISTANT_FEATURE_KNOWLEDGE_MAX_BYTES
	)
		throw new Error(
			"Assistant feature knowledge snapshot exceeds its storage and model-input budget",
		);
	return snapshot;
}

function actorScope(actor: AssistantToolActor) {
	return { scopeType: actor.scopeType, scopeId: actor.scopeId };
}

function featureRequestReceipt(request: {
	id: string;
	status: string;
	analysisStatus?: string;
	updatedAt?: Date;
}) {
	return {
		id: request.id,
		status: request.status,
		analysisStatus: request.analysisStatus ?? "queued",
		updatedAt: request.updatedAt ?? null,
	};
}

function assertCuratedAnalysisCitations(
	analysis: z.infer<typeof assistantFeatureAnalysisSchema>,
	knowledgeSnapshot: unknown,
) {
	const snapshot = z
		.object({
			citations: z.array(
				z.object({ id: z.string(), version: z.string() }).passthrough(),
			),
		})
		.passthrough()
		.parse(knowledgeSnapshot);
	const allowed = new Set(
		snapshot.citations.map((citation) => `${citation.id}:${citation.version}`),
	);
	if (
		analysis.citations.some(
			(citation) => !allowed.has(`${citation.id}:${citation.version}`),
		)
	)
		throw new Error("Analysis cited knowledge outside the curated snapshot");
}

export async function submitAssistantFeatureRequest(
	db: Database,
	actor: AssistantToolActor,
	rawInput: unknown,
	now = new Date(),
) {
	const input = assistantFeatureRequestSubmitSchema.parse(rawInput);
	const prepared = prepareAssistantFeatureRequest(actor, input.summary);
	if (prepared.classification !== "missing_capability") {
		return { status: "not_missing" as const, prepared };
	}
	const canonicalKey = hash({
		scope: actorScope(actor),
		summary: normalizedSummary(prepared.summary),
		capabilityKey: prepared.capabilityKey,
	});
	const persist = () =>
		db.$transaction(
			async (tx) => {
				const duplicate = await tx.assistantFeatureRequestSubmission.findFirst({
					where: {
						reporterUserId: actor.userId,
						clientRequestId: input.clientRequestId,
						...actorScope(actor),
					},
					select: {
						request: {
							select: {
								id: true,
								status: true,
								analysisStatus: true,
								updatedAt: true,
							},
						},
					},
				});
				if (duplicate)
					return {
						status: "saved" as const,
						request: featureRequestReceipt(duplicate.request),
						deduplicated: true,
						notificationStatus: "pending" as const,
					};
				if (input.evidence.conversationId) {
					const conversation = await tx.assistantConversation.findFirst({
						where: {
							id: input.evidence.conversationId,
							ownerUserId: actor.userId,
							...actorScope(actor),
							deletedAt: null,
						},
						select: { id: true },
					});
					if (!conversation)
						throw new Error(
							"Feature request evidence is outside the current scope",
						);
				}
				if (input.evidence.runId) {
					const run = await tx.assistantRun.findFirst({
						where: {
							id: input.evidence.runId,
							actorUserId: actor.userId,
							conversationId: input.evidence.conversationId,
						},
						select: { id: true },
					});
					if (!run) throw new Error("Feature request run evidence is invalid");
				}
				if (input.evidence.messageId) {
					const message = await tx.assistantMessage.findFirst({
						where: {
							id: input.evidence.messageId,
							conversationId: input.evidence.conversationId,
							generatedRunId: input.evidence.runId,
						},
						select: { id: true },
					});
					if (!message)
						throw new Error("Feature request message evidence is invalid");
				}
				const request = await tx.assistantFeatureRequest.upsert({
					where: {
						scopeType_scopeId_canonicalKey: {
							...actorScope(actor),
							canonicalKey,
						},
					},
					create: {
						ownerUserId: actor.userId,
						...actorScope(actor),
						conversationId: input.evidence.conversationId,
						canonicalKey,
						summary: prepared.summary,
						category: prepared.category,
						capabilityKey: prepared.capabilityKey,
						classifierVersion: prepared.classifierVersion,
						knowledgeSnapshot: assistantFeatureKnowledgeSnapshot(
							prepared.category,
						) as Prisma.InputJsonValue,
						lastEventSequence: 1,
					},
					update: {
						occurrenceCount: { increment: 1 },
						lastEventSequence: { increment: 1 },
					},
				});
				const created = request.occurrenceCount === 1;
				await tx.assistantFeatureRequestSubmission.create({
					data: {
						requestId: request.id,
						reporterUserId: actor.userId,
						...actorScope(actor),
						clientRequestId: input.clientRequestId,
						summary: prepared.summary,
						evidence: {
							...input.evidence,
							catalogVersion: prepared.catalogVersion,
							classifierVersion: prepared.classifierVersion,
						} as Prisma.InputJsonValue,
						consentVersion: ASSISTANT_FEATURE_CONSENT_VERSION,
						releaseOptIn: input.releaseOptIn,
					},
				});
				if (input.releaseOptIn) {
					await tx.assistantFeatureSubscription.upsert({
						where: {
							requestId_userId_scopeType_scopeId_activeKey: {
								requestId: request.id,
								userId: actor.userId,
								...actorScope(actor),
								activeKey: "active",
							},
						},
						create: {
							requestId: request.id,
							userId: actor.userId,
							...actorScope(actor),
							consentVersion: ASSISTANT_FEATURE_CONSENT_VERSION,
							consentEvidence: {
								clientRequestId: input.clientRequestId,
								source: input.evidence.source,
								consentedAt: now.toISOString(),
							} as Prisma.InputJsonValue,
						},
						update: {
							consentVersion: ASSISTANT_FEATURE_CONSENT_VERSION,
							unsubscribedAt: null,
						},
					});
				}
				await tx.assistantFeatureRequestEvent.create({
					data: {
						requestId: request.id,
						sequence: request.lastEventSequence,
						type: created ? "request_submitted" : "request_joined",
						actorUserId: actor.userId,
						payload: {
							releaseOptIn: input.releaseOptIn,
							classification: prepared.classification,
						} as Prisma.InputJsonValue,
					},
				});
				if (created) {
					await tx.assistantFeatureAnalysisJob.upsert({
						where: {
							requestId_revision: { requestId: request.id, revision: 1 },
						},
						create: { requestId: request.id },
						update: {},
					});
					const dedupeKey = hash({
						kind: "developer_intake",
						requestId: request.id,
					});
					await tx.assistantFeatureNotificationOutbox.upsert({
						where: { dedupeKey },
						create: {
							requestId: request.id,
							kind: "developer_intake",
							dedupeKey,
						},
						update: {},
					});
				}
				return {
					status: "saved" as const,
					request: featureRequestReceipt(request),
					deduplicated: !created,
					notificationStatus: "pending" as const,
				};
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			return await persist();
		} catch (error) {
			if (
				!(error instanceof Prisma.PrismaClientKnownRequestError) ||
				!["P2002", "P2034"].includes(error.code) ||
				attempt === 2
			)
				throw error;
		}
	}
	throw new Error("Feature request could not be persisted");
}

export async function listMyAssistantFeatureRequests(
	db: Database,
	actor: AssistantToolActor,
) {
	const requests = await db.assistantFeatureRequest.findMany({
		where: {
			...actorScope(actor),
			submissions: { some: { reporterUserId: actor.userId } },
		},
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		take: 100,
		select: {
			id: true,
			status: true,
			category: true,
			capabilityKey: true,
			analysisStatus: true,
			updatedAt: true,
			release: { select: { title: true, version: true, publishedAt: true } },
			submissions: {
				where: { reporterUserId: actor.userId, ...actorScope(actor) },
				orderBy: { createdAt: "desc" },
				take: 1,
				select: { summary: true },
			},
			subscriptions: {
				where: {
					userId: actor.userId,
					...actorScope(actor),
					activeKey: "active",
					unsubscribedAt: null,
				},
				select: { id: true },
			},
		},
	});
	return requests.map(({ submissions, ...request }) => ({
		...request,
		summary: submissions[0]?.summary ?? "Requested Assistant capability",
	}));
}

export async function listAssistantFeatureRequestsForTriage(
	db: Database,
	input: { status?: AssistantFeatureRequestStatus; take?: number } = {},
) {
	return db.assistantFeatureRequest.findMany({
		where: input.status ? { status: input.status } : undefined,
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		take: Math.min(Math.max(input.take ?? 50, 1), 100),
		include: {
			_count: { select: { submissions: true, subscriptions: true } },
			release: true,
		},
	});
}

export async function retryAssistantFeatureAnalysis(
	db: Database,
	requestId: string,
) {
	return db.$transaction(async (tx) => {
		const request = await tx.assistantFeatureRequest.findUnique({
			where: { id: requestId },
			select: {
				id: true,
				analysisStatus: true,
				analysisJobs: { orderBy: { revision: "desc" }, take: 1 },
			},
		});
		if (!request) throw new Error("Feature request was not found");
		if (!["failed", "retrying"].includes(request.analysisStatus))
			throw new Error("Feature analysis is not retryable");
		const revision = (request.analysisJobs[0]?.revision ?? 0) + 1;
		await tx.assistantFeatureAnalysisJob.create({
			data: { requestId, revision },
		});
		await tx.assistantFeatureRequest.update({
			where: { id: requestId },
			data: { analysisStatus: "queued", status: "submitted" },
		});
		return { queued: true as const, revision };
	});
}

export async function unsubscribeAssistantFeatureRequest(
	db: Database,
	actor: AssistantToolActor,
	requestId: string,
	now = new Date(),
) {
	return db.$transaction(async (tx) => {
		const request = await tx.assistantFeatureRequest.findFirst({
			where: {
				id: requestId,
				...actorScope(actor),
				submissions: { some: { reporterUserId: actor.userId } },
			},
		});
		if (!request) throw new Error("Feature request was not found");
		const activeSubscriptions = await tx.assistantFeatureSubscription.findMany({
			where: {
				requestId,
				userId: actor.userId,
				...actorScope(actor),
				activeKey: "active",
				unsubscribedAt: null,
			},
			select: { id: true },
		});
		for (const subscription of activeSubscriptions)
			await tx.assistantFeatureSubscription.update({
				where: { id: subscription.id },
				data: {
					activeKey: `unsubscribed:${subscription.id}`,
					unsubscribedAt: now,
				},
			});
		const allocated = await tx.assistantFeatureRequest.update({
			where: { id: requestId },
			data: { lastEventSequence: { increment: 1 } },
			select: { lastEventSequence: true },
		});
		await tx.assistantFeatureRequestEvent.create({
			data: {
				requestId,
				sequence: allocated.lastEventSequence,
				type: "release_unsubscribed",
				actorUserId: actor.userId,
			},
		});
		return { unsubscribed: true as const };
	});
}

export async function processNextAssistantFeatureAnalysis(
	db: Database,
	analyze: (input: {
		summary: string;
		category: string;
		knowledgeSnapshot: unknown;
		limits: { maxOutputTokens: number; timeoutMs: number };
	}) => Promise<unknown>,
	now = new Date(),
) {
	const claimedAt = new Date(Math.floor(now.getTime() / 1_000) * 1_000);
	const staleClaimedAt = new Date(now.getTime() - 5 * 60_000);
	const job = await db.assistantFeatureAnalysisJob.findFirst({
		where: {
			attempts: { lt: 3 },
			OR: [
				{ status: { in: ["queued", "retrying"] } },
				{ status: "running", claimedAt: { lte: staleClaimedAt } },
			],
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		include: { request: true },
	});
	if (!job) return { status: "idle" as const };
	const claim = await db.assistantFeatureAnalysisJob.updateMany({
		where: {
			id: job.id,
			status: job.status,
			attempts: job.attempts,
			claimedAt: job.claimedAt,
		},
		data: { status: "running", claimedAt, attempts: { increment: 1 } },
	});
	if (claim.count !== 1) return { status: "contended" as const };
	await db.assistantFeatureRequest.updateMany({
		where: {
			id: job.requestId,
			analysisStatus: { in: ["queued", "retrying", "running"] },
		},
		data: { analysisStatus: "running", status: "analyzing" },
	});
	try {
		const result = assistantFeatureAnalysisSchema.parse(
			await analyze({
				summary: job.request.summary,
				category: job.request.category,
				knowledgeSnapshot: job.request.knowledgeSnapshot,
				limits: { maxOutputTokens: 3_000, timeoutMs: 45_000 },
			}),
		);
		assertCuratedAnalysisCitations(result, job.request.knowledgeSnapshot);
		const finalized = await db.$transaction(async (tx) => {
			const owned = await tx.assistantFeatureAnalysisJob.updateMany({
				where: { id: job.id, status: "running", claimedAt },
				data: { status: "succeeded", completedAt: now, lastErrorCode: null },
			});
			if (owned.count !== 1) return false;
			const request = await tx.assistantFeatureRequest.update({
				where: { id: job.requestId },
				data: {
					analysisStatus: "completed",
					analysis: result as Prisma.InputJsonValue,
					analysisRevision: ASSISTANT_FEATURE_ANALYSIS_VERSION,
					status: "triaged",
					lastEventSequence: { increment: 1 },
				},
				select: { lastEventSequence: true },
			});
			await tx.assistantFeatureRequestEvent.create({
				data: {
					requestId: job.requestId,
					sequence: request.lastEventSequence,
					type: "analysis_completed",
					payload: { version: result.version } as Prisma.InputJsonValue,
				},
			});
			return true;
		});
		if (!finalized) return { status: "contended" as const };
		return { status: "completed" as const, requestId: job.requestId };
	} catch {
		const exhausted = job.attempts + 1 >= job.maxAttempts;
		const finalized = await db.$transaction(async (tx) => {
			const owned = await tx.assistantFeatureAnalysisJob.updateMany({
				where: { id: job.id, status: "running", claimedAt },
				data: {
					status: exhausted ? "failed" : "retrying",
					lastErrorCode: "ANALYSIS_FAILED",
					completedAt: exhausted ? now : null,
				},
			});
			if (owned.count !== 1) return false;
			await tx.assistantFeatureRequest.updateMany({
				where: { id: job.requestId },
				data: {
					analysisStatus: exhausted ? "failed" : "retrying",
					status: "submitted",
				},
			});
			return true;
		});
		if (!finalized) return { status: "contended" as const };
		return {
			status: exhausted ? ("failed" as const) : ("retrying" as const),
			requestId: job.requestId,
		};
	}
}

export async function triageAssistantFeatureRequest(
	db: Database,
	adminUserId: number,
	rawInput: unknown,
	now = new Date(),
) {
	const input = assistantFeatureTriageSchema.parse(rawInput);
	return db.$transaction(
		async (tx) => {
			const current = await tx.assistantFeatureRequest.findUnique({
				where: { id: input.requestId },
			});
			if (!current) throw new Error("Feature request was not found");
			if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
				throw new Error("Feature request changed; reload and retry");
			if (
				input.reviewAnalysis &&
				(current.analysisStatus !== "completed" || !current.analysis)
			)
				throw new Error("Only a completed visible analysis can be reviewed");
			if (
				input.assignedToUserId !== undefined &&
				input.assignedToUserId !== null
			) {
				const owner = await tx.users.findFirst({
					where: {
						id: input.assignedToUserId,
						deletedAt: null,
						accessRevokedAt: null,
					},
					select: { id: true },
				});
				if (!owner) throw new Error("Assigned owner is not an active user");
			}
			if (input.mergedIntoId) {
				if (input.mergedIntoId === input.requestId)
					throw new Error("A request cannot be merged into itself");
				const target = await tx.assistantFeatureRequest.findFirst({
					where: {
						id: input.mergedIntoId,
						scopeType: current.scopeType,
						scopeId: current.scopeId,
						mergedIntoId: null,
					},
				});
				if (!target)
					throw new Error("Merge target was not found in this scope");
			}
			const request = await tx.assistantFeatureRequest.update({
				where: { id: input.requestId },
				data: {
					...(input.status ? { status: input.status } : {}),
					...(input.assignedToUserId !== undefined
						? { assignedToUserId: input.assignedToUserId }
						: {}),
					...(input.mergedIntoId
						? { mergedIntoId: input.mergedIntoId, status: "duplicate" }
						: {}),
					...(input.reviewAnalysis
						? { reviewedAnalysisAt: now, reviewedByUserId: adminUserId }
						: {}),
					lastEventSequence: { increment: 1 },
				},
			});
			await tx.assistantFeatureRequestEvent.create({
				data: {
					requestId: request.id,
					sequence: request.lastEventSequence,
					type: input.mergedIntoId ? "request_merged" : "request_triaged",
					actorUserId: adminUserId,
					payload: {
						status: request.status,
						assignedToUserId: request.assignedToUserId,
						mergedIntoId: request.mergedIntoId,
						reviewAnalysis: input.reviewAnalysis === true,
						note: input.note,
					} as Prisma.InputJsonValue,
				},
			});
			return request;
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}

export async function publishAssistantCapabilityRelease(
	db: Database,
	adminUserId: number,
	rawInput: unknown,
	now = new Date(),
) {
	const input = assistantCapabilityReleaseSchema.parse(rawInput);
	if (input.rolloutEvidence.verifiedAt.getTime() > now.getTime())
		throw new Error("Rollout verification cannot be in the future");
	const authority = getAssistantReleaseAuthority(input.capabilityKey);
	if (
		!authority ||
		authority.capability !== "implemented" ||
		String(authority.version) !== input.version ||
		input.capabilityKey === "system_request_capability"
	)
		throw new Error(
			"Capability release does not match the current implemented registry",
		);
	const grantPolicy = {
		allOf: authority.requiredGrants,
		anyOf: authority.anyOfGrants,
	};
	return db.$transaction(
		async (tx) => {
			const requests = await tx.assistantFeatureRequest.findMany({
				where: { id: { in: input.requestIds }, mergedIntoId: null },
				select: { id: true, status: true },
			});
			if (requests.length !== new Set(input.requestIds).size)
				throw new Error("Every release request must exist and be canonical");
			if (
				requests.some(
					(request) =>
						!["planned", "building", "testing"].includes(request.status),
				)
			)
				throw new Error(
					"Every release request must be accepted before publishing",
				);
			const mergedRequests = await tx.assistantFeatureRequest.findMany({
				where: { mergedIntoId: { in: input.requestIds } },
				select: { id: true },
			});
			const linkedRequestIds = [
				...input.requestIds,
				...mergedRequests.map((request) => request.id),
			];
			const release = await tx.assistantCapabilityRelease.upsert({
				where: {
					capabilityKey_version: {
						capabilityKey: input.capabilityKey,
						version: input.version,
					},
				},
				create: {
					capabilityKey: input.capabilityKey,
					version: input.version,
					title: authority.title,
					status: "available",
					requiredGrants: grantPolicy,
					rolloutEvidence: input.rolloutEvidence as Prisma.InputJsonValue,
					verifiedAt: input.rolloutEvidence.verifiedAt,
					verifiedByUserId: adminUserId,
					publishedAt: now,
					publishedByUserId: adminUserId,
				},
				update: {
					title: authority.title,
					status: "available",
					requiredGrants: grantPolicy,
					rolloutEvidence: input.rolloutEvidence as Prisma.InputJsonValue,
					verifiedAt: input.rolloutEvidence.verifiedAt,
					verifiedByUserId: adminUserId,
					publishedAt: now,
					publishedByUserId: adminUserId,
				},
			});
			await tx.assistantFeatureRequest.updateMany({
				where: { id: { in: linkedRequestIds } },
				data: {
					releaseId: release.id,
					capabilityKey: input.capabilityKey,
					status: "available",
				},
			});
			const subscriptions = await tx.assistantFeatureSubscription.findMany({
				where: {
					requestId: { in: linkedRequestIds },
					activeKey: "active",
					unsubscribedAt: null,
				},
			});
			for (const subscription of subscriptions) {
				await tx.assistantFeatureNotificationOutbox.upsert({
					where: {
						dedupeKey: hash({
							kind: "release_available",
							subscriptionId: subscription.id,
							releaseId: release.id,
						}),
					},
					create: {
						requestId: subscription.requestId,
						subscriptionId: subscription.id,
						releaseId: release.id,
						kind: "release_available",
						dedupeKey: hash({
							kind: "release_available",
							subscriptionId: subscription.id,
							releaseId: release.id,
						}),
					},
					update: {},
				});
			}
			return { release, queuedNotices: subscriptions.length };
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}

export async function deliverNextAssistantFeatureNotification(
	db: Database,
	dependencies: {
		notifyDevelopers(request: {
			outboxId: string;
			id: string;
			summary: string;
			ownerUserId: number;
		}): Promise<void>;
		notifySubscriber(input: {
			outboxId: string;
			subscriptionId: string;
			userId: number;
			scopeType: string;
			scopeId: string;
			requestId: string;
			title: string;
			capabilityKey: string;
			version: string;
			grantPolicy: { allOf: string[]; anyOf: string[] };
		}): Promise<void>;
		canAccess(
			userId: number,
			grantPolicy: { allOf: string[]; anyOf: string[] },
			scope: { scopeType: string; scopeId: string },
		): Promise<boolean>;
	},
	now = new Date(),
) {
	const staleDeliveryAt = new Date(now.getTime() - 5 * 60_000);
	const item = await db.assistantFeatureNotificationOutbox.findFirst({
		where: {
			OR: [
				{
					status: { in: ["pending", "retrying"] },
					availableAt: { lte: now },
				},
				{ status: "delivering", availableAt: { lte: staleDeliveryAt } },
			],
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		include: { request: true, subscription: true, release: true },
	});
	if (!item) return { status: "idle" as const };
	const claim = await db.assistantFeatureNotificationOutbox.updateMany({
		where: {
			id: item.id,
			status: item.status,
			attempts: item.attempts,
			availableAt: item.availableAt,
		},
		data: {
			status: "delivering",
			attempts: { increment: 1 },
			availableAt: new Date(now.getTime() + 5 * 60_000),
		},
	});
	if (claim.count !== 1) return { status: "contended" as const };
	const claimedAttempts = item.attempts + 1;
	try {
		if (item.kind === "developer_intake") {
			await dependencies.notifyDevelopers({
				outboxId: item.id,
				id: item.request.id,
				summary: item.request.summary,
				ownerUserId: item.request.ownerUserId,
			});
		} else {
			const subscription = item.subscription;
			const release = item.release;
			const legacyGrants = z
				.array(z.string().trim().min(1).max(100))
				.safeParse(release?.requiredGrants);
			const storedPolicy = z
				.object({
					allOf: z.array(z.string()),
					anyOf: z.array(z.string()),
				})
				.safeParse(release?.requiredGrants);
			const grantPolicy = storedPolicy.success
				? storedPolicy.data
				: legacyGrants.success
					? { allOf: legacyGrants.data, anyOf: [] }
					: null;
			if (
				!subscription ||
				subscription.activeKey !== "active" ||
				subscription.unsubscribedAt ||
				!release ||
				release.status !== "available" ||
				!release.verifiedAt ||
				!release.publishedAt ||
				!grantPolicy ||
				!(await dependencies.canAccess(subscription.userId, grantPolicy, {
					scopeType: subscription.scopeType,
					scopeId: subscription.scopeId,
				}))
			) {
				const cancelled =
					await db.assistantFeatureNotificationOutbox.updateMany({
						where: {
							id: item.id,
							status: "delivering",
							attempts: claimedAttempts,
						},
						data: {
							status: "cancelled",
							lastErrorCode: "CONSENT_OR_ACCESS_REVOKED",
						},
					});
				if (cancelled.count !== 1) return { status: "contended" as const };
				return { status: "cancelled" as const, id: item.id };
			}
			await dependencies.notifySubscriber({
				outboxId: item.id,
				subscriptionId: subscription.id,
				userId: subscription.userId,
				scopeType: subscription.scopeType,
				scopeId: subscription.scopeId,
				requestId: item.request.id,
				title: release.title,
				capabilityKey: release.capabilityKey,
				version: release.version,
				grantPolicy,
			});
		}
		const delivered = await db.assistantFeatureNotificationOutbox.updateMany({
			where: {
				id: item.id,
				status: "delivering",
				attempts: claimedAttempts,
			},
			data: { status: "delivered", deliveredAt: now, lastErrorCode: null },
		});
		if (delivered.count !== 1) return { status: "contended" as const };
		return { status: "delivered" as const, id: item.id };
	} catch {
		const retry = await db.assistantFeatureNotificationOutbox.updateMany({
			where: {
				id: item.id,
				status: "delivering",
				attempts: claimedAttempts,
			},
			data: {
				status: "retrying",
				lastErrorCode: "DELIVERY_FAILED",
				availableAt: new Date(
					now.getTime() + Math.min(60, 2 ** (item.attempts + 1)) * 60_000,
				),
			},
		});
		if (retry.count !== 1) return { status: "contended" as const };
		return { status: "retrying" as const, id: item.id };
	}
}
