import type { AssistantChatRequest } from "@api/schemas/assistant";
import { db } from "@gnd/db";
import {
	appendAssistantGeneratedMessage,
	getAssistantModelHistory,
} from "@gnd/db/queries";
import type { ModelMessage } from "ai";
import { type AssistantRuntimeInput, createAssistantRuntime } from "./runtime";

type AssistantTurnActor = AssistantRuntimeInput["actor"];

type AssistantTurnDocument = {
	id: string;
	filename: string | null;
	mimeType: string | null;
	description: string | null;
};

type AssistantTurnHistory = Array<{
	id: string;
	sequence: number;
	role: "user" | "assistant";
	text: string;
}>;

type AssistantTurnOutcome =
	| {
			status: "succeeded";
			usage: Record<string, string | number>;
			assistantText: string;
	  }
	| {
			status: "failed" | "cancelled";
			errorCode: string;
			errorMessage: string;
	  };

type ExecuteAssistantTurnDependencies = {
	loadHistory(input: {
		actor: AssistantTurnActor;
		conversationId: string;
	}): Promise<AssistantTurnHistory>;
	loadDocuments(input: {
		conversationId: string;
		documentIds: string[];
	}): Promise<AssistantTurnDocument[]>;
	executeRuntime(input: AssistantRuntimeInput): Promise<AssistantTurnOutcome>;
	persistAssistantMessage(input: {
		actor: AssistantTurnActor;
		conversationId: string;
		runId: string;
		parentMessageId: string | null;
		assistantText: string;
	}): Promise<void>;
};

const defaultDependencies: ExecuteAssistantTurnDependencies = {
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
				deletedAt: null,
			},
			select: {
				id: true,
				filename: true,
				mimeType: true,
				description: true,
			},
		});
	},
	executeRuntime(input) {
		return createAssistantRuntime().execute(input);
	},
	async persistAssistantMessage(input) {
		await appendAssistantGeneratedMessage(db, {
			conversationId: input.conversationId,
			ownerUserId: input.actor.userId,
			scopeType: input.actor.scopeType,
			scopeId: input.actor.scopeId,
			runId: input.runId,
			parts: [{ type: "text", text: input.assistantText }],
			searchText: input.assistantText,
			parentMessageId: input.parentMessageId,
		});
	},
};

export async function executeAssistantConversationTurn(
	input: {
		actor: AssistantTurnActor;
		request: AssistantChatRequest;
		run: { runId: string; triggerMessageId?: string };
		writer: AssistantRuntimeInput["writer"];
		signal: AbortSignal;
	},
	overrides: Partial<ExecuteAssistantTurnDependencies> = {},
) {
	const dependencies = { ...defaultDependencies, ...overrides };
	const documentIds = input.request.message.parts.flatMap((part) =>
		part.type === "file" ? [part.documentId] : [],
	);
	const [history, documents] = await Promise.all([
		dependencies.loadHistory({
			actor: input.actor,
			conversationId: input.request.conversationId,
		}),
		dependencies.loadDocuments({
			conversationId: input.request.conversationId,
			documentIds,
		}),
	]);
	const fallbackText =
		input.request.message.parts
			.flatMap((part) => (part.type === "text" ? [part.text] : []))
			.join("\n") || "Review the attached uploaded document context.";
	const modelMessages: ModelMessage[] =
		history.length > 0
			? history.map((message) => ({
					role: message.role,
					content: message.text,
				}))
			: [{ role: "user", content: fallbackText }];
	const outcome = await dependencies.executeRuntime({
		actor: input.actor,
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
		writer: input.writer,
		signal: input.signal,
	});
	if (outcome.status !== "succeeded") return outcome;
	if (input.signal.aborted) {
		return {
			status: "cancelled" as const,
			errorCode: "ASSISTANT_RUN_CANCELLED",
			errorMessage: "Assistant run cancelled",
		};
	}
	await dependencies.persistAssistantMessage({
		actor: input.actor,
		conversationId: input.request.conversationId,
		runId: input.run.runId,
		parentMessageId: input.run.triggerMessageId ?? null,
		assistantText: outcome.assistantText,
	});
	return {
		status: outcome.status,
		usage: outcome.usage,
		committed: true as const,
	};
}
