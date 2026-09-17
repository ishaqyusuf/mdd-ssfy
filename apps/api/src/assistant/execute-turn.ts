import type { AssistantChatRequest } from "@api/schemas/assistant";
import { type Prisma, db } from "@gnd/db";
import {
	appendAssistantGeneratedMessage,
	getAssistantModelHistory,
	recordAssistantToolExecution,
} from "@gnd/db/queries";
import { get } from "@vercel/blob";
import type { ModelMessage } from "ai";
import { getDocument } from "pdfjs-dist/build/pdf.mjs";
import sharp from "sharp";
import { z } from "zod";
import { assistantOutcomeSchema, presentAssistantOutcome } from "./outcomes";
import { assistantAnalyticsPartSchema } from "./analytics-result-contract";
import { assistantFindingPartSchema } from "./finding-contract";
import { AssistantAttachmentInputError, withAssistantAttachmentCorrection } from "./attachment-errors";
import {
	assistantEntityReferenceSchema,
	assistantInvalidationTagSchema,
} from "./contracts";
import { assistantDocumentProposalActionPartSchema } from "./document-action-contract";
import { getAssistantComposioTools } from "./integrations";
import { createAssistantReadRetry } from "./manual-read-retry";
import { createAssistantMcpExecutionClient } from "./mcp";
import { isAssistantReadOnlyCanary } from "./registry";
import { captureAssistantDiagnostic } from "./diagnostics";
import { runAssistantOperation } from "./operation-diagnostics";
import type { AssistantDiagnosticStage } from "./diagnostic-contract";
import { assistantOrderDraftPartSchema } from "./order-draft-contract";
import {
	type AssistantRuntimeInput,
	assertAssistantActorContinuation,
	assertAssistantProviderEnabled,
	createAssistantRuntime,
	getAssistantRuntimeIdentity,
	resolveAssistantRuntimeSelection,
} from "./runtime";
import {
	createAssistantPrepareStep,
	warmAssistantToolIndex,
} from "./selection";

type AssistantTurnActor = AssistantRuntimeInput["actor"];

const ASSISTANT_PREPROCESSING_DEADLINE_MS = 15_000;
const ASSISTANT_MAX_IMAGE_PIXELS = 25_000_000;
const ASSISTANT_MAX_NORMALIZED_IMAGE_BYTES = 8_000_000;

type AssistantTurnDocument = {
	id: string;
	filename: string | null;
	mimeType: string | null;
	description: string | null;
	url: string | null;
	pathname: string;
	size: number | null;
	provider: string;
	sourceType: string | null;
};

type AssistantTurnHistory = Array<{
	id: string;
	sequence: number;
	role: "user" | "assistant";
	text: string;
	executionFacts?: string;
}>;

type AssistantTurnOutcome =
	| {
			status: "succeeded";
			usage: Prisma.InputJsonValue;
			assistantText: string;
	  }
	| {
			status: "failed" | "cancelled";
			errorCode: string;
			errorMessage: string;
			usage?: Prisma.InputJsonValue;
	  };

export function summarizeAssistantToolExecutionResult(result: unknown) {
	if (!result || typeof result !== "object") return undefined;
	const envelope = result as Record<string, unknown>;
	if (typeof envelope.status !== "string") return undefined;
	const sources = Array.isArray(envelope.sources) ? envelope.sources : [];
	const entities = Array.isArray(envelope.entities) ? envelope.entities : [];
	return {
		status: envelope.status,
		sourceRefs: sources
			.flatMap((source) =>
				source &&
				typeof source === "object" &&
				typeof (source as { id?: unknown }).id === "string"
					? [(source as { id: string }).id]
					: [],
			)
			.slice(0, 20),
		recordRefs: entities
			.flatMap((entity) =>
				entity &&
				typeof entity === "object" &&
				typeof (entity as { id?: unknown }).id === "string"
					? [(entity as { id: string }).id]
					: [],
			)
			.slice(0, 20),
		// Warning bodies may contain provider/database details. Execution history
		// retains only their presence; the private diagnostic owns failure context.
		warningCount: Array.isArray(envelope.warnings)
			? Math.min(20, envelope.warnings.filter((warning) => typeof warning === "string").length)
			: 0,
	};
}

