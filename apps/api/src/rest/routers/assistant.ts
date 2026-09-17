import { randomUUID } from "node:crypto";
import { AssistantAccessDisabledError } from "@api/assistant/access-governance";
import { resolveAssistantActor } from "@api/assistant/actor";
import { executeAssistantConversationTurn } from "@api/assistant/execute-turn";
import { captureAssistantDiagnostic } from "@api/assistant/diagnostics";
import { AssistantOperationError } from "@api/assistant/operation-diagnostics";
import { presentAssistantOutcome, type AssistantOutcome } from "@api/assistant/outcomes";
import { resolveAssistantIntegrationIds } from "@api/assistant/integrations";
import { getAssistantAllowedOrigins } from "@api/assistant/origins";
import {
	AssistantProviderDisabledError,
	assertAssistantProviderEnabled,
	getAssistantRuntimeIdentity,
} from "@api/assistant/runtime";
import { getAssistantRuntimeConfiguration } from "@api/assistant/runtime-settings";
import {
	getAssistantPreferences,
	listAssistantPersonalMemories,
} from "@api/assistant/saved-actions";
import {
	type AssistantChatRequest,
	assistantChatRequestSchema,
	assistantReconnectParamsSchema,
	assistantReconnectResponseSchema,
} from "@api/schemas/assistant";
import { createTRPCContext } from "@api/trpc/init";
import { sendAssistantRedisCommand } from "@api/assistant/redis-command";
import { type Prisma, db } from "@gnd/db";
import {
	AssistantConversationAccessError,
	AssistantIdempotencyConflictError,
	AssistantMessageValidationError,
	AssistantQuotaExceededError,
	AssistantQuotaUnavailableError,
	aggregateAssistantUsageEvents,
	claimAssistantRunForExecution,
	appendAssistantGeneratedMessage,
	completeAssistantRun,
	createOrReuseAssistantRequestRun,
	estimateAssistantUsageCostMicros,
	findAssistantUsagePrice,
	getAssistantRunForReconnect,
	normalizeAssistantProviderUsageCalls,
	reserveAssistantQuota,
} from "@gnd/db/queries";
import { OpenAPIHono } from "@hono/zod-openapi";
import {
	type UIDataTypes,
	type UIMessage,
	type UIMessageStreamWriter,
	createUIMessageStream,
	createUIMessageStreamResponse,
} from "ai";
import { cors } from "hono/cors";

export type AssistantStreamActor = {
	userId: number;
	scopeType: string;
	scopeId: string;
	locale: string;
	timezone: string;
	grants: Record<string, boolean>;
	fullName?: string | null;
	teamName?: string | null;
	baseCurrency?: string;
	dateFormat?: string | null;
	timeFormat?: 12 | 24;
	countryCode?: string | null;
};

type AssistantStreamData = UIDataTypes & {
	"rate-limit": { limit: number; remaining: number; resetAt: string };
	title: { conversationId: string; title: string };
	run: { runId: string; status: string };
	sequence: { messageSequence: number; runSequence: number };
	source: {
		kind: string;
		id: string;
		label: string;
		url?: string;
		observedAt?: string;
		freshness?: string;
	};
	"assistant-card": {
		kind:
			| "empty"
			| "ambiguity"
			| "partial"
			| "permission"
			| "degraded"
			| "recoverable-error";
		title: string;
		description?: string;
		actionLabel?: string;
	};
	"assistant-tool": {
		id: string;
		name: string;
		status: "queued" | "running" | "complete" | "failed" | "approval-required";
		retryId?: string;
		retryExpiresAt?: string;
	};
	warning: { code: string; message: string };
	"terminal-status": { runId: string; status: string; errorCode?: string };
};

type AssistantStreamMessage = UIMessage<unknown, AssistantStreamData>;
type AssistantWriter = UIMessageStreamWriter<AssistantStreamMessage>;

type StartedRun = {
	runId: string;
	modelIdentity?: string;
	triggerMessageId?: string;
	messageSequence: number;
	runSequence: number;
	status: string;
	shouldExecute: boolean;
};

type RunOutcome = {
	status: "succeeded" | "failed" | "cancelled";
	usage?: Prisma.InputJsonValue;
	committed?: boolean;
	errorCode?: string;
	errorMessage?: string;
};

