import { createHash } from "node:crypto";
import { type Database, Prisma, type TransactionClient } from "..";

export const ASSISTANT_ATTACHMENT_OWNER_TYPE = "assistant_conversation";
export const ASSISTANT_MAX_MESSAGE_PARTS = 20;
export const ASSISTANT_MAX_TEXT_CHARS = 32_000;
export const ASSISTANT_MAX_TEXT_BYTES = 60_000;
export const ASSISTANT_MAX_ATTACHMENT_BYTES = 8_000_000;
export const ASSISTANT_MAX_ATTACHMENT_TOTAL_BYTES = 16_000_000;

export class AssistantConversationAccessError extends Error {
	readonly code = "ASSISTANT_CONVERSATION_NOT_FOUND";

	constructor() {
		super("Assistant conversation was not found for the current user");
		this.name = "AssistantConversationAccessError";
	}
}

export class AssistantMessageValidationError extends Error {
	readonly code = "ASSISTANT_MESSAGE_INVALID";

	constructor(message: string) {
		super(message);
		this.name = "AssistantMessageValidationError";
	}
}

export class AssistantIdempotencyConflictError extends Error {
	readonly code = "ASSISTANT_IDEMPOTENCY_CONFLICT";

	constructor() {
		super("The idempotency key is already bound to another assistant request");
		this.name = "AssistantIdempotencyConflictError";
	}
}

export class AssistantRunTerminalError extends Error {
	readonly code = "ASSISTANT_RUN_TERMINAL";

	constructor() {
		super("The assistant run is already terminal");
		this.name = "AssistantRunTerminalError";
	}
}

export type AssistantClientPart =
	| { type: "text"; text: string }
	| {
			type: "file";
			documentId: string;
	  };

export type AssistantPersistedToolResult = {
	status: string;
	sourceRefs?: string[];
	recordRefs?: string[];
	artifactId?: string;
	jobId?: string;
	warnings?: string[];
};

export type AssistantActorScope = {
	ownerUserId: number;
	scopeType?: string;
	scopeId?: string | null;
};

export type AssistantConversationCursor = {
	updatedAt: Date;
	id: string;
};

type ConversationIdentity = AssistantActorScope & {
	conversationId: string;
};

function resolveActorScope(input: AssistantActorScope) {
	const scopeType = input.scopeType?.trim() || "user";
	const scopeId = input.scopeId?.trim() || String(input.ownerUserId);
	return { ownerUserId: input.ownerUserId, scopeType, scopeId };
}

function normalizeFingerprintValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalizeFingerprintValue);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, child]) => [key, normalizeFingerprintValue(child)]),
		);
	}
	return value;
}

function fingerprint(value: unknown) {
	return createHash("sha256")
		.update(JSON.stringify(normalizeFingerprintValue(value)))
		.digest("hex");
}

const TERMINAL_ASSISTANT_RUN_STATUSES = new Set([
	"succeeded",
	"failed",
	"cancelled",
]);
const ACTIVE_ASSISTANT_RUN_STATUSES = new Set([
	"queued",
	"running",
	"waiting_for_tool",
	"waiting_for_approval",
]);
const ASSISTANT_CHECKPOINT_STATUSES = new Set([
	"running",
	"waiting_for_tool",
	"waiting_for_approval",
]);
const ASSISTANT_TOOL_STATUSES = new Set([
	"running",
	"succeeded",
	"failed",
	"cancelled",
]);

export function normalizeAssistantUsageReceipt(
	usageValue: Prisma.InputJsonValue | undefined,
	modelIdentity: string,
) {
	const usage =
		usageValue && typeof usageValue === "object" && !Array.isArray(usageValue)
			? (usageValue as Record<string, unknown>)
			: {};
	const token = (name: string) => {
		const value = usage[name];
		return typeof value === "number" && Number.isFinite(value) && value >= 0
			? Math.floor(value)
			: null;
	};
	const identity = modelIdentity.split(":", 2);
	return {
		provider:
			typeof usage.provider === "string" && usage.provider.trim()
				? usage.provider.trim().slice(0, 40)
				: identity.length === 2
					? identity[0] || "unknown"
					: "unknown",
		model:
			typeof usage.model === "string" && usage.model.trim()
				? usage.model.trim().slice(0, 100)
				: identity.length === 2
					? identity[1] || modelIdentity
					: modelIdentity,
		inputTokens: token("inputTokens"),
		cachedInputTokens: token("cachedInputTokens"),
		outputTokens: token("outputTokens"),
		reasoningTokens: token("reasoningTokens"),
		totalTokens: token("totalTokens"),
	};
}

export function normalizeAssistantProviderUsageCalls(
	usageValue: Prisma.InputJsonValue | undefined,
	modelIdentity: string,
	runId: string,
) {
	const usage =
		usageValue && typeof usageValue === "object" && !Array.isArray(usageValue)
			? (usageValue as Record<string, unknown>)
			: {};
	const rawCalls = Array.isArray(usage.calls) ? usage.calls.slice(0, 50) : [];
	if (rawCalls.length === 0) {
		return [
			{
				...normalizeAssistantUsageReceipt(usageValue, modelIdentity),
				providerRequestId: runId,
				toolCallCount: null,
			},
		];
	}
	return rawCalls.map((rawCall, index) => {
		const call =
			rawCall && typeof rawCall === "object" && !Array.isArray(rawCall)
				? (rawCall as Record<string, unknown>)
				: {};
		const normalized = normalizeAssistantUsageReceipt(
			call as Prisma.InputJsonObject,
			modelIdentity,
		);
		const rawToolCallCount = call.toolCallCount;
		return {
			...normalized,
			providerRequestId:
				typeof call.providerRequestId === "string" &&
				call.providerRequestId.trim()
					? call.providerRequestId.trim().slice(0, 191)
					: `${runId}:${index + 1}`.slice(0, 191),
			toolCallCount:
				typeof rawToolCallCount === "number" &&
				Number.isFinite(rawToolCallCount) &&
				rawToolCallCount >= 0
					? Math.floor(rawToolCallCount)
					: 0,
		};
	});
}

