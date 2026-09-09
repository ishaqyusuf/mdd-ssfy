import { expect, it } from "bun:test";
import { runConfiguredSentryReconciliation } from "./configured-sentry";

const entry = {
	account: "org",
	projectId: "123",
	apiOrigin: "https://sentry.io",
	operation: "runtime.error",
	serviceId: "web",
	owner: "platform",
	tokenEnv: "RELIABILITY_SENTRY_READ_TOKEN_WEB",
};
const env = {
	RELIABILITY_SENTRY_POLL_ENABLED: "true",
	RELIABILITY_SENTRY_READ_SOURCES: JSON.stringify([entry]),
	RELIABILITY_SENTRY_READ_TOKEN_WEB: "local-only-token",
};

it("stops starting new sources when the batch time budget is exhausted", async () => {
	let elapsed = 0;
	const summary = await runConfiguredSentryReconciliation({
		env: {
			...env,
			RELIABILITY_SENTRY_READ_SOURCES: JSON.stringify([
				entry,
				{ ...entry, projectId: "456" },
			]),
		},
		environment: "PRODUCTION",
		now: () => new Date(elapsed),
		execute: async () => {
			elapsed = 221_000;
			return { status: "complete", pages: 1, occurrences: 1 };
		},
	});
	expect(summary.status).toBe("budget_exhausted");
	expect(summary.results).toHaveLength(1);
});

it("reports execution failure without exposing raw provider or database errors", async () => {
	const summary = await runConfiguredSentryReconciliation({
		env,
		environment: "PRODUCTION",
		now: () => new Date(),
		execute: async () => {
			throw new Error("private diagnostic");
		},
	});
	expect(summary.status).toBe("attention_required");
	expect(JSON.stringify(summary)).not.toContain("private diagnostic");
});
it("keeps disabled or nonproduction schedules from executing any source", async () => {
	const execute = async () => {
		throw new Error("Must not execute");
	};
	for (const input of [
		{ env: {}, environment: "PRODUCTION" },
		{ env, environment: "DEVELOPMENT" },
	]) {
		expect(
			(
				await runConfiguredSentryReconciliation({
					...input,
					now: () => new Date(),
					execute,
				})
			).status,
		).toBe("disabled");
	}
});

it("configures a seven-day historical sweep independently from incremental polling", async () => {
	await runConfiguredSentryReconciliation({
		env,
		environment: "PRODUCTION",
		mode: "historical",
		now: () => new Date(),
		execute: async (_source, budget) => {
			expect(budget.mode).toBe("historical");
			expect(budget.lookbackMs).toBe(7 * 86_400_000);
			return { status: "complete", pages: 1, occurrences: 0 };
		},
	});
});
it("resolves credentials separately and returns only sanitized source summaries", async () => {
	const summary = await runConfiguredSentryReconciliation({
		env,
		environment: "PRODUCTION",
		now: () => new Date(),
		execute: async (source, budget) => {
			expect(source.token).toBe("local-only-token");
			expect(budget.maxPages).toBe(5);
			return { status: "complete", pages: 2, occurrences: 3 };
		},
	});
	expect(summary.results).toHaveLength(1);
	expect(JSON.stringify(summary)).not.toContain("local-only-token");
});
it("rejects duplicate provider scopes and missing read credentials before execution", async () => {
	const execute = async () => {
		throw new Error("Must not execute");
	};
	for (const config of [
		{ ...env, RELIABILITY_SENTRY_READ_TOKEN_WEB: undefined },
		{
			...env,
			RELIABILITY_SENTRY_READ_SOURCES: JSON.stringify([
				entry,
				{ ...entry, serviceId: "other" },
			]),
		},
	]) {
		await expect(
			runConfiguredSentryReconciliation({
				env: config,
				environment: "PRODUCTION",
				now: () => new Date(),
				execute,
			}),
		).rejects.toThrow("Invalid Sentry polling configuration");
	}
});