type AssistantRouterDependencies = {
	captureDiagnostic: typeof captureAssistantDiagnostic;
	persistFailure(input: { actor: AssistantStreamActor; conversationId: string; runId: string; parentMessageId: string | null; outcome: AssistantOutcome }): Promise<unknown>;
	resolveActor(request: Request): Promise<AssistantStreamActor | null>;
	resolveIntegrations(
		actor: AssistantStreamActor,
		integrationIds: string[],
	): Promise<string[]>;
	startRun(input: {
		actor: AssistantStreamActor;
		conversationId: string;
		requestId: string;
		messageId: string;
		parts: AssistantChatRequest["message"]["parts"];
	}): Promise<StartedRun>;
	completeRun(input: {
		actor: AssistantStreamActor;
		runId: string;
		status: RunOutcome["status"];
		usage?: Prisma.InputJsonValue;
		errorCode?: string;
		errorMessage?: string;
	}): Promise<unknown>;
	readRun(input: {
		actor: AssistantStreamActor;
		runId: string;
		afterSequence: number;
		afterRunSequence: number;
	}): Promise<unknown | null>;
	recoverFinalization(input: {
		actor: AssistantStreamActor;
		runId: string;
		status: RunOutcome["status"];
		usage?: Prisma.InputJsonValue;
	}): Promise<void>;
	executeRun(input: {
		actor: AssistantStreamActor;
		reauthorizeActor: () => Promise<AssistantStreamActor>;
		request: AssistantChatRequest;
		run: StartedRun;
		writer: AssistantWriter;
		signal: AbortSignal;
	}): Promise<RunOutcome>;
	guard: AssistantRequestGuard;
	allowedOrigins: string[];
};

class AssistantLimitError extends Error {
	constructor(
		readonly status: 409 | 429 | 503,
		readonly code:
			| "CONCURRENCY_LIMIT_EXCEEDED"
			| "RATE_LIMIT_EXCEEDED"
			| "ASSISTANT_LIMITER_UNAVAILABLE",
		readonly limit: number,
		readonly remaining: number,
		readonly resetAt: Date,
	) {
		super(code);
	}
}

type AssistantLease = {
	limit: number;
	remaining: number;
	resetAt: Date;
	release(): void | Promise<void>;
};

type AssistantRequestGuard = {
	acquire(key: string, now?: number): AssistantLease | Promise<AssistantLease>;
};

export class AssistantStreamGuard {
	private readonly buckets = new Map<
		string,
		{ startedAt: number; requests: number; active: number }
	>();

	constructor(
		private readonly options = {
			windowMs: 10 * 60 * 1000,
			requestLimit: Number(process.env.CHAT_RATE_LIMIT) || 100,
			concurrencyLimit: 2,
		},
	) {}

	acquire(key: string, now = Date.now()) {
		let bucket = this.buckets.get(key);
		if (!bucket || now - bucket.startedAt >= this.options.windowMs) {
			bucket = { startedAt: now, requests: 0, active: 0 };
			this.buckets.set(key, bucket);
		}
		const resetAt = new Date(bucket.startedAt + this.options.windowMs);
		if (bucket.requests >= this.options.requestLimit) {
			throw new AssistantLimitError(
				429,
				"RATE_LIMIT_EXCEEDED",
				this.options.requestLimit,
				0,
				resetAt,
			);
		}
		if (bucket.active >= this.options.concurrencyLimit) {
			throw new AssistantLimitError(
				409,
				"CONCURRENCY_LIMIT_EXCEEDED",
				this.options.concurrencyLimit,
				0,
				resetAt,
			);
		}
		bucket.requests += 1;
		bucket.active += 1;
		let released = false;
		return {
			limit: this.options.requestLimit,
			remaining: Math.max(this.options.requestLimit - bucket.requests, 0),
			resetAt,
			release: () => {
				if (released) return;
				released = true;
				bucket.active = Math.max(bucket.active - 1, 0);
			},
		};
	}
}


type AssistantRedisCommand = <T>(command: (string | number)[]) => Promise<T>;

export class DistributedAssistantStreamGuard implements AssistantRequestGuard {
	constructor(
		private readonly options = {
			windowMs: 10 * 60 * 1000,
			requestLimit: Number(process.env.CHAT_RATE_LIMIT) || 100,
			concurrencyLimit: 2,
		},
		private readonly developmentFallback = new AssistantStreamGuard(),
		private readonly command: AssistantRedisCommand = sendAssistantRedisCommand,
	) {}