type AssistantUsageAmounts = ReturnType<typeof normalizeAssistantUsageReceipt>;

type AssistantUsagePrice = {
	version: string;
	inputPerMillionMicros: bigint;
	cachedPerMillionMicros: bigint;
	outputPerMillionMicros: bigint;
	reasoningPerMillionMicros: bigint;
};

export function estimateAssistantUsageCostMicros(
	usage: AssistantUsageAmounts,
	price: AssistantUsagePrice | null,
) {
	if (!price) return null;
	const categories = [
		[usage.inputTokens, price.inputPerMillionMicros],
		[usage.cachedInputTokens, price.cachedPerMillionMicros],
		[usage.outputTokens, price.outputPerMillionMicros],
		[usage.reasoningTokens, price.reasoningPerMillionMicros],
	] as const;
	if (!categories.some(([tokens]) => tokens !== null)) return null;
	const numerator = categories.reduce(
		(total, [tokens, rate]) => total + BigInt(tokens ?? 0) * rate,
		0n,
	);
	return (numerator + 500_000n) / 1_000_000n;
}

async function findAssistantUsagePrice(
	tx: TransactionClient,
	usage: Pick<AssistantUsageAmounts, "provider" | "model">,
	at: Date,
) {
	return tx.assistantModelPrice.findFirst({
		where: {
			provider: usage.provider,
			model: usage.model,
			effectiveFrom: { lte: at },
			OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
		},
		orderBy: { effectiveFrom: "desc" },
	});
}

function normalizeSearch(value?: string | null) {
	const normalized = value?.trim();
	return normalized ? normalized.slice(0, 500) : undefined;
}

function validateClientParts(parts: unknown[]): AssistantClientPart[] {
	if (!Array.isArray(parts) || parts.length === 0) {
		throw new AssistantMessageValidationError(
			"A user message must include at least one part",
		);
	}
	if (parts.length > ASSISTANT_MAX_MESSAGE_PARTS) {
		throw new AssistantMessageValidationError("The message has too many parts");
	}

	let textCharacters = 0;
	let textBytes = 0;
	return parts.map((part) => {
		if (!part || typeof part !== "object" || !("type" in part)) {
			throw new AssistantMessageValidationError(
				"Message parts must be objects",
			);
		}
		const candidate = part as Record<string, unknown>;
		if (candidate.type === "text" && typeof candidate.text === "string") {
			textCharacters += candidate.text.length;
			textBytes += new TextEncoder().encode(candidate.text).byteLength + 1;
			if (
				textCharacters > ASSISTANT_MAX_TEXT_CHARS ||
				textBytes > ASSISTANT_MAX_TEXT_BYTES
			) {
				throw new AssistantMessageValidationError(
					"The message text is too long",
				);
			}
			return { type: "text", text: candidate.text };
		}
		if (
			candidate.type === "file" &&
			typeof candidate.documentId === "string" &&
			candidate.documentId.length > 0 &&
			candidate.documentId.length <= 191
		) {
			return {
				type: "file",
				documentId: candidate.documentId,
			};
		}
		throw new AssistantMessageValidationError(
			"Clients may only submit text and file message parts",
		);
	});
}

function isAllowedAssistantMimeType(value: string | null) {
	return Boolean(
		value &&
			[
				"application/pdf",
				"image/avif",
				"image/gif",
				"image/jpeg",
				"image/png",
				"image/webp",
				"text/csv",
				"text/plain",
			].includes(value),
	);
}

function normalizeToolResult(
	result?: AssistantPersistedToolResult,
): Prisma.InputJsonValue | undefined {
	if (!result) return undefined;
	const normalizeRefs = (values?: string[]) =>
		values?.slice(0, 20).map((value) => value.slice(0, 191));
	return {
		status: result.status.slice(0, 50),
		...(result.sourceRefs
			? { sourceRefs: normalizeRefs(result.sourceRefs) }
			: {}),
		...(result.recordRefs
			? { recordRefs: normalizeRefs(result.recordRefs) }
			: {}),
		...(result.artifactId
			? { artifactId: result.artifactId.slice(0, 191) }
			: {}),
		...(result.jobId ? { jobId: result.jobId.slice(0, 191) } : {}),
		...(result.warnings
			? {
					warnings: result.warnings
						.slice(0, 20)
						.map((warning) => warning.slice(0, 500)),
				}
			: {}),
	};
}

