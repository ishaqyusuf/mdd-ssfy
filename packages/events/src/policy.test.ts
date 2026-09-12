import { expect, test } from "bun:test";
import { nativeAnalyticsBatchSchema } from "./native-contract";
import { safeBatch } from "./policy";

test("separates and sanitizes web and native telemetry", () => {
	const mobile = nativeAnalyticsBatchSchema.parse({
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
				appVersion: "1.0.0",
				appBuild: "10",
				occurredAt: "2026-09-12T12:00:00.000Z",
				visitorId: "installation-a",
				route: "/jobs/secret?email=private",
				properties: { email: "private@example.com", status: "active" },
			},
		],
	});
	expect(safeBatch(mobile, "gnd-mobile", "mobile").events[0]).toMatchObject({
		project: "gnd-mobile",
		source: "mobile",
		platform: "ios",
		route: "/jobs",
		properties: { status: "active" },
	});
	expect(safeBatch(mobile, "gnd-web", "web").events).toHaveLength(0);
});
