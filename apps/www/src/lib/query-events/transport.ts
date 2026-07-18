import { QUERY_EVENTS, type QueryEvent, type QueryEventName } from "./registry";
import type { QueryEventScope } from "./types";

export type QueryEventEnvelope = QueryEvent & {
	id: string;
	occurredAt: number;
	source: string;
};

type QueryEventListener = (
	event: QueryEventEnvelope,
) => Promise<unknown> | unknown;

const CHANNEL_NAME = "gnd-query-events:v1";
const MAX_PROCESSED_EVENTS = 200;
const listeners = new Set<QueryEventListener>();
const processedEventIds = new Set<string>();
const source = createId();
let channel: BroadcastChannel | null = null;

function createId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function rememberEvent(id: string) {
	processedEventIds.add(id);
	if (processedEventIds.size <= MAX_PROCESSED_EVENTS) return;

	const first = processedEventIds.values().next().value;
	if (first) processedEventIds.delete(first);
}

async function deliver(event: QueryEventEnvelope) {
	if (processedEventIds.has(event.id)) return [];
	rememberEvent(event.id);

	return Promise.allSettled(
		Array.from(listeners, (listener) => Promise.resolve(listener(event))),
	);
}

function getChannel() {
	if (
		channel ||
		typeof window === "undefined" ||
		!("BroadcastChannel" in window)
	) {
		return channel;
	}

	channel = new BroadcastChannel(CHANNEL_NAME);
	channel.addEventListener("message", (message) => {
		const event = message.data as QueryEventEnvelope;
		if (
			!event ||
			event.source === source ||
			typeof event.name !== "string" ||
			!(event.name in QUERY_EVENTS)
		) {
			return;
		}

		void deliver(event);
	});

	return channel;
}

export function subscribeQueryEvents(listener: QueryEventListener) {
	listeners.add(listener);
	getChannel();

	return () => {
		listeners.delete(listener);
	};
}

export function publishQueryEvent(
	name: QueryEventName,
	scope?: QueryEventScope,
) {
	const event: QueryEventEnvelope = {
		id: createId(),
		name,
		occurredAt: Date.now(),
		...(scope ? { scope } : {}),
		source,
	};

	const result = deliver(event);
	getChannel()?.postMessage(event);
	return result;
}

export async function publishQueryEvents(events: readonly QueryEvent[]) {
	const uniqueEvents = new Map<QueryEventName, QueryEvent>();
	for (const event of events) {
		const previous = uniqueEvents.get(event.name);
		if (
			(previous && !previous.scope?.sales?.length) ||
			!event.scope?.sales?.length
		) {
			uniqueEvents.set(event.name, { name: event.name });
			continue;
		}
		const sales = [
			...(previous?.scope?.sales ?? []),
			...(event.scope?.sales ?? []),
		];
		const uniqueSales = Array.from(
			new Map(
				sales.map((sale) => [`${sale.salesType}:${sale.orderNo}`, sale]),
			).values(),
		);
		uniqueEvents.set(event.name, {
			name: event.name,
			...(uniqueSales.length
				? {
						scope: {
							sales: uniqueSales,
						},
					}
				: {}),
		});
	}
	return Promise.allSettled(
		Array.from(uniqueEvents.values(), (event) =>
			publishQueryEvent(event.name, event.scope),
		),
	);
}
