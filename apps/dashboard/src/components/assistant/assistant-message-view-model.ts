import {
	type AssistantAnalyticsResult,
	assistantAnalyticsPartSchema,
} from "@api/assistant/analytics-result-contract";
import type { AssistantEntityReference } from "@api/assistant/contracts";
import { assistantFindingPartSchema, type AssistantOrderFinding } from "@api/assistant/finding-contract";
import { assistantHistoryNoticeSchema, assistantOutcomeSchema, presentAssistantOutcome, type AssistantOutcome } from "@api/assistant/outcomes";
import {
	type AssistantDocumentProposalAction,
	assistantDocumentProposalActionPartSchema,
} from "@api/assistant/document-action-contract";
import {
	type AssistantSalesRequestDraftPreview,
	assistantOrderDraftPartSchema,
} from "@api/assistant/order-draft-contract";
import { parseAssistantEntity } from "./assistant-entities";

const hiddenAssistantTools = new Set(["search_tools", "system_search_tools"]);

const assistantToolLabels: Record<string, string> = {
	web_search: "Searching the web",
	COMPOSIO_SEARCH_TOOLS: "Looking up connected apps",
	orders_search: "Searching orders",
	orders_get: "Fetching order",
	orders_create: "Creating order",
	customers_search: "Searching customers",
	customers_get: "Fetching customer",
	inventory_list: "Looking up inventory",
	documents_create: "Creating document",
};

export type AssistantToolStatus =
	| "queued"
	| "running"
	| "complete"
	| "failed"
	| "approval-required";

export type AssistantResponseCardKind =
	| "empty"
	| "ambiguity"
	| "partial"
	| "permission"
	| "degraded"
	| "recoverable-error"
	| "missing-feature";

export type AssistantMessageViewModel = {
	text: string;
	outcome: AssistantOutcome | null;
	historyNotice: AssistantOutcome | null;
	findings: AssistantOrderFinding[];
	reasoningStatus: "streaming" | "complete" | null;
	tools: Array<{
		id: string;
		name: string;
		label: string;
		status: AssistantToolStatus;
	}>;
	sources: Array<{
		id: string;
		label: string;
		url: string | null;
		scope: "public" | "workspace";
		observedAt: string | null;
		freshness: string | null;
	}>;
	files: Array<{ id: string; name: string; mediaType: string }>;
	entities: AssistantEntityReference[];
	orderDrafts: Array<{
		id: string;
		data: AssistantSalesRequestDraftPreview;
	}>;
	analytics: Array<{
		id: string;
		data: AssistantAnalyticsResult;
	}>;
	documentActions: Array<{
		id: string;
		data: AssistantDocumentProposalAction;
	}>;
	cards: Array<{
		kind: AssistantResponseCardKind;
		title: string;
		description: string | null;
		actionLabel: string | null;
		requestSummary: string | null;
	}>;
	showThinking: boolean;
	hasContent: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: null;
}

function boundedString(value: unknown, max: number) {
	return typeof value === "string" && value.trim()
		? value.trim().slice(0, max)
		: null;
}

export function formatAssistantToolLabel(name: string) {
	if (assistantToolLabels[name]) return assistantToolLabels[name];
	if (name.startsWith("orders_")) return "Checking your order";
	if (name.startsWith("customers_")) return "Checking customer details";
	if (name.startsWith("inventory_")) return "Checking availability";
	if (name.startsWith("documents_")) return "Preparing your document";
	return "Working on your request";
}

function normalizeToolStatus(state: string): AssistantToolStatus {
	if (state === "approval-requested") return "approval-required";
	if (state === "output-available") return "complete";
	if (state === "output-error" || state === "output-denied") return "failed";
	if (state === "input-available" || state === "approval-responded") {
		return "running";
	}
	return "queued";
}

