import type {
	NativeAnalyticsBatch,
	NativeAnalyticsEvent,
	NativeEventProperty,
} from "./native-contract";
import { sanitizeNativeProperties } from "./native-contract";
import { safeRoute } from "./policy";

type Storage = {
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
	removeItem(key: string): Promise<void>;
};
type Visitor = {
	id: string;
	firstSeenOn: string;
	lastSessionOn: string | null;
};

export function createNativeAnalytics(options: {
	project: string;
	endpoint: string;
	platform: "ios" | "android";
	appVersion?: string;
	appBuild?: string;
	storage: Storage;
	createId: () => string;
	enabled?: boolean;
	now?: () => Date;
	send?: (batch: NativeAnalyticsBatch) => Promise<void>;
}) {
	const now = options.now ?? (() => new Date());
	const visitorKey = `logly:${options.project}:native-visitor`;
	const queueKey = `logly:${options.project}:native-queue`;
	let visitor: Visitor | null = null;
	let queue: NativeAnalyticsEvent[] = [];
	let initialized = false;
	let timer: ReturnType<typeof setInterval> | undefined;
	let inFlight: Promise<void> | undefined;
	let lastRoute: string | null = null;

	const persistQueue = async () => {
		if (queue.length) {
			await options.storage.setItem(queueKey, JSON.stringify(queue));
		} else {
			await options.storage.removeItem(queueKey);
		}
	};
	const send =
		options.send ??
		(async (batch: NativeAnalyticsBatch) => {
			const response = await fetch(options.endpoint, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(batch),
				signal: AbortSignal.timeout(4_000),
			});
			if (!response.ok) throw new Error("Analytics delivery failed");
		});
	const flush = () => {
		if (inFlight) return inFlight;
		if (!initialized || !queue.length) return Promise.resolve();
		inFlight = (async () => {
			const current = now().getTime();
			queue = queue
				.filter((event) => current - Date.parse(event.occurredAt) < 86_400_000)
				.slice(-250);
			const events = queue.slice(0, 25);
			if (!events.length) return persistQueue();
			try {
				await send({
					sentAt: now().toISOString(),
					sdk: { name: "@ishaqyusuf/logly-core", version: "0.3.0" },
					events,
				});
				const delivered = new Set(events.map((event) => event.eventId));
				queue = queue.filter((event) => !delivered.has(event.eventId));
			} catch {
				// Stable event IDs remain in the bounded queue for retry.
			}
			await persistQueue();
		})().finally(() => {
			inFlight = undefined;
		});
		return inFlight;
	};
	const enqueue = async (
		name: string,
		properties: Record<string, unknown> = {},
		route?: string,
		visitKind?: "new" | "returning",
	) => {
		if (!initialized || !visitor || !/^[a-z][a-z0-9_.]{0,79}$/.test(name)) {
			return;
		}
		queue.push({
			eventId: options.createId(),
			project: options.project,
			name,
			version: 1,
			source: "mobile",
			platform: options.platform,
			appVersion: options.appVersion?.slice(0, 64),
			appBuild: options.appBuild?.slice(0, 64),
			occurredAt: now().toISOString(),
			visitorId: visitor.id,
			visitKind,
			route: route ? safeRoute(route) : undefined,
			properties: sanitizeNativeProperties(properties),
		});
		queue = queue.slice(-250);
		await persistQueue();
		void flush();
	};
	const trackSession = async (route?: string) => {
		if (!initialized || !visitor) return;
		const day = now().toISOString().slice(0, 10);
		if (visitor.lastSessionOn === day) return;
		const visitKind = visitor.firstSeenOn === day ? "new" : "returning";
		visitor.lastSessionOn = day;
		await options.storage.setItem(visitorKey, JSON.stringify(visitor));
		await enqueue("app_session", {}, route, visitKind);
	};

	return {
		async init() {
			if (initialized || options.enabled === false) return;
			try {
				const [storedVisitor, storedQueue] = await Promise.all([
					options.storage.getItem(visitorKey),
					options.storage.getItem(queueKey),
				]);
				const parsedVisitor = storedVisitor ? JSON.parse(storedVisitor) : null;
				const parsedQueue = storedQueue ? JSON.parse(storedQueue) : [];
				const day = now().toISOString().slice(0, 10);
				visitor =
					parsedVisitor &&
					typeof parsedVisitor.id === "string" &&
					typeof parsedVisitor.firstSeenOn === "string"
						? parsedVisitor
						: { id: options.createId(), firstSeenOn: day, lastSessionOn: null };
				queue = Array.isArray(parsedQueue) ? parsedQueue.slice(-250) : [];
				initialized = true;
				await options.storage.setItem(visitorKey, JSON.stringify(visitor));
				timer = setInterval(() => void flush(), 60_000);
			} catch {
				initialized = false;
				visitor = null;
			}
		},
		trackSession,
		async trackScreenView(route: string) {
			if (!initialized) return;
			const safe = safeRoute(route);
			await trackSession(safe);
			if (lastRoute === safe) return;
			lastRoute = safe;
			await enqueue("screen_view", {}, safe);
		},
		track(name: string, properties?: Record<string, NativeEventProperty>) {
			return enqueue(name, properties);
		},
		flush,
		async destroy() {
			if (timer) clearInterval(timer);
			await flush();
			initialized = false;
			visitor = null;
			lastRoute = null;
		},
	};
}