async function resolveOwnedClientParts(
	tx: TransactionClient,
	input: ConversationIdentity,
	parts: AssistantClientPart[],
) {
	const documentIds = [
		...new Set(
			parts
				.filter(
					(part): part is Extract<AssistantClientPart, { type: "file" }> =>
						part.type === "file",
				)
				.map((part) => part.documentId),
		),
	];
	if (documentIds.length === 0) return parts;
	if (documentIds.length > 5) {
		throw new AssistantMessageValidationError(
			"A message can include at most five attachments",
		);
	}

	const documents = await tx.storedDocument.findMany({
		where: {
			id: { in: documentIds },
			OR: [
				{
					ownerType: "user",
					ownerId: String(input.ownerUserId),
					ownerKey: "staged:assistant-documents",
					uploadedBy: input.ownerUserId,
					sourceType: "authenticated_browser_upload",
				},
				{
					ownerType: ASSISTANT_ATTACHMENT_OWNER_TYPE,
					ownerId: input.conversationId,
					visibility: "private",
					isCurrent: true,
				},
			],
			status: "ready",
			deletedAt: null,
		},
		select: {
			id: true,
			filename: true,
			mimeType: true,
			size: true,
			ownerType: true,
		},
	});
	if (
		documents.length !== documentIds.length ||
		documents.reduce((total, document) => total + (document.size ?? 0), 0) >
			ASSISTANT_MAX_ATTACHMENT_TOTAL_BYTES ||
		documents.some(
			(document) =>
				!isAllowedAssistantMimeType(document.mimeType) ||
				(document.size ?? ASSISTANT_MAX_ATTACHMENT_BYTES + 1) >
					ASSISTANT_MAX_ATTACHMENT_BYTES,
		)
	) {
		throw new AssistantMessageValidationError(
			"One or more attachments are unavailable",
		);
	}

	const stagedDocumentCount = documents.filter(
		(document) => document.ownerType === "user",
	).length;
	const adoption = await tx.storedDocument.updateMany({
		where: {
			id: { in: documentIds },
			ownerType: "user",
			ownerId: String(input.ownerUserId),
			ownerKey: "staged:assistant-documents",
			uploadedBy: input.ownerUserId,
			sourceType: "authenticated_browser_upload",
			status: "ready",
			deletedAt: null,
		},
		data: {
			ownerType: ASSISTANT_ATTACHMENT_OWNER_TYPE,
			ownerId: input.conversationId,
			ownerKey: null,
			visibility: "private",
			isCurrent: true,
		},
	});
	if (adoption.count !== stagedDocumentCount) {
		throw new AssistantMessageValidationError(
			"One or more attachments are unavailable",
		);
	}

	const ownedDocuments = await tx.storedDocument.findMany({
		where: {
			id: { in: documentIds },
			ownerType: ASSISTANT_ATTACHMENT_OWNER_TYPE,
			ownerId: input.conversationId,
			visibility: "private",
			isCurrent: true,
			status: "ready",
			deletedAt: null,
		},
		select: { id: true, filename: true, mimeType: true, size: true },
	});
	if (ownedDocuments.length !== documentIds.length) {
		throw new AssistantMessageValidationError(
			"One or more attachments are unavailable",
		);
	}

	const byId = new Map(
		ownedDocuments.map((document) => [document.id, document]),
	);
	return parts.map((part) => {
		if (part.type === "text") return part;
		const document = byId.get(part.documentId);
		if (!document?.mimeType) {
			throw new AssistantMessageValidationError(
				"Attachment metadata is invalid",
			);
		}
		return {
			type: "file" as const,
			documentId: document.id,
			mediaType: document.mimeType,
			...(document.filename ? { filename: document.filename } : {}),
		};
	});
}

function extractSearchText(parts: AssistantClientPart[]) {
	const value = parts
		.filter(
			(part): part is Extract<AssistantClientPart, { type: "text" }> =>
				part.type === "text",
		)
		.map((part) => part.text.trim())
		.filter(Boolean)
		.join("\n");
	return value || null;
}

async function runAssistantTransaction<T>(
	db: Database,
	operation: (tx: TransactionClient) => Promise<T>,
) {
	for (let attempt = 0; ; attempt += 1) {
		try {
			return await db.$transaction(operation, {
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			});
		} catch (error) {
			if (
				attempt >= 9 ||
				!(error instanceof Prisma.PrismaClientKnownRequestError) ||
				!["P2002", "P2034"].includes(error.code)
			) {
				throw error;
			}
			const backoffMs = Math.min(15 * 2 ** attempt, 250);
			await new Promise((resolve) =>
				setTimeout(resolve, backoffMs + Math.floor(Math.random() * 20)),
			);
		}
	}
}

export function createAssistantConversation(
	db: Database,
	input: AssistantActorScope & {
		title?: string | null;
		scopeType?: string;
		scopeId?: string | null;
		preferences?: Prisma.InputJsonValue;
		retentionUntil?: Date | null;
	},
) {
	const scope = resolveActorScope(input);
	return db.assistantConversation.create({
		data: {
			...scope,
			title: normalizeSearch(input.title) ?? null,
			preferences: input.preferences,
			retentionUntil: input.retentionUntil ?? null,
		},
	});
}

export function listAssistantConversations(
	db: Database,
	input: AssistantActorScope & {
		search?: string | null;
		includeArchived?: boolean;
		cursor?: AssistantConversationCursor | null;
		take?: number;
	},
) {
	const search = normalizeSearch(input.search);
	const scope = resolveActorScope(input);
	return db.assistantConversation.findMany({
		where: {
			...scope,
			archivedAt: input.includeArchived ? undefined : null,
			deletedAt: null,
			...(input.cursor
				? {
						AND: [
							{
								OR: [
									{ updatedAt: { lt: input.cursor.updatedAt } },
									{
										updatedAt: input.cursor.updatedAt,
										id: { lt: input.cursor.id },
									},
								],
							},
						],
					}
				: {}),
			...(search
				? {
						OR: [
							{ title: { contains: search } },
							{ messages: { some: { searchText: { contains: search } } } },
						],
					}
				: {}),
		},
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		take: Math.min(Math.max(input.take ?? 30, 1), 100),
		include: {
			messages: { orderBy: { sequence: "desc" }, take: 1 },
		},
	});
}

export async function getAssistantConversation(
	db: Database,
	input: ConversationIdentity & {
		afterSequence?: number;
		messageTake?: number;
	},
) {
	const scope = resolveActorScope(input);
	const loadingLatestWindow = input.afterSequence === undefined;
	const conversation = await db.assistantConversation.findFirst({
		where: {
			id: input.conversationId,
			...scope,
			deletedAt: null,
		},
		include: {
			messages: {
				where: { sequence: { gt: input.afterSequence ?? 0 } },
				orderBy: { sequence: loadingLatestWindow ? "desc" : "asc" },
				take: Math.min(Math.max(input.messageTake ?? 200, 1), 500),
			},
		},
	});
	if (conversation && loadingLatestWindow) conversation.messages.reverse();
	return conversation;
}

