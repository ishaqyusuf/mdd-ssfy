import { expect, it } from "bun:test";
import { runConfiguredTriggerReconciliation } from "./configured-trigger";

const entry = {
	account: "org",
	project: "jobs",
	environmentId: "env-prod",
	serviceId: "jobs",
	owner: "platform",
	fallbackOperation: "jobs.unknown",
	operations: [{ task: "save-sale", operation: "sales.save" }],
	tokenEnv: "RELIABILITY_TRIGGER_READ_TOKEN_JOBS",
};
const env = {
	RELIABILITY_TRIGGER_POLL_ENABLED: "true",
	RELIABILITY_TRIGGER_READ_SOURCES: JSON.stringify([entry]),
	RELIABILITY_TRIGGER_READ_TOKEN_JOBS: "tr_prod_sk_fixture",
};
const result = { status: "complete", pages: 1, runs: 2, watchFailures: 0 };
const now = () => new Date(0);

it("uses an independent seven-day historical sweep budget", async () => {
	const summary = await runConfiguredTriggerReconciliation({
		env,
		environment: "PRODUCTION",
		mode: "historical",
		now,
		execute: async (_source, budget) => {
			expect(budget.mode).toBe("historical");
			expect(budget.lookbackMs).toBe(7 * 86_400_000);
			return result;
		},
	});
	expect(summary.status).toBe("complete");
});

it("keeps disabled and nonproduction jobs inert", async () => {
	for (const config of [
		{ env: {}, environment: "PRODUCTION" },
		{ env, environment: "DEVELOPMENT" },
	]) {
		let calls = 0;
		expect(
			(
				await runConfiguredTriggerReconciliation({
					...config,
					now,
					execute: async () => {
						calls++;
						return result;
					},
				})
			).status,
		).toBe("disabled");
		expect(calls).toBe(0);
	}
});
it("validates the entire source batch before accessing providers", async () => {
	for (const config of [
		{ ...env, RELIABILITY_TRIGGER_READ_TOKEN_JOBS: "tr_dev_sk_fixture" },
		{
			...env,
			RELIABILITY_TRIGGER_READ_SOURCES: JSON.stringify([
				entry,
				{ ...entry, serviceId: "other" },
			]),
		},
		{
			...env,
			RELIABILITY_TRIGGER_READ_SOURCES: JSON.stringify([
				{ ...entry, operations: [entry.operations[0], entry.operations[0]] },
			]),
		},
	]) {
		let calls = 0;
		await expect(
			runConfiguredTriggerReconciliation({
				env: config,
				environment: "PRODUCTION",
				now,
				execute: async () => {
					calls++;
					return result;
				},
			}),
		).rejects.toThrow("Invalid Trigger polling configuration");
		expect(calls).toBe(0);
	}
});
it("binds task operations and credentials while preserving watch failure attention", async () => {
	const summary = await runConfiguredTriggerReconciliation({
		env,
		environment: "PRODUCTION",
		now,
		execute: async (source, budget) => {
			expect(source.service.operations).toEqual(["jobs.unknown", "sales.save"]);
			expect(source.token).toBe("tr_prod_sk_fixture");
			expect(budget.maxWatches).toBe(20);
			return { ...result, status: "attention_required", watchFailures: 1 };
		},
	});
	expect(summary.status).toBe("attention_required");
	expect(JSON.stringify(summary)).not.toContain("tr_prod_sk_fixture");
});
it("bounds batch time and sanitizes execution errors", async () => {
	let elapsed = 0;
	const summary = await runConfiguredTriggerReconciliation({
		env: {
			...env,
			RELIABILITY_TRIGGER_READ_SOURCES: JSON.stringify([
				entry,
				{ ...entry, project: "other", environmentId: "env-other" },
			]),
		},
		environment: "PRODUCTION",
		now: () => new Date(elapsed),
		execute: async () => {
			elapsed = 221_000;
			throw new Error("private diagnostic");
		},
	});
	expect(summary.status).toBe("budget_exhausted");
	expect(summary.results).toHaveLength(1);
	expect(JSON.stringify(summary)).not.toContain("private diagnostic");
});