type ExecuteAssistantTurnDependencies = {
	prepareImage: typeof prepareAssistantImage;
	extractPdf: typeof extractAssistantPdfText;
	captureDiagnostic: typeof captureAssistantDiagnostic;
	preprocessingDeadlineMs: number;
	loadHistory(input: {
		actor: AssistantTurnActor;
		conversationId: string;
	}): Promise<AssistantTurnHistory>;
	loadDocuments(input: {
		conversationId: string;
		documentIds: string[];
	}): Promise<AssistantTurnDocument[]>;
	loadDocumentBytes(input: {
		document: AssistantTurnDocument;
		signal: AbortSignal;
	}): Promise<Uint8Array>;
	executeRuntime(input: AssistantRuntimeInput): Promise<AssistantTurnOutcome>;
	persistAssistantMessage(input: {
		actor: AssistantTurnActor;
		conversationId: string;
		runId: string;
		parentMessageId: string | null;
		assistantText: string;
		assistantParts: Prisma.InputJsonValue[];
	}): Promise<void>;
};

function persistentAssistantPart(chunk: unknown): Prisma.InputJsonValue | null {
	if (!chunk || typeof chunk !== "object") return null;
	const part = chunk as { type?: unknown; id?: unknown; data?: unknown };
	if (typeof part.id !== "string" || !part.id.trim() || part.id.length > 240)
		return null;
	if (part.type === "data-assistant-outcome") {
		const parsed = assistantOutcomeSchema.safeParse(part.data);
		return parsed.success ? { type: part.type, id: part.id, data: parsed.data } : null;
	}
	if (part.type === "data-assistant-tool" && part.data && typeof part.data === "object") {
		const data = part.data as Record<string, unknown>;
		if (typeof data.id === "string" && data.id.length <= 160 && typeof data.name === "string" && /^[a-z][a-z0-9_]{0,99}$/.test(data.name) &&
			["running", "complete", "failed", "approval-required"].includes(String(data.status))) {
			const retryId =
				typeof data.retryId === "string" &&
				z.string().uuid().safeParse(data.retryId).success
					? data.retryId
					: null;
			const retryExpiresAt =
				typeof data.retryExpiresAt === "string" &&
				z.string().datetime({ offset: true }).safeParse(data.retryExpiresAt).success
					? data.retryExpiresAt
					: null;
			return {
				type: part.type,
				id: part.id,
				data: {
					id: data.id,
					name: data.name,
					status: String(data.status),
					...(retryId && retryExpiresAt
						? { retryId, retryExpiresAt }
						: {}),
				},
			};
		}
	}
	if (part.type === "data-assistant-entity") {
		const parsed = assistantEntityReferenceSchema.safeParse(part.data);
		return parsed.success
			? ({
					type: part.type,
					id: part.id,
					data: parsed.data,
				} as Prisma.InputJsonValue)
			: null;
	}
	if (part.type === "data-assistant-finding") {
		const parsed = assistantFindingPartSchema.safeParse(part);
		return parsed.success ? parsed.data as Prisma.InputJsonValue : null;
	}
	if (part.type === "data-assistant-order-draft") {
		const parsed = assistantOrderDraftPartSchema.safeParse(part);
		return parsed.success ? (parsed.data as Prisma.InputJsonValue) : null;
	}
	if (part.type === "data-assistant-analytics") {
		const parsed = assistantAnalyticsPartSchema.safeParse(part);
		return parsed.success ? (parsed.data as Prisma.InputJsonValue) : null;
	}
	if (part.type === "data-assistant-document-action") {
		const parsed = assistantDocumentProposalActionPartSchema.safeParse(part);
		return parsed.success ? (parsed.data as Prisma.InputJsonValue) : null;
	}
	if (part.type === "data-assistant-invalidation") {
		if (!part.data || typeof part.data !== "object") return null;
		const data = part.data as { toolCallId?: unknown; tags?: unknown };
		if (
			typeof data.toolCallId !== "string" ||
			!data.toolCallId.trim() ||
			data.toolCallId.length > 160 ||
			!Array.isArray(data.tags)
		)
			return null;
		const tags = Array.from(
			new Set(
				data.tags.flatMap((tag) => {
					const parsed = assistantInvalidationTagSchema.safeParse(tag);
					return parsed.success ? [parsed.data] : [];
				}),
			),
		);
		return tags.length
			? ({
					type: part.type,
					id: part.id,
					data: { toolCallId: data.toolCallId, tags },
				} as Prisma.InputJsonValue)
			: null;
	}
	return null;
}