export const ASSISTANT_MODEL_HISTORY_MAX_MESSAGES = 40;
export const ASSISTANT_MODEL_HISTORY_MAX_CHARS = 48_000;

export async function getAssistantModelHistory(
	db: Database,
	input: ConversationIdentity,
) {
	const scope = resolveActorScope(input);
	const messages = await db.assistantMessage.findMany({
		where: {
			conversationId: input.conversationId,
			role: { in: ["user", "assistant"] },
			conversation: { ...scope, deletedAt: null },
		},
		orderBy: { sequence: "desc" },
		take: ASSISTANT_MODEL_HISTORY_MAX_MESSAGES,
		select: { id: true, sequence: true, role: true, parts: true },
	});

	let remaining = ASSISTANT_MODEL_HISTORY_MAX_CHARS;
	const selected: Array<{
		id: string;
		sequence: number;
		role: "user" | "assistant";
		text: string;
	}> = [];
	for (const message of messages) {
		if (remaining <= 0) break;
		if (message.role !== "user" && message.role !== "assistant") continue;
		let text = Array.isArray(message.parts)
			? message.parts
					.flatMap((part) =>
						part &&
						typeof part === "object" &&
						"type" in part &&
						part.type === "text" &&
						"text" in part &&
						typeof part.text === "string"
							? [part.text]
							: [],
					)
					.join("\n")
			: "";
		if (
			!text &&
			Array.isArray(message.parts) &&
			message.parts.some(
				(part) =>
					part &&
					typeof part === "object" &&
					"type" in part &&
					part.type === "file",
			)
		) {
			text = "Review the attached uploaded document context.";
		}
		if (!text) continue;
		if (text.length > remaining) break;
		remaining -= text.length;
		selected.push({
			id: message.id,
			sequence: message.sequence,
			role: message.role,
			text,
		});
	}
	selected.reverse();
	while (selected[0]?.role === "assistant") selected.shift();
	return selected;
}

export async function archiveAssistantConversation(
	db: Database,
	input: ConversationIdentity & { archived: boolean },
) {
	const scope = resolveActorScope(input);
	const result = await db.assistantConversation.updateMany({
		where: {
			id: input.conversationId,
			...scope,
			deletedAt: null,
		},
		data: { archivedAt: input.archived ? new Date() : null },
	});
	if (result.count !== 1) throw new AssistantConversationAccessError();
	return getAssistantConversation(db, input);
}

export async function softDeleteAssistantConversation(
	db: Database,
	input: ConversationIdentity,
) {
	const scope = resolveActorScope(input);
	const deletedAt = new Date();
	const result = await db.$transaction(async (tx) => {
		const conversation = await tx.assistantConversation.updateMany({
			where: { id: input.conversationId, ...scope, deletedAt: null },
			data: { deletedAt },
		});
		if (conversation.count !== 1) return conversation;
		await tx.storedDocument.updateMany({
			where: {
				ownerType: ASSISTANT_ATTACHMENT_OWNER_TYPE,
				ownerId: input.conversationId,
				deletedAt: null,
			},
			data: { deletedAt, isCurrent: false },
		});
		return conversation;
	});
	if (result.count !== 1) throw new AssistantConversationAccessError();
	return { id: input.conversationId, deleted: true as const };
}

export async function appendAssistantUserMessage(
	db: Database,
	input: ConversationIdentity & {
		clientRequestId: string;
		parts: unknown[];
		parentMessageId?: string | null;
	},
) {
	const parts = validateClientParts(input.parts);
	if (!input.clientRequestId || input.clientRequestId.length > 191) {
		throw new AssistantMessageValidationError("Client request ID is invalid");
	}
	const scope = resolveActorScope(input);
	const requestFingerprint = fingerprint({
		parts,
		parentMessageId: input.parentMessageId ?? null,
	});
	return runAssistantTransaction(db, async (tx) => {
		const existing = await tx.assistantMessage.findFirst({
			where: {
				conversationId: input.conversationId,
				clientRequestId: input.clientRequestId,
				conversation: {
					...scope,
					deletedAt: null,
				},
			},
		});
		if (existing) {
			if (existing.requestFingerprint !== requestFingerprint) {
				throw new AssistantIdempotencyConflictError();
			}
			return existing;
		}
		const allocation = await tx.assistantConversation.updateMany({
			where: {
				id: input.conversationId,
				...scope,
				archivedAt: null,
				deletedAt: null,
				...(input.parentMessageId
					? { messages: { some: { id: input.parentMessageId } } }
					: {}),
			},
			data: { lastSequence: { increment: 1 } },
		});
		if (allocation.count !== 1) {
			throw new AssistantConversationAccessError();
		}
		const resolvedParts = await resolveOwnedClientParts(tx, input, parts);
		const conversation = await tx.assistantConversation.findUnique({
			where: { id: input.conversationId },
			select: { lastSequence: true },
		});
		if (!conversation) throw new AssistantConversationAccessError();

		return tx.assistantMessage.create({
			data: {
				conversationId: input.conversationId,
				sequence: conversation.lastSequence,
				role: "user",
				parts: resolvedParts as Prisma.InputJsonValue,
				searchText: extractSearchText(parts),
				clientRequestId: input.clientRequestId,
				requestFingerprint,
				parentMessageId: input.parentMessageId ?? null,
				createdByUserId: input.ownerUserId,
			},
		});
	});
}