function normalizeAssistantTool(part: Record<string, unknown>) {
	const type = boundedString(part.type, 120);
	const data = type === "data-assistant-tool" ? asRecord(part.data) : null;
	const name =
		type === "data-assistant-tool"
			? boundedString(data?.name, 100)
			: type === "dynamic-tool"
				? boundedString(part.toolName, 100)
				: type?.startsWith("tool-")
					? type.slice(5)
					: null;
	const id = boundedString(data?.id ?? part.toolCallId, 160);
	const state = boundedString(data?.status ?? part.state, 40);
	if (!name || !id || !state || hiddenAssistantTools.has(name)) return null;
	return {
		id,
		name,
		label: formatAssistantToolLabel(name),
		status:
			type === "data-assistant-tool" &&
			["queued", "running", "complete", "failed", "approval-required"].includes(
				state,
			)
				? (state as AssistantToolStatus)
				: normalizeToolStatus(state),
	};
}

function normalizeAssistantSource(part: Record<string, unknown>) {
	const type = boundedString(part.type, 80);
	if (type !== "source-url" && type !== "data-source") return null;
	const data = type === "data-source" ? asRecord(part.data) : part;
	if (!data) return null;
	const rawUrl = boundedString(data.url, 2_000);
	const url = rawUrl?.startsWith("https://") ? rawUrl : null;
	const id = boundedString(data.sourceId ?? data.id, 300) ?? url;
	let fallbackLabel: string | null = null;
	if (url) {
		try {
			fallbackLabel = new URL(url).hostname.replace(/^www\./, "");
		} catch {
			fallbackLabel = null;
		}
	}
	const label = boundedString(data.title ?? data.label, 200) ?? fallbackLabel;
	if (!id || !label || (type === "source-url" && !url)) return null;
	return {
		id,
		label,
		url,
		scope:
			url &&
			(type === "source-url" || data.kind === "url" || data.kind === "web")
				? ("public" as const)
				: ("workspace" as const),
		observedAt: boundedString(data.observedAt, 80),
		freshness: boundedString(data.freshness, 80),
	};
}

function normalizeAssistantFile(part: Record<string, unknown>) {
	if (part.type !== "file") return null;
	const id = boundedString(part.url, 500);
	const mediaType = boundedString(part.mediaType, 100);
	if (!id || !mediaType) return null;
	return {
		id,
		name: boundedString(part.filename, 200) ?? "Attachment",
		mediaType,
	};
}

const assistantCardKinds = new Set<AssistantResponseCardKind>([
	"empty",
	"ambiguity",
	"partial",
	"permission",
	"degraded",
	"recoverable-error",
	"missing-feature",
]);

function normalizeAssistantCard(part: Record<string, unknown>) {
	if (part.type !== "data-assistant-card") return null;
	const data = asRecord(part.data);
	const kind = boundedString(
		data?.kind,
		40,
	) as AssistantResponseCardKind | null;
	const title = boundedString(data?.title, 160);
	if (!kind || !assistantCardKinds.has(kind) || !title) return null;
	return {
		kind,
		title,
		description: boundedString(data?.description, 500),
		actionLabel: boundedString(data?.actionLabel, 80),
		requestSummary: boundedString(data?.requestSummary, 500),
	};
}

