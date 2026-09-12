import type { AnalyticsBatch, EventProperty } from "@ishaqyusuf/logly-core";
import type {
	NativeAnalyticsBatch,
	NativeEventProperty,
} from "./native-contract";

const webEvents = new Set([
	"site_visit",
	"page_view",
	"dealer_program_progress_viewed",
]);
const mobileEvents = new Set([
	"app_session",
	"screen_view",
	"job_opened",
	"sales_order_opened",
	"document_viewed",
	"notification_opened",
]);
const routes = new Set([
	"",
	"login",
	"quotes",
	"orders",
	"customers",
	"settings",
	"dashboard",
	"jobs",
	"sales",
	"drivers",
	"installers",
	"documents",
	"notifications",
	"updates",
	"hrm",
]);
const safePropertyNames = new Set([
	"section",
	"has_filters",
	"status",
	"action",
	"result",
]);

export function safeRoute(route?: string) {
	const first = route?.split(/[?#]/)[0]?.split("/").filter(Boolean)[0] ?? "";
	return routes.has(first) ? `/${first}` : "/other";
}

function safeProperties(
	properties: Record<string, EventProperty | NativeEventProperty>,
) {
	return Object.fromEntries(
		Object.entries(properties).filter(([key]) => safePropertyNames.has(key)),
	);
}

export function safeBatch(
	batch: AnalyticsBatch | NativeAnalyticsBatch,
	project: string,
	surface: "web" | "mobile",
) {
	const allowed = surface === "mobile" ? mobileEvents : webEvents;
	const source = surface === "mobile" ? "mobile" : "browser";
	return {
		sentAt: batch.sentAt,
		sdk: batch.sdk,
		events: batch.events
			.filter((event) => allowed.has(event.name) && event.source === source)
			.map((event) => ({
				eventId: event.eventId,
				project,
				name: event.name,
				version: 1,
				source: event.source,
				platform:
					surface === "mobile" && "platform" in event ? event.platform : "web",
				appVersion: "appVersion" in event ? event.appVersion : undefined,
				appBuild: "appBuild" in event ? event.appBuild : undefined,
				occurredAt: event.occurredAt,
				visitorId: event.visitorId,
				visitKind: event.visitKind,
				route: safeRoute(event.route),
				properties: safeProperties(event.properties),
			})),
	};
}

export function isProductOrigin(
	origin: string,
	configuredOrigin: string,
	development = false,
) {
	try {
		const actual = new URL(origin);
		const configured = new URL(configuredOrigin);
		if (actual.origin === configured.origin) return true;
		return (
			development &&
			["localhost", "127.0.0.1"].some(
				(host) =>
					actual.hostname === host || actual.hostname.endsWith(`.${host}`),
			)
		);
	} catch {
		return false;
	}
}