export async function appendAssistantGeneratedMessage(
	db: Database,
	input: ConversationIdentity & {
		runId: string;
		parts: Prisma.InputJsonValue;
		searchText?: string | null;
		parentMessageId?: string | null;
	},
) {
	const scope = resolveActorScope(input);
	const requestFingerprint = fingerprint({
		parts: input.parts,
		searchText: normalizeSearch(input.searchText) ?? null,
		parentMessageId: input.parentMessageId ?? null,
	});
	return runAssistantTransaction(db, async (tx) => {
		const existing = await tx.assistantMessage.findFirst({
			where: {
				generatedRunId: input.runId,
				conversationId: input.conversationId,
				conversation: { ...scope, deletedAt: null },
			},
		});
		if (existing) {
			if (existing.requestFingerprint !== requestFingerprint) {
				throw new AssistantIdempotencyConflictError();
			}
			return existing;
		}
		const run = await tx.assistantRun.findFirst({
			where: {
				id: input.runId,
				conversationId: input.conversationId,
				actorUserId: input.ownerUserId,
				conversation: { ...scope, deletedAt: null },
			},
			select: { status: true },
		});
		if (!run) throw new AssistantConversationAccessError();
		if (!ACTIVE_ASSISTANT_RUN_STATUSES.has(run.status)) {
			throw new AssistantRunTerminalError();
		}
		const allocation = await tx.assistantConversation.updateMany({
			where: {
				id: input.conversationId,
				...scope,
				archivedAt: null,
				deletedAt: null,
				...(input.parentMessageId
					? { messages: { some: { id: input.parentMessageId } } }
					: {}),
			},
			data: { lastSequence: { increment: 1 } },
		});
		if (allocation.count !== 1) {
			throw new AssistantConversationAccessError();
		}
		const conversation = await tx.assistantConversation.findUnique({
			where: { id: input.conversationId },
			select: { lastSequence: true },
		});
		if (!conversation) throw new AssistantConversationAccessError();
		return tx.assistantMessage.create({
			data: {
				conversationId: input.conversationId,
				sequence: conversation.lastSequence,
				role: "assistant",
				parts: input.parts,
				searchText: normalizeSearch(input.searchText) ?? null,
				requestFingerprint,
				generatedRunId: input.runId,
				parentMessageId: input.parentMessageId ?? null,
			},
		});
	});
}

export async function createOrReuseAssistantRun(
	db: Database,
	input: ConversationIdentity & {
		requestId: string;
		triggerMessageId?: string | null;
		catalogVersion: string;
		model: string;
		promptVersion: string;
	},
) {
	const scope = resolveActorScope(input);
	const requestFingerprint = fingerprint({
		conversationId: input.conversationId,
		triggerMessageId: input.triggerMessageId ?? null,
		catalogVersion: input.catalogVersion,
		model: input.model,
		promptVersion: input.promptVersion,
	});
	const existing = await db.assistantRun.findFirst({
		where: {
			actorUserId: input.ownerUserId,
			requestId: input.requestId,
			conversation: {
				...scope,
				deletedAt: null,
			},
		},
	});
	if (existing) {
		if (
			existing.conversationId !== input.conversationId ||
			existing.requestFingerprint !== requestFingerprint
		) {
			throw new AssistantIdempotencyConflictError();
		}
		return existing;
	}

	const conversation = await db.assistantConversation.findFirst({
		where: {
			id: input.conversationId,
			...scope,
			archivedAt: null,
			deletedAt: null,
			...(input.triggerMessageId
				? { messages: { some: { id: input.triggerMessageId } } }
				: {}),
		},
		select: { id: true },
	});
	if (!conversation) throw new AssistantConversationAccessError();

	try {
		return await db.assistantRun.create({
			data: {
				conversationId: conversation.id,
				triggerMessageId: input.triggerMessageId ?? null,
				actorUserId: input.ownerUserId,
				requestId: input.requestId,
				requestFingerprint,
				catalogVersion: input.catalogVersion,
				model: input.model,
				promptVersion: input.promptVersion,
			},
		});
	} catch (error) {
		if (
			!(error instanceof Prisma.PrismaClientKnownRequestError) ||
			error.code !== "P2002"
		) {
			throw error;
		}
		const raced = await db.assistantRun.findFirst({
			where: {
				actorUserId: input.ownerUserId,
				requestId: input.requestId,
				conversation: {
					...scope,
					deletedAt: null,
				},
			},
		});
		if (
			!raced ||
			raced.conversationId !== input.conversationId ||
			raced.requestFingerprint !== requestFingerprint
		) {
			throw new AssistantIdempotencyConflictError();
		}
		return raced;
	}
}

