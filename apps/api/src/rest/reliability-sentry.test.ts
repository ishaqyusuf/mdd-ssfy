import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { handleSentryAlertRequest } from "./reliability-sentry";

const registration = {
	clientSecret: "local-http-test",
	installationId: "installation-test",
	account: "org-test",
	projectId: "123",
	operation: "runtime.error",
	service: {
		id: "web",
		owner: "platform",
		operations: ["runtime.error"],
		sources: [{ provider: "sentry", account: "org-test", project: "123" }],
	},
} as const;
function request(signature?: string) {
	const body = JSON.stringify({
		action: "triggered",
		installation: { uuid: registration.installationId },
		data: {
			event: {
				project: 123,
				event_id: "event-test",
				issue_id: "issue-test",
				environment: "production",
				datetime: "2026-09-09T11:00:00.123456Z",
			},
		},
	});
	return new Request(
		"https://api.example.test/api/webhooks/reliability/sentry/web",
		{
			method: "POST",
			body,
			headers: {
				"content-type": "application/json",
				"sentry-hook-resource": "event_alert",
				"sentry-hook-signature":
					signature ??
					createHmac("sha256", registration.clientSecret)
						.update(body)
						.digest("hex"),
			},
		},
	);
}
const now = () => new Date("2026-09-09T12:00:00Z");
describe("Sentry HTTP intake", () => {
	it("acknowledges only after persistence completes", async () => {
		const commit = Promise.withResolvers<void>();
		const started = Promise.withResolvers<void>();
		let responded = false;
		const response = handleSentryAlertRequest(request(), {
			registration,
			now,
			persist: async (intake) => {
				expect(intake.occurrence.eventId).toBe("event-test");
				started.resolve();
				await commit.promise;
			},
		});
		void response.then(() => {
			responded = true;
		});
		await started.promise;
		await Promise.resolve();
		expect(responded).toBe(false);
		commit.resolve();
		const result = await response;
		expect(result.status).toBe(200);
	});
	it("rejects oversized bodies without relying on a content-length header", async () => {
		const oversized = new Request("https://api.example.test/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "x".repeat(1_048_577),
		});
		const result = await handleSentryAlertRequest(oversized, {
			registration,
			now,
			persist: async () => {
				throw new Error("Must not persist");
			},
		});
		expect(result.status).toBe(413);
	});
	it("rejects invalid signatures without storage and returns retryable storage failures", async () => {
		let writes = 0;
		const persist = async () => {
			writes++;
			throw new Error("private database details");
		};
		expect(
			(
				await handleSentryAlertRequest(request("bad"), {
					registration,
					now,
					persist,
				})
			).status,
		).toBe(401);
		expect(writes).toBe(0);
		const failed = await handleSentryAlertRequest(request(), {
			registration,
			now,
			persist,
		});
		expect(failed.status).toBe(503);
		expect(await failed.text()).not.toContain("private");
	});
	it("keeps unregistered endpoints inactive", async () => {
		const result = await handleSentryAlertRequest(request(), {
			registration: null,
			now,
			persist: async () => {
				throw new Error("Must not persist");
			},
		});
		expect(result.status).toBe(404);
	});
});