const defaultDependencies: ExecuteAssistantTurnDependencies = {
	prepareImage: prepareAssistantImage,
	extractPdf: extractAssistantPdfText,
	captureDiagnostic: captureAssistantDiagnostic,
	preprocessingDeadlineMs: ASSISTANT_PREPROCESSING_DEADLINE_MS,
	loadHistory({ actor, conversationId }) {
		return getAssistantModelHistory(db, {
			conversationId,
			ownerUserId: actor.userId,
			scopeType: actor.scopeType,
			scopeId: actor.scopeId,
		});
	},
	loadDocuments({ conversationId, documentIds }) {
		if (documentIds.length === 0) return Promise.resolve([]);
		return db.storedDocument.findMany({
			where: {
				id: { in: documentIds },
				ownerType: "assistant_conversation",
				ownerId: conversationId,
				status: "ready",
				isCurrent: true,
				visibility: "private",
				provider: "vercel-blob",
				sourceType: "authenticated_browser_upload",
				deletedAt: null,
			},
			select: {
				id: true,
				filename: true,
				mimeType: true,
				description: true,
				url: true,
				pathname: true,
				size: true,
				provider: true,
				sourceType: true,
			},
		});
	},
	async loadDocumentBytes({ document, signal }) {
		if (
			document.provider !== "vercel-blob" ||
			document.sourceType !== "authenticated_browser_upload"
		) {
			throw new Error("Uploaded document content is unavailable");
		}
		const response = await get(document.pathname, {
			access: "private",
			abortSignal: signal,
			useCache: false,
		});
		if (!response?.stream || response.statusCode !== 200) {
			throw new Error("Uploaded document content is unavailable");
		}
		if (response.blob.size > 8_000_000) {
			throw new Error("Uploaded document is too large");
		}
		const bytes = new Uint8Array(
			await new Response(response.stream).arrayBuffer(),
		);
		if (!bytes.length || bytes.length > 8_000_000) {
			throw new Error("Uploaded document content is unavailable");
		}
		return bytes;
	},
	async executeRuntime(input) {
		const runId = input.runId;
		const [session, composioTools] = await Promise.all([
			createAssistantMcpExecutionClient(
				input.actor,
				input.reauthorizeActor,
				runId
					? async (execution) => {
							const result = summarizeAssistantToolExecutionResult(
								execution.result,
							);
							await recordAssistantToolExecution(db, {
								runId,
								ownerUserId: input.actor.userId,
								scopeType: input.actor.scopeType,
								scopeId: input.actor.scopeId,
								toolCallId: execution.toolCallId,
								step: execution.step,
								toolId: execution.toolId,
								toolVersion: execution.toolVersion,
								effect: execution.effect,
								status: execution.status,
								toolInput: execution.toolInput as Prisma.InputJsonValue,
								result: execution.recovery ? { ...(result ?? { status: execution.status }), recovery: execution.recovery } : result,
								durationMs: execution.durationMs,
								completedAt: new Date(),
							});
						}
					: undefined,
				async (error, failure) => {
					const diagnostic = await captureAssistantDiagnostic(error, {
						attempt: failure.attempt, presentation: failure.retrying ? "not-shown" : undefined,
						stage: "tool", operation: failure.toolId, toolCallId: failure.toolCallId,
						outcome: failure.outcome, runId, requestId: input.requestId, conversationId: input.conversationId,
						actorUserId: input.actor.userId, scopeType: input.actor.scopeType, scopeId: input.actor.scopeId,
						provider: input.runtimeSelection?.provider, model: input.runtimeSelection?.model,
					});
					const retryId =
						!failure.retrying &&
						failure.effect === "read" &&
						failure.outcome === "temporary" &&
						runId &&
						input.conversationId
							? await createAssistantReadRetry(input.actor, {
									conversationId: input.conversationId,
									runId,
									toolCallId: failure.toolCallId,
									toolId: failure.toolId,
									version: failure.toolVersion,
									input: failure.toolInput,
								})
							: null;
					return {
						reference: diagnostic.reference,
						...(retryId ? { retryId } : {}),
						...(retryId
							? {
									retryExpiresAt: new Date(
										Date.now() + 600_000,
									).toISOString(),
								}
							: {}),
					};
				},
			),
			isAssistantReadOnlyCanary()
				? Promise.resolve({})
				: getAssistantComposioTools(
						input.actor,
						input.mentionedIntegrations.map(({ id }) => id),
						process.env,
						undefined,
						input.reauthorizeActor,
					),
		]);
		try {
			await warmAssistantToolIndex(input.actor);
			return await createAssistantRuntime({
				selection: input.runtimeSelection,
				modelTools: { ...session.tools, ...composioTools },
				trustedResultTools: Object.keys(session.tools).filter(
					(toolName) => !(toolName in composioTools),
				),
				trustedResultToolEffects: session.toolEffects,
				alwaysActiveTools: Object.keys(composioTools),
				prepareStep: createAssistantPrepareStep(input.actor),
				cleanup: session.close,
			}).execute(input);
		} catch (error) {
			await session.close();
			throw error;
		}
	},
	async persistAssistantMessage(input) {
		await appendAssistantGeneratedMessage(db, {
			conversationId: input.conversationId,
			ownerUserId: input.actor.userId,
			scopeType: input.actor.scopeType,
			scopeId: input.actor.scopeId,
			runId: input.runId,
			parts: [
				...input.assistantParts,
				{ type: "text", text: input.assistantText },
			],
			searchText: input.assistantText,
			parentMessageId: input.parentMessageId,
		});
	},
};

