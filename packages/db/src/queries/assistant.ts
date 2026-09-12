import { createHash } from "node:crypto";
import { type Database, Prisma, type TransactionClient } from "..";

export const ASSISTANT_ATTACHMENT_OWNER_TYPE = "assistant_conversation";
export const ASSISTANT_MAX_MESSAGE_PARTS = 20;
export const ASSISTANT_MAX_TEXT_CHARS = 32_000;
export const ASSISTANT_MAX_TEXT_BYTES = 60_000;
export const ASSISTANT_MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

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

	const documents = await tx.storedDocument.findMany({
		where: {
			id: { in: documentIds },
			ownerType: ASSISTANT_ATTACHMENT_OWNER_TYPE,
			ownerId: input.conversationId,
			status: "ready",
			isCurrent: true,
			visibility: "private",
			deletedAt: null,
		},
		select: { id: true, filename: true, mimeType: true, size: true },
	});
	if (
		documents.length !== documentIds.length ||
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

	const byId = new Map(documents.map((document) => [document.id, document]));
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

export function getAssistantConversation(
	db: Database,
	input: ConversationIdentity & {
		afterSequence?: number;
		messageTake?: number;
	},
) {
	const scope = resolveActorScope(input);
	return db.assistantConversation.findFirst({
		where: {
			id: input.conversationId,
			...scope,
			deletedAt: null,
		},
		include: {
			messages: {
				where: { sequence: { gt: input.afterSequence ?? 0 } },
				orderBy: { sequence: "asc" },
				take: Math.min(Math.max(input.messageTake ?? 200, 1), 500),
			},
		},
	});
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
				completedAt: new Date(),
			},
		});
		if (result.count === 1) return;

		const terminal = await tx.assistantRun.findFirst({ where });
		if (!terminal) throw new AssistantConversationAccessError();
		if (!matchesTerminalInput(terminal)) {
			throw new AssistantIdempotencyConflictError();
		}
	});
	return getAssistantRunForReconnect(db, input);
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