	async acquire(key: string, now = Date.now()): Promise<AssistantLease> {
		const rateKey = `assistant:rate:${key}`;
		const activeKey = `assistant:active:${key}`;
		const leaseId = randomUUID();
		const leaseTtlMs = 90_000;
		try {
			const [rateCount, rawRateTtlMs] = await this.command<[number, number]>([
				"EVAL",
				"redis.call('ZREMRANGEBYSCORE',KEYS[2],'-inf',ARGV[1]); local active=redis.call('ZCARD',KEYS[2]); local rate=tonumber(redis.call('GET',KEYS[1]) or '0'); local ttl=redis.call('PTTL',KEYS[1]); if active>=tonumber(ARGV[2]) then return {-2,ttl} end; if rate>=tonumber(ARGV[3]) then return {-1,ttl} end; rate=redis.call('INCR',KEYS[1]); if rate==1 then redis.call('PEXPIRE',KEYS[1],ARGV[4]) end; ttl=redis.call('PTTL',KEYS[1]); redis.call('ZADD',KEYS[2],ARGV[5],ARGV[6]); redis.call('PEXPIRE',KEYS[2],ARGV[7]); return {rate,ttl}",
				2,
				rateKey,
				activeKey,
				now,
				this.options.concurrencyLimit,
				this.options.requestLimit,
				this.options.windowMs,
				now + leaseTtlMs,
				leaseId,
				leaseTtlMs,
			]);
			const rateTtlMs = rawRateTtlMs > 0 ? rawRateTtlMs : this.options.windowMs;
			const rateResetAt = new Date(now + rateTtlMs);
			if (rateCount === -1) {
				throw new AssistantLimitError(
					429,
					"RATE_LIMIT_EXCEEDED",
					this.options.requestLimit,
					0,
					rateResetAt,
				);
			}
			if (rateCount === -2) {
				throw new AssistantLimitError(
					409,
					"CONCURRENCY_LIMIT_EXCEEDED",
					this.options.concurrencyLimit,
					0,
					new Date(now + this.options.windowMs),
				);
			}
			let released = false;
			const renew = async () => {
				const renewalTime = Date.now();
				await this.command([
					"EVAL",
					"if redis.call('ZSCORE',KEYS[1],ARGV[1]) then redis.call('ZADD',KEYS[1],ARGV[2],ARGV[1]); redis.call('PEXPIRE',KEYS[1],ARGV[3]); return 1 end; return 0",
					1,
					activeKey,
					leaseId,
					renewalTime + leaseTtlMs,
					leaseTtlMs,
				]);
			};
			const heartbeat = setInterval(() => {
				void renew().catch(() => undefined);
			}, 30_000);
			heartbeat.unref?.();
			return {
				limit: this.options.requestLimit,
				remaining: Math.max(this.options.requestLimit - rateCount, 0),
				resetAt: rateResetAt,
				release: async () => {
					if (released) return;
					released = true;
					clearInterval(heartbeat);
					await this.command(["ZREM", activeKey, leaseId]).catch(
						() => undefined,
					);
				},
			};
		} catch (error) {
			if (error instanceof AssistantLimitError) throw error;
			if (process.env.NODE_ENV !== "production") {
				return this.developmentFallback.acquire(key, now);
			}
			throw new AssistantLimitError(
				503,
				"ASSISTANT_LIMITER_UNAVAILABLE",
				this.options.requestLimit,
				0,
				new Date(now + this.options.windowMs),
			);
		}
	}
}

class AssistantPayloadTooLargeError extends Error {}

async function readBoundedJson(request: Request, maxBytes = 256 * 1024) {
	const contentLength = Number(request.headers.get("content-length") ?? 0);
	if (Number.isFinite(contentLength) && contentLength > maxBytes) {
		throw new AssistantPayloadTooLargeError();
	}
	if (!request.body) return null;
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel();
			throw new AssistantPayloadTooLargeError();
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return JSON.parse(new TextDecoder().decode(bytes));
}

function jsonError(code: string, message: string, status: number) {
	return new Response(JSON.stringify({ error: { code, message } }), {
		status,
		headers: { "content-type": "application/json; charset=UTF-8" },
	});
}

function isAllowedOrigin(request: Request, allowedOrigins: string[]) {
	const origin = request.headers.get("origin");
	if (!origin) return true;
	return (
		origin === new URL(request.url).origin || allowedOrigins.includes(origin)
	);
}

function publicRequestError(error: unknown) {
	if (error instanceof AssistantAccessDisabledError) {
		return jsonError(
			"ASSISTANT_ACCESS_DISABLED",
			presentAssistantOutcome({ kind: "denied" }).message,
			403,
		);
	}
	if (error instanceof AssistantProviderDisabledError) {
		return jsonError(error.code, "Assistant service is temporarily disabled", 503);
	}
	if (error instanceof AssistantMessageValidationError) {
		return jsonError(error.code, error.message, 400);
	}
	if (error instanceof AssistantIdempotencyConflictError) {
		return jsonError(error.code, error.message, 409);
	}
	if (error instanceof AssistantConversationAccessError) {
		return jsonError(error.code, error.message, 404);
	}
	if (error instanceof AssistantQuotaExceededError) {
		return new Response(
			JSON.stringify({
				error: { code: error.code, message: error.message },
				quota: {
					dimension: error.dimension,
					limit: error.limit,
					remaining: error.remaining,
					resetAt: error.resetAt.toISOString(),
				},
			}),
			{
				status: 429,
				headers: { "content-type": "application/json; charset=UTF-8" },
			},
		);
	}
	if (error instanceof AssistantQuotaUnavailableError) {
		return jsonError(error.code, error.message, 503);
	}
	if (error instanceof AssistantLimitError) {
		return new Response(
			JSON.stringify({
				error: { code: error.code, message: "Assistant request limit reached" },
				limit: error.limit,
				remaining: error.remaining,
				resetAt: error.resetAt.toISOString(),
			}),
			{
				status: error.status,
				headers: { "content-type": "application/json; charset=UTF-8" },
			},
		);
	}
	if (error instanceof AssistantPayloadTooLargeError) {
		return jsonError(
			"ASSISTANT_PAYLOAD_TOO_LARGE",
			"Request body is too large",
			413,
		);
	}
	return jsonError("ASSISTANT_REQUEST_FAILED", "Assistant request failed", 500);
}