export async function createOrReuseAssistantRequestRun(
	db: Database,
	input: ConversationIdentity & {
		requestId: string;
		clientMessageId: string;
		parts: unknown[];
		catalogVersion: string;
		model: string;
		promptVersion: string;
	},
) {
	const parts = validateClientParts(input.parts);
	if (!input.clientMessageId || input.clientMessageId.length > 191) {
		throw new AssistantMessageValidationError("Client message ID is invalid");
	}
	if (!input.requestId || input.requestId.length > 191) {
		throw new AssistantMessageValidationError("Run request ID is invalid");
	}
	const scope = resolveActorScope(input);
	const messageFingerprint = fingerprint({ parts, parentMessageId: null });

	return runAssistantTransaction(db, async (tx) => {
		const existingRun = await tx.assistantRun.findFirst({
			where: {
				actorUserId: input.ownerUserId,
				requestId: input.requestId,
				conversation: { ...scope, deletedAt: null },
			},
			include: { triggerMessage: true },
		});
		if (existingRun) {
			const expectedRunFingerprint = fingerprint({
				conversationId: input.conversationId,
				triggerMessageId: existingRun.triggerMessageId,
				catalogVersion: input.catalogVersion,
				model: input.model,
				promptVersion: input.promptVersion,
			});
			if (
				existingRun.conversationId !== input.conversationId ||
				existingRun.requestFingerprint !== expectedRunFingerprint ||
				existingRun.triggerMessage?.clientRequestId !== input.clientMessageId ||
				existingRun.triggerMessage.requestFingerprint !== messageFingerprint
			) {
				throw new AssistantIdempotencyConflictError();
			}
			return {
				message: existingRun.triggerMessage,
				run: existingRun,
				reused: true as const,
			};
		}

		let message = await tx.assistantMessage.findFirst({
			where: {
				conversationId: input.conversationId,
				clientRequestId: input.clientMessageId,
				conversation: { ...scope, deletedAt: null },
			},
		});
		if (message && message.requestFingerprint !== messageFingerprint) {
			throw new AssistantIdempotencyConflictError();
		}
		if (!message) {
			const allocation = await tx.assistantConversation.updateMany({
				where: {
					id: input.conversationId,
					...scope,
					archivedAt: null,
					deletedAt: null,
				},
				data: { lastSequence: { increment: 1 } },
			});
			if (allocation.count !== 1) {
				throw new AssistantConversationAccessError();
			}
			const resolvedParts = await resolveOwnedClientParts(tx, input, parts);
			const conversation = await tx.assistantConversation.findUnique({
				where: { id: input.conversationId },
				select: { lastSequence: true },
			});
			if (!conversation) throw new AssistantConversationAccessError();
			message = await tx.assistantMessage.create({
				data: {
					conversationId: input.conversationId,
					sequence: conversation.lastSequence,
					role: "user",
					parts: resolvedParts as Prisma.InputJsonValue,
					searchText: extractSearchText(parts),
					clientRequestId: input.clientMessageId,
					requestFingerprint: messageFingerprint,
					createdByUserId: input.ownerUserId,
				},
			});
		}

		const runFingerprint = fingerprint({
			conversationId: input.conversationId,
			triggerMessageId: message.id,
			catalogVersion: input.catalogVersion,
			model: input.model,
			promptVersion: input.promptVersion,
		});
		const run = await tx.assistantRun.create({
			data: {
				conversationId: input.conversationId,
				triggerMessageId: message.id,
				actorUserId: input.ownerUserId,
				requestId: input.requestId,
				requestFingerprint: runFingerprint,
				catalogVersion: input.catalogVersion,
				model: input.model,
				promptVersion: input.promptVersion,
			},
		});
		return { message, run, reused: false as const };
	});
}

export async function claimAssistantRunForExecution(
	db: Database,
	input: AssistantActorScope & { runId: string },
) {
	const scope = resolveActorScope(input);
	return runAssistantTransaction(db, async (tx) => {
		const claimed = await tx.assistantRun.updateMany({
			where: {
				id: input.runId,
				actorUserId: input.ownerUserId,
				status: "queued",
				conversation: { ...scope, deletedAt: null },
			},
			data: { status: "running", startedAt: new Date() },
		});
		const run = await tx.assistantRun.findFirst({
			where: {
				id: input.runId,
				actorUserId: input.ownerUserId,
				conversation: { ...scope, deletedAt: null },
			},
		});
		if (!run) throw new AssistantConversationAccessError();
		return { run, claimed: claimed.count === 1 };
	});
}

export function getAssistantRunForReconnect(
	db: Database,
	input: AssistantActorScope & {
		runId: string;
		afterSequence?: number;
		afterRunSequence?: number;
		messageTake?: number;
		eventTake?: number;
	},
) {
	const scope = resolveActorScope(input);
	const messageTake = Math.min(Math.max(input.messageTake ?? 200, 1), 500);
	const eventTake = Math.min(Math.max(input.eventTake ?? 100, 1), 200);
	return db.assistantRun.findFirst({
		where: {
			id: input.runId,
			actorUserId: input.ownerUserId,
			conversation: {
				...scope,
				deletedAt: null,
			},
		},
		include: {
			conversation: {
				include: {
					messages: {
						where: { sequence: { gt: input.afterSequence ?? 0 } },
						orderBy: { sequence: "asc" },
						take: messageTake,
					},
				},
			},
			toolExecutions: {
				where: { eventSequence: { gt: input.afterRunSequence ?? 0 } },
				orderBy: { eventSequence: "asc" },
				take: eventTake,
			},
			actionProposals: {
				where: { eventSequence: { gt: input.afterRunSequence ?? 0 } },
				orderBy: { eventSequence: "asc" },
				take: eventTake,
			},
		},
	});
}

export async function updateAssistantRunCheckpoint(
	db: Database,
	input: AssistantActorScope & {
		runId: string;
		status: string;
		checkpoint: Prisma.InputJsonValue;
	},
) {
	const scope = resolveActorScope(input);
	if (!ASSISTANT_CHECKPOINT_STATUSES.has(input.status)) {
		throw new AssistantMessageValidationError(
			"Run checkpoint status is invalid",
		);
	}
	const result = await db.assistantRun.updateMany({
		where: {
			id: input.runId,
			actorUserId: input.ownerUserId,
			conversation: { ...scope, deletedAt: null },
			status: { notIn: [...TERMINAL_ASSISTANT_RUN_STATUSES] },
		},
		data: {
			status: input.status,
			checkpoint: input.checkpoint,
			startedAt: new Date(),
		},
	});
	if (result.count !== 1) {
		const run = await db.assistantRun.findFirst({
			where: {
				id: input.runId,
				actorUserId: input.ownerUserId,
				conversation: { ...scope, deletedAt: null },
			},
			select: { status: true },
		});
		if (run && TERMINAL_ASSISTANT_RUN_STATUSES.has(run.status)) {
			throw new AssistantRunTerminalError();
		}
		throw new AssistantConversationAccessError();
	}
	return getAssistantRunForReconnect(db, input);
}