function throwIfAssistantPreprocessingAborted(signal: AbortSignal) {
	if (signal.aborted) {
		throw signal.reason instanceof Error
			? signal.reason
			: new Error("Assistant attachment preprocessing was cancelled");
	}
}

async function extractAssistantPdfText(bytes: Uint8Array, signal: AbortSignal) {
	throwIfAssistantPreprocessingAborted(signal);
	const loadingTask = getDocument({
		data: bytes,
		isEvalSupported: false,
		stopAtErrors: true,
	});
	const abort = () => void loadingTask.destroy();
	signal.addEventListener("abort", abort, { once: true });
	try {
		const document = await loadingTask.promise;
		let text = "";
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
			throwIfAssistantPreprocessingAborted(signal);
			const page = await document.getPage(pageNumber);
			const content = await page.getTextContent();
			const pageText = content.items
				.flatMap((item) => ("str" in item ? [item.str] : []))
				.join(" ");
			text += `\n[Page ${pageNumber}] ${pageText}`;
			if (text.length > 50_000) return `${text.slice(0, 50_000)}\n[truncated]`;
		}
		return text.trim() || "[PDF contains no extractable text]";
	} finally {
		signal.removeEventListener("abort", abort);
		await loadingTask.destroy();
	}
}

async function prepareAssistantImage(
	bytes: Uint8Array,
	mimeType: string,
	signal: AbortSignal,
) {
	throwIfAssistantPreprocessingAborted(signal);
	const image = sharp(bytes, {
		failOn: "warning",
		limitInputPixels: ASSISTANT_MAX_IMAGE_PIXELS,
		sequentialRead: true,
	});
	const abort = () =>
		image.destroy(
			signal.reason instanceof Error
				? signal.reason
				: new Error("Assistant attachment preprocessing was cancelled"),
		);
	signal.addEventListener("abort", abort, { once: true });
	try {
		const metadata = await image.metadata();
		throwIfAssistantPreprocessingAborted(signal);
		if (
			!metadata.width ||
			!metadata.height ||
			metadata.width * metadata.height > ASSISTANT_MAX_IMAGE_PIXELS
		) {
			throw new AssistantAttachmentInputError("attachment-too-large");
		}
		const nativeMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
		if (nativeMimeTypes.has(mimeType)) {
			return { bytes, mimeType };
		}
		const normalized = new Uint8Array(await image.rotate().jpeg().toBuffer());
		throwIfAssistantPreprocessingAborted(signal);
		if (normalized.byteLength > ASSISTANT_MAX_NORMALIZED_IMAGE_BYTES) {
			throw new AssistantAttachmentInputError("attachment-too-large");
		}
		return { bytes: normalized, mimeType: "image/jpeg" };
	} finally {
		signal.removeEventListener("abort", abort);
	}
}