function sanitizeRunOutcome(outcome: RunOutcome): RunOutcome {
	if (
		!(["succeeded", "failed", "cancelled"] as string[]).includes(outcome.status)
	) {
		return {
			status: "failed",
			errorCode: "ASSISTANT_RUNTIME_INVALID_OUTCOME",
			errorMessage: "Assistant runtime failed",
		};
	}
	if (outcome.status === "succeeded") {
		return {
			status: outcome.status,
			usage: outcome.usage,
			committed: outcome.committed === true,
		};
	}
	const safeCode =
		outcome.errorCode && /^[A-Z][A-Z0-9_]{0,99}$/.test(outcome.errorCode)
			? outcome.errorCode
			: outcome.status === "cancelled"
				? "ASSISTANT_RUN_CANCELLED"
				: "ASSISTANT_RUNTIME_FAILED";
	return {
		status: outcome.status,
		usage: outcome.usage,
		errorCode: safeCode,
		errorMessage:
			outcome.status === "cancelled"
				? "Assistant run cancelled"
				: "Assistant runtime failed",
	};
}

const defaultGuard = new DistributedAssistantStreamGuard();

const defaultDependencies: AssistantRouterDependencies = {
	persistFailure: ({ actor, conversationId, runId, parentMessageId, outcome }) => appendAssistantGeneratedMessage(db, {
		conversationId, runId, parentMessageId,
		ownerUserId: actor.userId, scopeType: actor.scopeType, scopeId: actor.scopeId,
		parts: [{ type: "data-assistant-outcome", id: "assistant-outcome", data: outcome }, { type: "text", text: presentAssistantOutcome(outcome).message }],
		searchText: presentAssistantOutcome(outcome).message,
	}),
	captureDiagnostic: captureAssistantDiagnostic,
	async resolveActor(request) {
		const honoContext = {
			req: {
				header: (name?: string) =>
					name
						? (request.headers.get(name) ?? undefined)
						: Object.fromEntries(request.headers),
				path: new URL(request.url).pathname,
				raw: request,
			},
			var: {},
		} as never;
		const context = await createTRPCContext(undefined, honoContext);
		if (!context.userId) return null;
		const actor = await resolveAssistantActor(context.db, context.userId);
		if (!actor) throw new AssistantAccessDisabledError();
		return actor;
	},
	async startRun(input) {
		const configuration = await getAssistantRuntimeConfiguration(db);
		assertAssistantProviderEnabled(configuration.selection.provider);
		const runtimeIdentity = getAssistantRuntimeIdentity({
			ASSISTANT_AI_PROVIDER: configuration.selection.provider,
			ASSISTANT_AI_MODEL: configuration.selection.model,
		});
		const requestRun = await createOrReuseAssistantRequestRun(db, {
			conversationId: input.conversationId,
			ownerUserId: input.actor.userId,
			scopeType: input.actor.scopeType,
			scopeId: input.actor.scopeId,
			clientMessageId: input.messageId,
			requestId: input.requestId,
			parts: input.parts,
			catalogVersion: runtimeIdentity.catalogVersion,
			model: runtimeIdentity.modelIdentity,
			promptVersion: runtimeIdentity.promptVersion,
		});
		await reserveAssistantQuota(db, {
			runId: requestRun.run.id,
			actorUserId: input.actor.userId,
			scopeType: input.actor.scopeType,
			scopeId: input.actor.scopeId,
			modelIdentity: runtimeIdentity.modelIdentity,
		});
		const claim = await claimAssistantRunForExecution(db, {
			runId: requestRun.run.id,
			ownerUserId: input.actor.userId,
			scopeType: input.actor.scopeType,
			scopeId: input.actor.scopeId,
		});
		return {
			runId: claim.run.id,
			modelIdentity: claim.run.model,
			triggerMessageId: requestRun.message.id,
			messageSequence: requestRun.message.sequence,
			runSequence: claim.run.lastSequence,
			status: claim.run.status,
			shouldExecute: claim.claimed,
		};
	},
	async resolveIntegrations(actor, integrationIds) {
		return resolveAssistantIntegrationIds(actor, integrationIds);
	},
	completeRun(input) {
		return completeAssistantRun(db, {
			runId: input.runId,
			ownerUserId: input.actor.userId,
			scopeType: input.actor.scopeType,
			scopeId: input.actor.scopeId,
			status: input.status,
			usage: input.usage,
			errorCode: input.errorCode,
			errorMessage: input.errorMessage,
		});
	},
	readRun(input) {
		return getAssistantRunForReconnect(db, {
			runId: input.runId,
			ownerUserId: input.actor.userId,
			scopeType: input.actor.scopeType,
			scopeId: input.actor.scopeId,
			afterSequence: input.afterSequence,
			afterRunSequence: input.afterRunSequence,
		});
	},
	async recoverFinalization(input) {
		const usage =
			input.usage &&
			typeof input.usage === "object" &&
			!Array.isArray(input.usage)
				? input.usage
				: null;
		const completedAt = new Date();
		await db.$transaction(async (tx) => {
			const run = await tx.assistantRun.findFirst({
				where: {
					id: input.runId,
					actorUserId: input.actor.userId,
					conversation: {
						ownerUserId: input.actor.userId,
						scopeType: input.actor.scopeType,
						scopeId: input.actor.scopeId,
						deletedAt: null,
					},
				},
				select: {
					id: true,
					actorUserId: true,
					model: true,
					startedAt: true,
				},
			});
			if (!run) return;
			const recovered = await tx.assistantRun.updateMany({
				where: {
					id: run.id,
					status: { notIn: ["succeeded", "failed", "cancelled"] },
				},
				data: {
					status: input.status,
					usage: input.usage,
					errorCode: "ASSISTANT_FINALIZATION_RECOVERED",
					errorMessage: "Assistant run finalization required recovery",
					completedAt,
				},
			});
			// If another request finalized the run while primary finalization was
			// failing, never attach this fallback outcome or settle its quota. The
			// canonical completion path owns the already-terminal run.
			if (recovered.count !== 1) return;
			const cancelledBeforeProvider =
				input.status === "cancelled" && usage?.providerAttempted === false;
			const normalizedCalls = cancelledBeforeProvider
				? []
				: normalizeAssistantProviderUsageCalls(
						input.usage,
						run.model,
						run.id,
					);
			const toolCallCount = normalizedCalls.length
				? await tx.assistantToolExecution.count({ where: { runId: run.id } })
				: 0;
			for (const [index, normalized] of normalizedCalls.entries()) {
				const price = await findAssistantUsagePrice(
					tx,
					normalized,
					completedAt,
				);
				const estimatedCostMicros = estimateAssistantUsageCostMicros(
					normalized,
					price,
				);
				await tx.assistantUsageEvent.upsert({
					where: { providerRequestId: normalized.providerRequestId },
					create: {
						runId: run.id,
						providerRequestId: normalized.providerRequestId,
						actorUserId: run.actorUserId,
						scopeType: input.actor.scopeType,
						scopeId: input.actor.scopeId,
						provider: normalized.provider,
						model: normalized.model,
						requestClass: "chat",
						inputTokens: normalized.inputTokens,
						cachedInputTokens: normalized.cachedInputTokens,
						outputTokens: normalized.outputTokens,
						reasoningTokens: normalized.reasoningTokens,
						totalTokens: normalized.totalTokens,
						toolCallCount:
							normalized.toolCallCount ?? (index === 0 ? toolCallCount : 0),
						durationMs: run.startedAt
							? Math.max(0, completedAt.getTime() - run.startedAt.getTime())
							: null,
						outcome: input.status,
						estimatedCostMicros,
						priceVersion: price?.version ?? null,
						accountingStatus:
							normalized.totalTokens === null ? "unknown" : "reported",
						startedAt: run.startedAt,
						completedAt,
					},
					update: {},
				});
			}
			const usageEvents = await tx.assistantUsageEvent.findMany({
				where: { runId: run.id },
				select: { totalTokens: true, estimatedCostMicros: true },
			});
			const { actualTokens, actualCostMicros } =
				aggregateAssistantUsageEvents(usageEvents);
			await tx.assistantQuotaReservation.updateMany({
				where: {
					runId: run.id,
					status: { in: ["reserved", "expired"] },
				},
				data: cancelledBeforeProvider
					? {
							status: "released",
							actualTokens: 0n,
							actualCostMicros: 0n,
							settledAt: completedAt,
						}
					: {
							status: "settled",
							actualTokens,
							actualCostMicros,
							settledAt: completedAt,
						},
			});
		});
	},
	async executeRun({ actor, reauthorizeActor, request, run, writer, signal }) {
		const [preferences, memories] = await Promise.all([
			getAssistantPreferences(db, actor),
			listAssistantPersonalMemories(db, actor),
		]);
		return executeAssistantConversationTurn({
			actor: {
				userId: actor.userId,
				scopeType: actor.scopeType,
				scopeId: actor.scopeId,
				fullName: actor.fullName ?? null,
				teamName: actor.teamName ?? null,
				locale: actor.locale,
				timezone: actor.timezone,
				baseCurrency: actor.baseCurrency ?? "USD",
				dateFormat: actor.dateFormat ?? null,
				timeFormat: actor.timeFormat ?? 12,
				countryCode: actor.countryCode ?? null,
				responseStyle: preferences.responseStyle,
				responseDetail: preferences.responseDetail,
				chartPresentation: preferences.chartPresentation,
				personalMemory: memories.map(({ content }) => content),
				grants: actor.grants,
			},
			request,
			run,
			writer,
			signal,
			reauthorizeActor: async () => {
				const currentActor = await reauthorizeActor();
				return {
					...currentActor,
					fullName: currentActor.fullName ?? null,
					teamName: currentActor.teamName ?? null,
					baseCurrency: currentActor.baseCurrency ?? "USD",
					dateFormat: currentActor.dateFormat ?? null,
					timeFormat: currentActor.timeFormat ?? 12,
					countryCode: currentActor.countryCode ?? null,
				};
			},
		});
	},
	guard: defaultGuard,
	allowedOrigins: getAssistantAllowedOrigins({
		ALLOWED_API_ORIGINS: process.env.ALLOWED_API_ORIGINS,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
		PORTLESS_URL: process.env.PORTLESS_URL,
	}),
};