export async function completeAssistantRun(
	db: Database,
	input: AssistantActorScope & {
		runId: string;
		status: "succeeded" | "failed" | "cancelled";
		terminalResult?: Prisma.InputJsonValue;
		usage?: Prisma.InputJsonValue;
		errorCode?: string | null;
		errorMessage?: string | null;
	},
) {
	const scope = resolveActorScope(input);
	const completedAt = new Date();
	const ensureUsageEvent = async (
		tx: TransactionClient,
		current: {
			id: string;
			actorUserId: number;
			model: string;
			startedAt: Date | null;
		},
	) => {
		const normalizedCalls = normalizeAssistantProviderUsageCalls(
			input.usage,
			current.model,
			current.id,
		);
		const runToolCallCount = await tx.assistantToolExecution.count({
			where: { runId: current.id },
		});
		for (const [index, normalized] of normalizedCalls.entries()) {
			const price = await findAssistantUsagePrice(tx, normalized, completedAt);
			const estimatedCostMicros = estimateAssistantUsageCostMicros(
				normalized,
				price,
			);
			await tx.assistantUsageEvent.upsert({
				where: { providerRequestId: normalized.providerRequestId },
				create: {
					runId: current.id,
					providerRequestId: normalized.providerRequestId,
					actorUserId: current.actorUserId,
					scopeType: scope.scopeType,
					scopeId: scope.scopeId,
					provider: normalized.provider,
					model: normalized.model,
					requestClass: "chat",
					inputTokens: normalized.inputTokens,
					cachedInputTokens: normalized.cachedInputTokens,
					outputTokens: normalized.outputTokens,
					reasoningTokens: normalized.reasoningTokens,
					totalTokens: normalized.totalTokens,
					toolCallCount:
						normalized.toolCallCount ?? (index === 0 ? runToolCallCount : 0),
					durationMs: current.startedAt
						? Math.max(0, completedAt.getTime() - current.startedAt.getTime())
						: null,
					outcome: input.status,
					estimatedCostMicros,
					priceVersion: price?.version ?? null,
					accountingStatus:
						normalized.totalTokens === null ? "unknown" : "reported",
					startedAt: current.startedAt,
					completedAt,
				},
				update: {},
			});
		}
	};
	const matchesTerminalInput = (current: {
		status: string;
		terminalResult: Prisma.JsonValue | null;
		usage: Prisma.JsonValue | null;
		errorCode: string | null;
		errorMessage: string | null;
	}) => {
		const sameTerminalResult =
			current.status === input.status &&
			fingerprint({
				terminalResult: current.terminalResult ?? null,
				usage: current.usage ?? null,
				errorCode: current.errorCode ?? null,
				errorMessage: current.errorMessage ?? null,
			}) ===
				fingerprint({
					terminalResult: input.terminalResult ?? null,
					usage: input.usage ?? null,
					errorCode: input.errorCode ?? null,
					errorMessage: input.errorMessage ?? null,
				});
		return sameTerminalResult;
	};

	await runAssistantTransaction(db, async (tx) => {
		const where = {
			id: input.runId,
			actorUserId: input.ownerUserId,
			conversation: { ...scope, deletedAt: null },
		};
		const current = await tx.assistantRun.findFirst({ where });
		if (!current) throw new AssistantConversationAccessError();
		if (TERMINAL_ASSISTANT_RUN_STATUSES.has(current.status)) {
			if (!matchesTerminalInput(current)) {
				throw new AssistantIdempotencyConflictError();
			}
			await ensureUsageEvent(tx, current);
			return;
		}

		const result = await tx.assistantRun.updateMany({
			where: { ...where, status: current.status },
			data: {
				status: input.status,
				terminalResult: input.terminalResult,
				usage: input.usage,
				errorCode: input.errorCode ?? null,
				errorMessage: input.errorMessage ?? null,
				completedAt,
			},
		});
		if (result.count === 1) {
			await ensureUsageEvent(tx, current);
			return;
		}

		const terminal = await tx.assistantRun.findFirst({ where });
		if (!terminal) throw new AssistantConversationAccessError();
		if (!matchesTerminalInput(terminal)) {
			throw new AssistantIdempotencyConflictError();
		}
		await ensureUsageEvent(tx, terminal);
	});
	return getAssistantRunForReconnect(db, input);
}

export async function reconcileAssistantUsageEvent(
	db: Database,
	input: {
		usageEventId: string;
		actorUserId: number;
		inputTokens: number | null;
		cachedInputTokens: number | null;
		outputTokens: number | null;
		reasoningTokens: number | null;
		totalTokens: number | null;
		note: string;
	},
) {
	return runAssistantTransaction(db, async (tx) => {
		const current = await tx.assistantUsageEvent.findUnique({
			where: { id: input.usageEventId },
		});
		if (!current) throw new AssistantConversationAccessError();
		const usage = normalizeAssistantUsageReceipt(
			{
				provider: current.provider,
				model: current.model,
				inputTokens: input.inputTokens,
				cachedInputTokens: input.cachedInputTokens,
				outputTokens: input.outputTokens,
				reasoningTokens: input.reasoningTokens,
				totalTokens: input.totalTokens,
			},
			`${current.provider}:${current.model}`,
		);
		const price = await findAssistantUsagePrice(tx, usage, current.completedAt);
		const estimatedCostMicros = estimateAssistantUsageCostMicros(usage, price);
		const nextUsage = {
			inputTokens: usage.inputTokens,
			cachedInputTokens: usage.cachedInputTokens,
			outputTokens: usage.outputTokens,
			reasoningTokens: usage.reasoningTokens,
			totalTokens: usage.totalTokens,
		};
		await tx.assistantUsageReconciliation.create({
			data: {
				usageEventId: current.id,
				actorUserId: input.actorUserId,
				previousUsage: {
					inputTokens: current.inputTokens,
					cachedInputTokens: current.cachedInputTokens,
					outputTokens: current.outputTokens,
					reasoningTokens: current.reasoningTokens,
					totalTokens: current.totalTokens,
				},
				nextUsage,
				note: input.note,
			},
		});
		return tx.assistantUsageEvent.update({
			where: { id: current.id },
			data: {
				...nextUsage,
				estimatedCostMicros,
				priceVersion: price?.version ?? null,
				accountingStatus: usage.totalTokens === null ? "unknown" : "reconciled",
				reconciledAt: new Date(),
			},
		});
	});
}