export async function executeAssistantConversationTurn(
	input: {
		actor: AssistantTurnActor;
		request: AssistantChatRequest;
		run: { runId: string; triggerMessageId?: string; modelIdentity?: string };
		writer: AssistantRuntimeInput["writer"];
		signal: AbortSignal;
		reauthorizeActor?: AssistantRuntimeInput["reauthorizeActor"];
	},
	overrides: Partial<ExecuteAssistantTurnDependencies> = {},
) {
	const dependencies = { ...defaultDependencies, ...overrides };
	const cancelledBeforeProvider = () => ({
		status: "cancelled" as const,
		errorCode: "ASSISTANT_RUN_CANCELLED",
		errorMessage: "Assistant run cancelled",
		usage: { providerAttempted: false },
	});
	if (input.signal.aborted) return cancelledBeforeProvider();
	const stage = <T>(name: AssistantDiagnosticStage, operation: string, execute: () => Promise<T>) => runAssistantOperation({
		stage: name, operation, runId: input.run.runId, conversationId: input.request.conversationId,
		requestId: input.request.requestId, actorUserId: input.actor.userId,
		scopeType: input.actor.scopeType, scopeId: input.actor.scopeId,
	}, execute, { capture: dependencies.captureDiagnostic, signal: input.signal });
	const currentActor = input.reauthorizeActor
		? await stage(
				"authentication",
				"assistant.reauthorizeTurn",
				input.reauthorizeActor,
			)
		: input.actor;
	assertAssistantActorContinuation(input.actor, currentActor);
	if (input.signal.aborted) return cancelledBeforeProvider();
	const [runProvider, runModel] = input.run.modelIdentity?.split(":", 2) ?? [];
	const runtimeSelection = await stage("provider", "assistant.resolveProvider", async () => {
		const selection = runProvider && runModel
			? resolveAssistantRuntimeSelection({
					ASSISTANT_AI_PROVIDER: runProvider,
					ASSISTANT_AI_MODEL: runModel,
				})
			: getAssistantRuntimeIdentity();
		assertAssistantProviderEnabled(selection.provider);
		return selection;
	});
	if (input.signal.aborted) return cancelledBeforeProvider();
	const documentIds = input.request.message.parts.flatMap((part) =>
		part.type === "file" ? [part.documentId] : [],
	);
	const [history, documents] = await Promise.all([
		stage("history", "assistant.loadHistory", () => dependencies.loadHistory({
			actor: currentActor,
			conversationId: input.request.conversationId,
		})),
		stage("attachment", "assistant.loadAttachments", () => dependencies.loadDocuments({
			conversationId: input.request.conversationId,
			documentIds,
		})),
	]);
	if (input.signal.aborted) return cancelledBeforeProvider();
	const fallbackText =
		input.request.message.parts
			.flatMap((part) => (part.type === "text" ? [part.text] : []))
			.join("\n") || "Review the attached uploaded document context.";
	const declaredAttachmentBytes = documents.reduce(
		(total, document) => total + (document.size ?? 8_000_000),
		0,
	);
	await stage("attachment", "assistant.checkAttachments", async () => {
		if (declaredAttachmentBytes > 16_000_000) throw new AssistantAttachmentInputError("attachment-too-large");
		for (const document of documents) {
			if (document.mimeType === "application/pdf") continue;
			if (!document.mimeType?.startsWith("image/")) throw new AssistantAttachmentInputError("attachment-unsupported");
			if (runtimeSelection.provider === "deepseek") throw new AssistantAttachmentInputError("image-unsupported");
		}
	});
	const preprocessingController = new AbortController();
	const preprocessingTimeout = setTimeout(
		() =>
			preprocessingController.abort(
				new Error("Assistant attachment preprocessing timed out"),
			),
		Math.max(1, dependencies.preprocessingDeadlineMs),
	);
	const preprocessingSignal = AbortSignal.any([
		input.signal,
		preprocessingController.signal,
	]);
	let attachmentParts: Array<
		| { type: "text"; text: string }
		| { type: "image"; image: Uint8Array; mediaType: string }
	>;
	try {
		const documentContent: Array<{
			document: AssistantTurnDocument;
			bytes: Uint8Array;
		}> = [];
		let loadedAttachmentBytes = 0;
		for (const document of documents) {
			const bytes = await stage("attachment", "assistant.downloadAttachment", () => dependencies.loadDocumentBytes({
				document,
				signal: preprocessingSignal,
			}));
			throwIfAssistantPreprocessingAborted(preprocessingSignal);
			loadedAttachmentBytes += bytes.byteLength;
			if (loadedAttachmentBytes > 16_000_000) {
				throw new AssistantAttachmentInputError("attachment-too-large");
			}
			documentContent.push({ document, bytes });
		}
		attachmentParts = await Promise.all(
			documentContent.map(async ({ document, bytes }) => {
				if (document.mimeType === "application/pdf") {
					return {
						type: "text" as const,
						text: `[Uploaded PDF: ${document.filename || "document.pdf"}]\n${await stage("attachment", "assistant.extractPdf", () => withAssistantAttachmentCorrection("pdf", () => dependencies.extractPdf(bytes, preprocessingSignal)))}`,
					};
				}
				const normalized = await stage("attachment", "assistant.prepareImage", () => withAssistantAttachmentCorrection("image", () => dependencies.prepareImage(
					bytes,
					document.mimeType!,
					preprocessingSignal,
				)));
				return {
					type: "image" as const,
					image: normalized.bytes,
					mediaType: normalized.mimeType,
				};
			}),
		);
	} catch (error) {
		if (input.signal.aborted) {
			return {
				status: "cancelled" as const,
				errorCode: "ASSISTANT_RUN_CANCELLED",
				errorMessage: "Assistant run cancelled",
				usage: { providerAttempted: false },
			};
		}
		return stage("attachment", "assistant.prepareAttachments", async () => { throw error; });
	} finally {
		clearTimeout(preprocessingTimeout);
	}
	const triggerMessageId = input.run.triggerMessageId;
	const modelMessages: ModelMessage[] = history.length
		? history.flatMap((message): ModelMessage[] => {
				if (message.role === "assistant") {
					return [
						...(message.text ? [{ role: "assistant" as const, content: message.text }] : []),
						...(message.executionFacts ? [{ role: "system" as const, content: `Private historical context for the preceding response. Use it only to interpret prior checks; never quote this note or its tool identifiers in your reply.\n${message.executionFacts}` }] : []),
					];
				}
				return [{
					role: "user",
					content:
						message.id === triggerMessageId && attachmentParts.length
							? [
									{
										type: "text" as const,
										text: message.text || fallbackText,
									},
									...attachmentParts,
								]
							: message.text,
				}];
			})
		: [
				{
					role: "user",
					content: attachmentParts.length
						? [
								{ type: "text" as const, text: fallbackText },
								...attachmentParts,
							]
						: fallbackText,
				},
			];
	const assistantPartMap = new Map<string, Prisma.InputJsonValue>();
	const outcome = await dependencies.executeRuntime({
		runId: input.run.runId,
		conversationId: input.request.conversationId,
		requestId: input.request.requestId,
		actor: currentActor,
		modelMessages,
		recentUploads: documents.map((document) => ({
			id: document.id,
			filename: document.filename ?? "uploaded document",
			mimeType: document.mimeType ?? "application/octet-stream",
			summary: document.description,
		})),
		mentionedIntegrations: input.request.mentionedIntegrationIds.map((id) => ({
			id,
			name: id,
		})),
		writer: {
			write(chunk) {
				input.writer.write(chunk);
				const persistentPart = persistentAssistantPart(chunk);
				if (persistentPart && typeof persistentPart === "object" && "id" in persistentPart) {
					assistantPartMap.set(String(persistentPart.id), persistentPart);
				}
			},
		},
		signal: input.signal,
		reauthorizeActor: input.reauthorizeActor,
		runtimeSelection,
	});
	const assistantParts = [...assistantPartMap.values()];
	if (input.signal.aborted) {
		return {
			status: "cancelled" as const,
			errorCode: "ASSISTANT_RUN_CANCELLED",
			errorMessage: "Assistant run cancelled",
			usage: outcome.usage,
		};
	}
	if (outcome.status === "cancelled") return outcome;
	const persistResponse = async (assistantText: string) => {
		try {
			await dependencies.persistAssistantMessage({
				actor: currentActor, conversationId: input.request.conversationId,
				runId: input.run.runId, parentMessageId: input.run.triggerMessageId ?? null,
				assistantText, assistantParts,
			});
			return true;
		} catch (error) {
			if (input.signal.aborted) return false;
			let reference: string | undefined;
			try {
				reference = (await dependencies.captureDiagnostic(error, {
					stage: "history", operation: "assistant.saveReply", outcome: "history-unconfirmed",
					runId: input.run.runId, conversationId: input.request.conversationId,
					requestId: input.request.requestId, actorUserId: input.actor.userId,
					scopeType: input.actor.scopeType, scopeId: input.actor.scopeId,
				})).reference;
			} catch {
				console.error("assistant_history_diagnostic_failed", { runId: input.run.runId });
			}
			// Keep the completed business response. Do not retry a provider/tool
			// because saving its transcript failed or its commit is uncertain.
			input.writer.write({ type: "data-assistant-history-notice", id: "assistant-history-notice", data: {
				kind: "history-unconfirmed", ...(reference ? { reference } : {}),
			} });
			return false;
		}
	};
	if (outcome.status === "failed") {
		const storedOutcome = assistantPartMap.get("assistant-outcome");
		const parsed = assistantOutcomeSchema.safeParse(storedOutcome && typeof storedOutcome === "object" && "data" in storedOutcome ? storedOutcome.data : null);
		const publicOutcome = parsed.success ? parsed.data : { kind: "temporary" as const };
		if (!parsed.success) {
			const part = { type: "data-assistant-outcome", id: "assistant-outcome", data: publicOutcome };
			input.writer.write(part);
			assistantParts.push(part);
		}
		await persistResponse(presentAssistantOutcome(publicOutcome).message);
		return outcome;
	}
	if (outcome.status !== "succeeded") return outcome;
	const committed = await persistResponse(outcome.assistantText);
	return {
		status: outcome.status,
		usage: outcome.usage,
		committed,
	};
}