export function createAssistantChatRouter(
	overrides: Partial<AssistantRouterDependencies> = {},
) {
	const dependencies = { ...defaultDependencies, ...overrides };
	const router = new OpenAPIHono();
	async function requestFailure(error: unknown, actor?: AssistantStreamActor) {
		const response = publicRequestError(error);
		const kind: AssistantOutcome["kind"] = response.status >= 500 ? "temporary" : response.status === 429 ? "limit" : response.status === 409 ? "conflict" : response.status === 404 ? "empty" : response.status === 403 ? "denied" : "input";
		const diagnostic = response.status >= 500 ? await dependencies.captureDiagnostic(error, {
			stage: "request", operation: "assistant.start", requestId: randomUUID(),
			actorUserId: actor?.userId, scopeType: actor?.scopeType, scopeId: actor?.scopeId, outcome: kind,
		}) : null;
		const outcome = { kind, ...(diagnostic ? { reference: diagnostic.reference } : {}) };
		const body = await response.json() as { error: { code: string; message: string } };
		return new Response(JSON.stringify({ ...body, error: { ...body.error, message: presentAssistantOutcome(outcome).message }, outcome }), { status: response.status, headers: response.headers });
	}
	router.onError(async error => requestFailure(error));
	router.use(
		"*",
		cors({
			origin: dependencies.allowedOrigins,
			allowMethods: ["GET", "POST", "OPTIONS"],
			allowHeaders: [
				"Authorization",
				"Content-Type",
				"x-app-authorization",
				"x-trpc-source",
				"x-request-id",
				"x-user-timezone",
			],
			exposeHeaders: ["x-request-id"],
			credentials: true,
			maxAge: 86400,
		}),
	);

	router.post("/", async (context) => {
		if (!isAllowedOrigin(context.req.raw, dependencies.allowedOrigins)) {
			return context.json(
				{
					error: { code: "ORIGIN_FORBIDDEN", message: "Origin is not allowed" },
				},
				403,
			);
		}
		const actor = await dependencies.resolveActor(context.req.raw);
		if (!actor) {
			return context.json(
				{ error: { code: "UNAUTHORIZED", message: presentAssistantOutcome({ kind: "signed-out" }).message }, outcome: { kind: "signed-out" as const } },
				401,
			);
		}

		let body: unknown;
		try {
			body = await readBoundedJson(context.req.raw);
		} catch (error) {
			if (error instanceof AssistantPayloadTooLargeError) {
				return publicRequestError(error);
			}
			return context.json(
				{
					error: { code: "INVALID_JSON", message: "Request body must be JSON" },
				},
				400,
			);
		}
		const parsed = assistantChatRequestSchema.safeParse(body);
		if (!parsed.success) {
			return context.json(
				{
					error: {
						code: "INVALID_ASSISTANT_MESSAGE",
						message: "Message is invalid",
					},
				},
				400,
			);
		}
		const resolvedIntegrationIds = await dependencies.resolveIntegrations(
			actor,
			parsed.data.mentionedIntegrationIds,
		);
		if (
			resolvedIntegrationIds.length !==
			parsed.data.mentionedIntegrationIds.length
		) {
			return context.json(
				{
					error: {
						code: "INTEGRATION_NOT_AVAILABLE",
						message: "Mentioned integrations are not available yet",
					},
				},
				400,
			);
		}

		let lease: AssistantLease | undefined;
		let run: StartedRun;
		try {
			lease = await dependencies.guard.acquire(
				`${actor.userId}:${actor.scopeType}:${actor.scopeId}`,
			);
			run = await dependencies.startRun({
				actor,
				conversationId: parsed.data.conversationId,
				requestId: parsed.data.requestId,
				messageId: parsed.data.message.id,
				parts: parsed.data.message.parts,
			});
		} catch (error) {
			await lease?.release();
			return requestFailure(error, actor);
		}

		const stream = createUIMessageStream<AssistantStreamMessage>({
			execute: async ({ writer }) => {
				if (!lease) throw new Error("Assistant stream lease is unavailable");
				try {
					writer.write({
						type: "data-rate-limit",
						id: "rate-limit",
						data: {
							limit: lease.limit,
							remaining: lease.remaining,
							resetAt: lease.resetAt.toISOString(),
						},
					});
					const firstText = parsed.data.message.parts.find(
						(part) => part.type === "text",
					);
					if (firstText && run.messageSequence === 1) {
						writer.write({
							type: "data-title",
							id: `title-${parsed.data.conversationId}`,
							data: {
								conversationId: parsed.data.conversationId,
								title: firstText.text.trim().slice(0, 80),
							},
						});
					}
					writer.write({
						type: "data-run",
						id: run.runId,
						data: { runId: run.runId, status: run.status },
					});
					writer.write({
						type: "data-sequence",
						id: `sequence-${run.runId}`,
						data: {
							messageSequence: run.messageSequence,
							runSequence: run.runSequence,
						},
					});
					if (!run.shouldExecute) {
						writer.write({
							type: "data-warning",
							id: `reused-${run.runId}`,
							data: {
								code: "ASSISTANT_RUN_REUSED",
								message: "The existing assistant run was resumed.",
							},
						});
						if (["succeeded", "failed", "cancelled"].includes(run.status)) {
							writer.write({
								type: "data-terminal-status",
								id: `terminal-${run.runId}`,
								data: { runId: run.runId, status: run.status },
							});
						}
						return;
					}

					let outcome: RunOutcome;
					try {
						const runtimeOutcome = await dependencies.executeRun({
							actor,
							reauthorizeActor: async () => {
								const currentActor = await dependencies.resolveActor(
									context.req.raw,
								);
								if (!currentActor) {
									throw new AssistantAccessDisabledError();
								}
								return currentActor;
							},
							request: {
								...parsed.data,
								timezone: actor.timezone,
								mentionedIntegrationIds: resolvedIntegrationIds,
							},
							run,
							writer,
							signal: context.req.raw.signal,
						});
						outcome = sanitizeRunOutcome(
							context.req.raw.signal.aborted && !runtimeOutcome.committed
								? { status: "cancelled", usage: runtimeOutcome.usage }
								: runtimeOutcome,
						);
					} catch (runtimeError) {
						if (!context.req.raw.signal.aborted) {
							const diagnostic = runtimeError instanceof AssistantOperationError ? null : await dependencies.captureDiagnostic(runtimeError, {
								stage: "stream", operation: "assistant.execute", runId: run.runId,
								conversationId: parsed.data.conversationId, requestId: parsed.data.requestId,
								actorUserId: actor.userId, scopeType: actor.scopeType, scopeId: actor.scopeId,
							});
							const publicOutcome: AssistantOutcome = runtimeError instanceof AssistantOperationError ? runtimeError.assistantOutcome : { kind: "temporary", reference: diagnostic!.reference };
							writer.write({ type: "data-assistant-outcome", id: "assistant-outcome", data: publicOutcome });
							try {
								await dependencies.persistFailure({ actor, conversationId: parsed.data.conversationId, runId: run.runId, parentMessageId: run.triggerMessageId ?? null, outcome: publicOutcome });
							} catch (saveError) {
								// The original failure remains the primary message. Never replay
								// execution just because its transcript could not be confirmed.
								let reference: string | undefined;
								try {
									reference = (await dependencies.captureDiagnostic(saveError, { stage: "history", operation: "assistant.saveFailure", outcome: "history-unconfirmed", runId: run.runId, conversationId: parsed.data.conversationId, requestId: parsed.data.requestId, actorUserId: actor.userId, scopeType: actor.scopeType, scopeId: actor.scopeId })).reference;
								} catch {
									console.error("assistant_history_diagnostic_failed", { runId: run.runId });
								}
								writer.write({ type: "data-assistant-history-notice", id: "assistant-history-notice", data: { kind: "history-unconfirmed", ...(reference ? { reference } : {}) } });
							}
						}
						outcome = {
							status: context.req.raw.signal.aborted ? "cancelled" : "failed",
							errorCode: context.req.raw.signal.aborted
								? "ASSISTANT_RUN_CANCELLED"
								: "ASSISTANT_RUNTIME_FAILED",
							errorMessage: context.req.raw.signal.aborted
								? "Assistant run cancelled"
								: "Assistant runtime failed",
						};
						try {
							await dependencies.completeRun({
								actor,
								runId: run.runId,
								...outcome,
							});
						} catch {
							await dependencies
								.recoverFinalization({
									actor,
									runId: run.runId,
									status: outcome.status,
									usage: outcome.usage,
								})
								.catch(() => undefined);
						}
						writer.write({
							type: "data-terminal-status",
							id: `terminal-${run.runId}`,
							data: {
								runId: run.runId,
								status: outcome.status,
								errorCode: outcome.errorCode,
							},
						});
						throw runtimeError;
					}
					try {
						await dependencies.completeRun({
							actor,
							runId: run.runId,
							...outcome,
						});
					} catch (finalizationError) {
						await dependencies
							.recoverFinalization({
								actor,
								runId: run.runId,
								status: outcome.status,
								usage: outcome.usage,
							})
							.catch(() => undefined);
						throw finalizationError;
					}
					writer.write({
						type: "data-terminal-status",
						id: `terminal-${run.runId}`,
						data: {
							runId: run.runId,
							status: outcome.status,
							...(outcome.errorCode ? { errorCode: outcome.errorCode } : {}),
						},
					});
				} finally {
					await lease.release();
				}
			},
			onError: () => "Assistant runtime failed",
		});
		return createUIMessageStreamResponse({
			stream,
			headers: { "Cache-Control": "private, no-store" },
		});
	});

	router.get("/runs/:runId", async (context) => {
		// CORS prevents browser JavaScript from reading a response, but it is not
		// an admission policy. Apply the same origin boundary as chat admission so
		// credentialed cross-origin reconnects cannot probe run state.
		if (!isAllowedOrigin(context.req.raw, dependencies.allowedOrigins)) {
			return context.json(
				{
					error: { code: "ORIGIN_FORBIDDEN", message: "Origin is not allowed" },
				},
				403,
			);
		}
		const actor = await dependencies.resolveActor(context.req.raw);
		if (!actor) {
			return context.json(
				{ error: { code: "UNAUTHORIZED", message: presentAssistantOutcome({ kind: "signed-out" }).message }, outcome: { kind: "signed-out" as const } },
				401,
			);
		}
		const parsed = assistantReconnectParamsSchema.safeParse({
			runId: context.req.param("runId"),
			afterSequence: context.req.query("afterSequence"),
			afterRunSequence: context.req.query("afterRunSequence"),
		});
		if (!parsed.success) {
			return context.json(
				{
					error: {
						code: "INVALID_CURSOR",
						message: "Reconnect cursor is invalid",
					},
				},
				400,
			);
		}
		const run = await dependencies.readRun({ actor, ...parsed.data });
		if (!run || typeof run !== "object") {
			return context.json(
				{
					error: {
						code: "ASSISTANT_RUN_NOT_FOUND",
						message: "Run was not found",
					},
				},
				404,
			);
		}
		const value = run as {
			id: string;
			status: string;
			lastSequence: number;
			errorCode?: string | null;
			completedAt?: Date | null;
			conversation?: {
				id?: string;
				messages?: Array<Record<string, unknown>>;
			};
			toolExecutions?: Array<Record<string, unknown>>;
			actionProposals?: Array<Record<string, unknown>>;
		};
		const asIsoString = (date: unknown) =>
			date instanceof Date
				? date.toISOString()
				: typeof date === "string"
					? date
					: null;
		const response = assistantReconnectResponseSchema.parse({
			runId: value.id,
			status: value.status,
			lastSequence: value.lastSequence,
			errorCode: value.errorCode ?? null,
			completedAt: asIsoString(value.completedAt),
			conversationId: value.conversation?.id ?? null,
			messages: (value.conversation?.messages ?? []).map((message) => ({
				id: message.id,
				sequence: message.sequence,
				role: message.role,
				parts: message.parts,
				createdAt: asIsoString(message.createdAt),
			})),
			toolExecutions: (value.toolExecutions ?? []).map((execution) => ({
				id: execution.id,
				eventSequence: execution.eventSequence,
				toolId: execution.toolId,
				toolVersion: execution.toolVersion,
				effect: execution.effect,
				status: execution.status,
				result: execution.result ?? null,
				errorCode: execution.errorCode ?? null,
				durationMs: execution.durationMs ?? null,
				completedAt: asIsoString(execution.completedAt),
			})),
			actionProposals: (value.actionProposals ?? []).map((proposal) => ({
				id: proposal.id,
				eventSequence: proposal.eventSequence,
				toolId: proposal.toolId,
				toolVersion: proposal.toolVersion,
				effect: proposal.effect,
				status: proposal.status,
				expiresAt: asIsoString(proposal.expiresAt),
			})),
		});
		context.header("Cache-Control", "private, no-store");
		return context.json(response);
	});

	return router;
}

export const assistantChatRouter = createAssistantChatRouter();