export async function listAssistantUsageReconciliationQueue(
	db: Database,
	input: { take: number },
) {
	return db.assistantUsageEvent.findMany({
		where: { accountingStatus: "unknown" },
		orderBy: [{ completedAt: "asc" }, { id: "asc" }],
		take: input.take,
		select: {
			id: true,
			runId: true,
			providerRequestId: true,
			actorUserId: true,
			provider: true,
			model: true,
			requestClass: true,
			outcome: true,
			completedAt: true,
		},
	});
}

export async function recordAssistantToolExecution(
	db: Database,
	input: AssistantActorScope & {
		runId: string;
		toolCallId: string;
		step: number;
		ordinal?: number;
		toolId: string;
		toolVersion: number;
		effect: string;
		status: string;
		toolInput?: Prisma.InputJsonValue;
		result?: AssistantPersistedToolResult;
		errorCode?: string | null;
		durationMs?: number | null;
		idempotencyKey?: string | null;
		completedAt?: Date | null;
	},
) {
	const scope = resolveActorScope(input);
	if (!ASSISTANT_TOOL_STATUSES.has(input.status)) {
		throw new AssistantMessageValidationError(
			"Tool execution status is invalid",
		);
	}
	const inputFingerprint = fingerprint({
		toolId: input.toolId,
		toolVersion: input.toolVersion,
		effect: input.effect,
		toolInput: input.toolInput ?? null,
	});
	const persistedResult = normalizeToolResult(input.result);
	return runAssistantTransaction(db, async (tx) => {
		const runState = await tx.assistantRun.findFirst({
			where: {
				id: input.runId,
				actorUserId: input.ownerUserId,
				conversation: { ...scope, deletedAt: null },
			},
			select: { status: true },
		});
		if (!runState) throw new AssistantConversationAccessError();

		const existing = await tx.assistantToolExecution.findFirst({
			where: {
				OR: [
					{ runId: input.runId, toolCallId: input.toolCallId },
					...(input.idempotencyKey
						? [{ idempotencyKey: input.idempotencyKey }]
						: []),
				],
				run: {
					actorUserId: input.ownerUserId,
					conversation: { ...scope, deletedAt: null },
				},
			},
		});
		if (existing) {
			if (
				existing.inputFingerprint !== inputFingerprint ||
				existing.toolId !== input.toolId ||
				existing.toolVersion !== input.toolVersion
			) {
				throw new AssistantIdempotencyConflictError();
			}
			if (TERMINAL_ASSISTANT_RUN_STATUSES.has(existing.status)) {
				if (
					TERMINAL_ASSISTANT_RUN_STATUSES.has(input.status) &&
					existing.status !== input.status
				) {
					throw new AssistantIdempotencyConflictError();
				}
				return existing;
			}
			if (TERMINAL_ASSISTANT_RUN_STATUSES.has(runState.status)) {
				throw new AssistantRunTerminalError();
			}
			if (TERMINAL_ASSISTANT_RUN_STATUSES.has(input.status)) {
				return tx.assistantToolExecution.update({
					where: { id: existing.id },
					data: {
						status: input.status,
						result: persistedResult,
						errorCode: input.errorCode ?? null,
						durationMs: input.durationMs ?? null,
						completedAt: input.completedAt ?? new Date(),
					},
				});
			}
			return existing;
		}
		if (!ACTIVE_ASSISTANT_RUN_STATUSES.has(runState.status)) {
			throw new AssistantRunTerminalError();
		}
		const allocation = await tx.assistantRun.updateMany({
			where: {
				id: input.runId,
				actorUserId: input.ownerUserId,
				conversation: { ...scope, deletedAt: null },
				status: runState.status,
			},
			data: { lastSequence: { increment: 1 } },
		});
		if (allocation.count !== 1) throw new AssistantConversationAccessError();
		const run = await tx.assistantRun.findUnique({
			where: { id: input.runId },
			select: { lastSequence: true },
		});
		if (!run) throw new AssistantConversationAccessError();
		return tx.assistantToolExecution.create({
			data: {
				runId: input.runId,
				toolCallId: input.toolCallId,
				step: input.step,
				ordinal: input.ordinal ?? 0,
				eventSequence: run.lastSequence,
				toolId: input.toolId,
				toolVersion: input.toolVersion,
				effect: input.effect,
				status: input.status,
				inputFingerprint,
				input: input.toolInput === undefined ? undefined : { redacted: true },
				result: persistedResult,
				errorCode: input.errorCode ?? null,
				durationMs: input.durationMs ?? null,
				idempotencyKey: input.idempotencyKey ?? null,
				completedAt: input.completedAt ?? null,
			},
		});
	});
}

export function listAssistantConversationsDueForRetention(
	db: Database,
	input: { before?: Date; take?: number },
) {
	return db.assistantConversation.findMany({
		where: {
			retentionUntil: { lte: input.before ?? new Date() },
			deletedAt: { not: null },
		},
		select: { id: true, ownerUserId: true, scopeType: true, scopeId: true },
		orderBy: [{ retentionUntil: "asc" }, { id: "asc" }],
		take: Math.min(Math.max(input.take ?? 100, 1), 500),
	});
}