export function normalizeAssistantMessage(
	message: unknown,
	options: { isStreaming: boolean; isLastMessage: boolean },
): AssistantMessageViewModel {
	const record = asRecord(message);
	const parts = Array.isArray(record?.parts)
		? record.parts.flatMap((part) => {
				const value = asRecord(part);
				return value ? [value] : [];
			})
		: [];
	const tools = [...new Map(parts.flatMap((part) => {
		const tool = normalizeAssistantTool(part);
		return tool ? [[tool.id, tool] as const] : [];
	})).values()];
	const outcome = parts.reduce<AssistantOutcome | null>((current, part) => {
		if (part.type !== "data-assistant-outcome") return current;
		const parsed = assistantOutcomeSchema.safeParse(part.data);
		return parsed.success ? parsed.data : current;
	}, null);
	const historyNotice = parts.reduce<AssistantOutcome | null>((current, part) => {
		if (part.type !== "data-assistant-history-notice") return current;
		const parsed = assistantHistoryNoticeSchema.safeParse(part.data);
		return parsed.success ? parsed.data : current;
	}, null);
	const lastToolIndex = parts.reduce(
		(last, part, index) => (normalizeAssistantTool(part) ? index : last),
		-1,
	);
	const toolsInProgress = tools.some(
		(tool) => tool.status === "queued" || tool.status === "running",
	);
	const text = outcome ? presentAssistantOutcome(outcome).message :
		options.isLastMessage && options.isStreaming && toolsInProgress
			? ""
			: parts
					.flatMap((part, index) =>
						part.type === "text" &&
						typeof part.text === "string" &&
						(lastToolIndex < 0 || index > lastToolIndex)
							? [part.text]
							: [],
					)
					.join("")
					.trim();
	const reasoningParts = parts.filter((part) => part.type === "reasoning");
	const reasoningStatus = reasoningParts.length
		? reasoningParts.some((part) => part.state === "streaming")
			? ("streaming" as const)
			: ("complete" as const)
		: null;
	const sources = parts
		.flatMap((part) => {
			const source = normalizeAssistantSource(part);
			return source ? [source] : [];
		})
		.slice(0, 8);
	const files = parts.flatMap((part) => {
		const file = normalizeAssistantFile(part);
		return file ? [file] : [];
	});
	const cards = parts.flatMap((part) => {
		const card = normalizeAssistantCard(part);
		return card ? [card] : [];
	});
	const seenEntities = new Set<string>();
	const entities = parts
		.flatMap((part) => {
			if (part.type !== "data-assistant-entity") return [];
			const entity = parseAssistantEntity(part.data);
			if (!entity) return [];
			const subtype = entity.kind === "community"
				? entity.communityType
				: entity.kind === "order" ? entity.salesType ?? "order" : "";
			const key = JSON.stringify([entity.kind, subtype, entity.id]);
			if (seenEntities.has(key)) return [];
			seenEntities.add(key);
			return [entity];
		})
		.slice(0, 20);
	const findingMap = new Map<string, AssistantOrderFinding>();
	for (const part of parts) {
		const parsed = assistantFindingPartSchema.safeParse(part);
		if (!parsed.success) continue;
		const finding = parsed.data.data;
		const key = `${finding.salesType}:${finding.orderNo}`;
		if (findingMap.has(key) || findingMap.size < 6) findingMap.set(key, finding);
	}
	const findings = outcome ? [...findingMap.values()] : [];
	const orderDrafts = parts.flatMap((part) => {
		const parsed = assistantOrderDraftPartSchema.safeParse(part);
		return parsed.success
			? [{ id: parsed.data.id, data: parsed.data.data }]
			: [];
	});
	const analytics = parts.flatMap((part) => {
		const parsed = assistantAnalyticsPartSchema.safeParse(part);
		return parsed.success
			? [{ id: parsed.data.id, data: parsed.data.data }]
			: [];
	});
	const documentActions = parts.flatMap((part) => {
		const parsed = assistantDocumentProposalActionPartSchema.safeParse(part);
		return parsed.success
			? [{ id: parsed.data.id, data: parsed.data.data }]
			: [];
	});
	const showThinking =
		options.isStreaming &&
		options.isLastMessage &&
		!text &&
		tools.length === 0 &&
		cards.length === 0;
	return {
		text,
		outcome,
		historyNotice,
		findings,
		reasoningStatus,
		tools,
		sources,
		files,
		entities,
		orderDrafts,
		analytics,
		documentActions,
		cards,
		showThinking,
		hasContent:
			Boolean(historyNotice) ||
			Boolean(text) ||
			findings.length > 0 ||
			tools.length > 0 ||
			sources.length > 0 ||
			files.length > 0 ||
			entities.length > 0 ||
			orderDrafts.length > 0 ||
			analytics.length > 0 ||
			documentActions.length > 0 ||
			cards.length > 0,
	};
}
