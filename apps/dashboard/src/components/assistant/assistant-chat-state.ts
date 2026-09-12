import type { UIMessage } from "ai";

export type AssistantStreamState = {
	title: string | null;
	runId: string | null;
	status: string | null;
	rateLimit: { limit: number; remaining: number; resetAt: string } | null;
	notice: string | null;
	messageSequence: number;
	runSequence: number;
};

export const initialAssistantStreamState: AssistantStreamState = {
	title: null,
	runId: null,
	status: null,
	rateLimit: null,
	notice: null,
	messageSequence: 0,
	runSequence: 0,
};

export type AssistantRequestLimit = {
	limit: number;
	remaining: number;
	resetAt: string;
};

export function parseAssistantRequestLimit(
	value: unknown,
): AssistantRequestLimit | null {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	if (
		typeof record.limit !== "number" ||
		typeof record.remaining !== "number" ||
		typeof record.resetAt !== "string"
	) {
		return null;
	}
	return {
		limit: record.limit,
		remaining: record.remaining,
		resetAt: record.resetAt,
	};
}

export function buildAssistantChatRequest(
	conversationId: string,
	messages: UIMessage[],
) {
	const latest = [...messages]
		.reverse()
		.find((message) => message.role === "user");
	if (!latest) throw new Error("A user message is required");
	const parts: Array<
		{ type: "text"; text: string } | { type: "file"; documentId: string }
	> = [];
	for (const part of latest.parts) {
		if (part.type === "text") {
			parts.push({ type: "text", text: part.text });
			continue;
		}
		if (part.type === "file" && "url" in part && typeof part.url === "string") {
			parts.push({ type: "file", documentId: part.url });
		}
	}
	return {
		conversationId,
		requestId: crypto.randomUUID(),
		message: { id: latest.id, role: "user" as const, parts },
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		localTime: new Date().toISOString(),
		mentionedIntegrationIds: [] as string[],
	};
}

export function reduceAssistantData(
	state: AssistantStreamState,
	part: { type: string; data?: unknown },
): AssistantStreamState {
	const data = part.data as Record<string, unknown> | undefined;
	if (!data) return state;
	if (part.type === "data-title" && typeof data.title === "string") {
		return { ...state, title: data.title };
	}
	if (part.type === "data-rate-limit") {
		return { ...state, rateLimit: data as AssistantStreamState["rateLimit"] };
	}
	if (part.type === "data-run" && typeof data.runId === "string") {
		return {
			...state,
			runId: data.runId,
			status: String(data.status ?? "running"),
			notice: null,
		};
	}
	if (part.type === "data-sequence") {
		return {
			...state,
			messageSequence: Number(data.messageSequence ?? state.messageSequence),
			runSequence: Number(data.runSequence ?? state.runSequence),
		};
	}
	if (part.type === "data-warning" && typeof data.message === "string") {
		return { ...state, notice: data.message };
	}
	if (part.type === "data-terminal-status") {
		const status = String(data.status ?? state.status);
		return {
			...state,
			status,
			notice: status === "succeeded" ? null : state.notice,
		};
	}
	return state;
}

export function persistedMessagesToUi(
	messages: Array<{ id?: string; role?: string; parts?: unknown }>,
): UIMessage[] {
	return messages
		.filter(
			(
				message,
			): message is {
				id: string;
				role: "user" | "assistant";
				parts?: unknown;
			} =>
				Boolean(message.id) &&
				(message.role === "user" || message.role === "assistant"),
		)
		.map((message) => ({
			id: message.id,
			role: message.role as "user" | "assistant",
			parts: Array.isArray(message.parts)
				? message.parts.filter((part): part is UIMessage["parts"][number] =>
						Boolean(part && typeof part === "object" && "type" in part),
					)
				: [],
		}));
}
