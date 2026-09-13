import type { QueryEventName } from "@/lib/query-events/registry";
import {
	type AssistantInvalidationTag,
	assistantInvalidationTagSchema,
} from "@api/assistant/contracts";

export type AssistantInvalidation = {
	toolCallId: string;
	tags: AssistantInvalidationTag[];
};

export const assistantQueryEventForTag: Record<
	AssistantInvalidationTag,
	QueryEventName
> = {
	"sales.orders": "sales.order.changed",
	"sales.quotes": "sales.quote.changed",
	"sales.payments": "sales.payment.changed",
	"sales.pipeline": "sales.pipeline.changed",
	customers: "customer.changed",
	"inventory.catalog": "inventory.catalog.changed",
	"inventory.stock": "inventory.stock.changed",
	"inventory.inbound": "inventory.inbound.changed",
	"community.projects": "community.projects.changed",
	documents: "documents.changed",
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: null;
}

export async function dispatchAssistantInvalidations(
	events: readonly AssistantInvalidation[],
	operations: {
		emit: (event: QueryEventName) => unknown | Promise<unknown>;
		invalidateGlobalSearch: () => unknown | Promise<unknown>;
	},
) {
	if (!events.length) return;
	const queryEvents = new Set(
		events.flatMap(({ tags }) =>
			tags.map((tag) => assistantQueryEventForTag[tag]),
		),
	);
	await Promise.all([
		...queryEvents.values().map((event) => operations.emit(event)),
		operations.invalidateGlobalSearch(),
	]);
}

export function collectAssistantInvalidations(
	messages: readonly unknown[],
	processedToolCalls: Set<string>,
): AssistantInvalidation[] {
	const results: AssistantInvalidation[] = [];
	for (const rawMessage of messages) {
		const message = asRecord(rawMessage);
		if (!Array.isArray(message?.parts)) continue;
		for (const rawPart of message.parts) {
			const part = asRecord(rawPart);
			if (part?.type !== "data-assistant-invalidation") continue;
			const data = asRecord(part.data);
			const toolCallId =
				typeof data?.toolCallId === "string"
					? data.toolCallId.trim().slice(0, 160)
					: "";
			if (!toolCallId || processedToolCalls.has(toolCallId)) continue;
			const tags = Array.isArray(data?.tags)
				? Array.from(
						new Set(
							data.tags.flatMap((tag) => {
								const parsed = assistantInvalidationTagSchema.safeParse(tag);
								return parsed.success ? [parsed.data] : [];
							}),
						),
					)
				: [];
			if (!tags.length) continue;
			processedToolCalls.add(toolCallId);
			results.push({ toolCallId, tags });
		}
	}
	return results;
}
