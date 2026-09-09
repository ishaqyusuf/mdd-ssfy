import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { prepareSentryAlert } from "./sentry-alert";

const config = {
	clientSecret: "local-test-secret-only",
	installationId: "installation-test",
	account: "test-org",
	projectId: "123",
	operation: "runtime.error",
	service: {
		id: "web",
		owner: "platform",
		operations: ["runtime.error"],
		sources: [{ provider: "sentry", account: "test-org", project: "123" }],
	},
} as const;
const now = new Date("2026-09-09T12:00:00.000Z");
function request(event = {}, installation: string = config.installationId) {
	const rawBody = Buffer.from(
		JSON.stringify({
			action: "triggered",
			installation: { uuid: installation },
			data: {
				event: {
					project: 123,
					event_id: "event-1",
					issue_id: "issue-1",
					datetime: "2026-09-09T11:00:00.123456Z",
					tags: [["environment", "production"]],
					message: "private customer information",
					user: { email: "private@example.test" },
					...event,
				},
			},
		}),
	);
	return {
		rawBody,
		signature: createHmac("sha256", config.clientSecret)
			.update(rawBody)
			.digest("hex"),
		resource: "event_alert",
	};
}
describe("Sentry issue-alert intake", () => {
	it("normalizes signed provider metadata without retaining raw customer fields", () => {
		const result = prepareSentryAlert(request(), config, now);
		expect(result.occurrence.occurredAt).toBe("2026-09-09T11:00:00.123Z");
		expect(result.occurrence.eventId).toBe("event-1");
		expect(result.incident.severity).toBe("P2");
		expect(JSON.stringify(result)).not.toContain("private");
		expect(prepareSentryAlert(request(), config, now).occurrence.key).toBe(
			result.occurrence.key,
		);
	});
	it("rejects altered bytes, malformed signatures, and unconfigured secrets", () => {
		const valid = request();
		expect(() =>
			prepareSentryAlert(
				{ ...valid, rawBody: Buffer.concat([valid.rawBody, Buffer.from(" ")]) },
				config,
				now,
			),
		).toThrow("Invalid Sentry signature");
		expect(() =>
			prepareSentryAlert({ ...valid, signature: "bad" }, config, now),
		).toThrow("Invalid Sentry signature");
		expect(() =>
			prepareSentryAlert(valid, { ...config, clientSecret: "" }, now),
		).toThrow("Invalid Sentry signature");
	});
	it("enforces installation, project, and explicit production environment", () => {
		expect(() =>
			prepareSentryAlert(request({}, "other-installation"), config, now),
		).toThrow("Unregistered Sentry installation");
		expect(() =>
			prepareSentryAlert(request({ project: 999 }), config, now),
		).toThrow("Unregistered Sentry project");
		for (const event of [
			{ tags: [] },
			{ environment: "preview" },
			{
				tags: [
					["environment", "production"],
					["environment", "preview"],
				],
			},
		]) {
			expect(() => prepareSentryAlert(request(event), config, now)).toThrow(
				"Invalid Sentry environment",
			);
		}
	});
	it("rejects rolled dates and oversized payloads before parsing", () => {
		expect(() =>
			prepareSentryAlert(
				request({ datetime: "2026-02-30T11:00:00.123456Z" }),
				config,
				now,
			),
		).toThrow("Invalid reliability occurrence time");
		expect(() =>
			prepareSentryAlert(
				{ ...request(), rawBody: Buffer.alloc(1_048_577) },
				config,
				now,
			),
		).toThrow("Sentry payload too large");
	});
});
