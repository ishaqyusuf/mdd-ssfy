import { afterEach, expect, test } from "bun:test";
import { createEventsRoute } from "./route";

const originalFetch = globalThis.fetch;
const originalEnvironment = {
	LOGLY_COLLECTOR_URL: process.env.LOGLY_COLLECTOR_URL,
	LOGLY_PROJECT_KEY: process.env.LOGLY_PROJECT_KEY,
	LOGLY_MOBILE_PROJECT_KEY: process.env.LOGLY_MOBILE_PROJECT_KEY,
	LOGLY_MOBILE_PROJECT: process.env.LOGLY_MOBILE_PROJECT,
	NEXT_PUBLIC_LOGLY_PROJECT: process.env.NEXT_PUBLIC_LOGLY_PROJECT,
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
	GND_LOGLY_ORIGIN: process.env.GND_LOGLY_ORIGIN,
	VERCEL: process.env.VERCEL,
};

afterEach(() => {
	globalThis.fetch = originalFetch;
	for (const [key, value] of Object.entries(originalEnvironment)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});

function configure() {
	process.env.LOGLY_COLLECTOR_URL = "https://collector.logly.test";
	process.env.LOGLY_PROJECT_KEY = "web-key";
	process.env.LOGLY_MOBILE_PROJECT_KEY = "mobile-key";
	process.env.LOGLY_MOBILE_PROJECT = "gnd-mobile";
	process.env.NEXT_PUBLIC_LOGLY_PROJECT = "gnd-web";
	process.env.NEXT_PUBLIC_APP_URL = "https://www.gndprodesk.com";
	process.env.GND_LOGLY_ORIGIN = "https://dealers.gndprodesk.com";
}

test("mobile proxy fixes the project and forwards native platform metadata", async () => {
	configure();
	process.env.LOGLY_MOBILE_PROJECT = " gnd-mobile\n";
	process.env.LOGLY_MOBILE_PROJECT_KEY = " mobile-key\n";
	process.env.LOGLY_COLLECTOR_URL = " https://collector.logly.test\n";
	process.env.VERCEL = "1";
	const request = new Request("https://api.gnd.test/api/analytics/mobile", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-vercel-ip-country": "NG",
		},
		body: JSON.stringify({
			sentAt: "2026-09-12T12:00:00.000Z",
			sdk: { name: "@ishaqyusuf/logly-core", version: "0.3.0" },
			events: [
				{
					eventId: "00000000-0000-4000-8000-000000000001",
					project: "wrong",
					name: "app_session",
					version: 1,
					source: "mobile",
					platform: "ios",
					occurredAt: "2026-09-12T12:00:00.000Z",
					visitorId: "installation-a",
					route: "/jobs/private",
					properties: {},
				},
			],
		}),
	});
	globalThis.fetch = (async (_url, init) => {
		const headers = new Headers(init?.headers);
		const body = JSON.parse(String(init?.body));
		expect(headers.get("x-logly-project-key")).toBe("mobile-key");
		expect(headers.get("x-logly-country")).toBe("NG");
		expect(body.events[0]).toMatchObject({
			project: "gnd-mobile",
			source: "mobile",
			platform: "ios",
			route: "/jobs",
		});
		return Response.json({ accepted: 1 }, { status: 202 });
	}) as typeof fetch;
	expect((await createEventsRoute("mobile")(request)).status).toBe(202);
});

test("dashboard web proxy pins its origin and project independently of dealership configuration", async () => {
	configure();
	const body = {
		sentAt: "2026-09-21T12:00:00.000Z",
		sdk: { name: "@ishaqyusuf/logly-core", version: "0.2.1" },
		events: [
			{
				eventId: "00000000-0000-4000-8000-000000000003",
				project: "gnd-web",
				name: "site_visit",
				version: 1,
				source: "browser",
				occurredAt: "2026-09-21T12:00:00.000Z",
				visitorId: "dashboard-visitor",
				route: "/dashboard/private",
				properties: {},
			},
		],
	};
	globalThis.fetch = (async (_url, init) => {
		const forwarded = JSON.parse(String(init?.body));
		expect(forwarded.events[0]).toMatchObject({
			project: "gnd-dashboard",
			source: "browser",
			route: "/dashboard",
		});
		return Response.json({ accepted: 1 }, { status: 202 });
	}) as typeof fetch;
	const response = await createEventsRoute(
		"web",
		"https://www.gndprodesk.com",
		"gnd-dashboard",
	)(
		new Request("https://www.gndprodesk.com/api/analytics", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://www.gndprodesk.com",
			},
			body: JSON.stringify(body),
		}),
	);
	expect(response.status).toBe(202);
});

test("web proxy enforces the product origin and fixes the web project", async () => {
	configure();
	const body = {
		sentAt: "2026-09-12T12:00:00.000Z",
		sdk: { name: "@ishaqyusuf/logly-core", version: "0.2.1" },
		events: [
			{
				eventId: "00000000-0000-4000-8000-000000000002",
				project: "wrong",
				name: "site_visit",
				version: 1,
				source: "browser",
				occurredAt: "2026-09-12T12:00:00.000Z",
				visitorId: "visitor-a",
				route: "/orders/private?email=hidden",
				properties: {},
			},
		],
	};
	const disallowed = new Request(
		"https://dealers.gndprodesk.com/api/analytics",
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: "https://evil.test",
			},
			body: JSON.stringify(body),
		},
	);
	expect((await createEventsRoute("web")(disallowed)).status).toBe(403);

	globalThis.fetch = (async (_url, init) => {
		const headers = new Headers(init?.headers);
		const forwarded = JSON.parse(String(init?.body));
		expect(headers.get("x-logly-project-key")).toBe("web-key");
		expect(forwarded.events[0]).toMatchObject({
			project: "gnd-web",
			source: "browser",
			route: "/orders",
		});
		return Response.json({ accepted: 1 }, { status: 202 });
	}) as typeof fetch;
	const allowed = new Request("https://dealers.gndprodesk.com/api/analytics", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			origin: "https://dealers.gndprodesk.com",
		},
		body: JSON.stringify(body),
	});
	expect((await createEventsRoute("web")(allowed)).status).toBe(202);
});
