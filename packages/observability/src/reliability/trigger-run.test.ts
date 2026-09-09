import { expect, it } from "bun:test";
import { prepareTriggerRun } from "./trigger-run";

const source = {
	account: "trigger-account",
	project: "trigger-project",
	environmentId: "env-production",
	fallbackOperation: "jobs.unknown",
	operations: [{ task: "save-sale", operation: "sales.save" }],
	service: {
		id: "jobs",
		owner: "integrations",
		operations: ["sales.save", "jobs.unknown"],
		sources: [
			{
				provider: "trigger",
				account: "trigger-account",
				project: "trigger-project",
			},
		],
	},
} as const;
const now = new Date("2026-09-09T12:00:00Z");
const run = {
	id: "run_test",
	taskIdentifier: "save-sale",
	status: "EXECUTING",
	isTest: false,
	env: { id: "env-production" },
	createdAt: "2026-09-08T11:00:00Z",
	updatedAt: "2026-09-09T11:00:00Z",
	payload: { private: "customer data" },
};

it("keeps an old unfinished run watched and captures its later terminal failure", () => {
	const pending = prepareTriggerRun(run, source, now, { discovery: true });
	expect(pending.terminal).toBe(false);
	expect(pending.intake).toBeNull();
	const failed = prepareTriggerRun(
		{ ...run, status: "SYSTEM_FAILURE", finishedAt: run.updatedAt },
		source,
		now,
		{ expectedRunId: run.id },
	);
	expect(failed.terminal).toBe(true);
	expect(failed.intake?.occurrence.operation).toBe("sales.save");
	expect(failed.intake?.incident.severity).toBe("P2");
	expect(JSON.stringify(failed)).not.toContain("private");
});
it("rejects a different discovered environment or retrieved run identity", () => {
	expect(() =>
		prepareTriggerRun({ ...run, env: { id: "env-dev" } }, source, now, {
			discovery: true,
		}),
	).toThrow("Unregistered Trigger environment");
	expect(() =>
		prepareTriggerRun(run, source, now, { expectedRunId: "run_other" }),
	).toThrow("Trigger run identity mismatch");
});
it("keeps unknown states watched and distinguishes confirmed intentional cancellation", () => {
	expect(
		prepareTriggerRun({ ...run, status: "NEW_PROVIDER_STATE" }, source, now, {
			discovery: true,
		}).terminal,
	).toBe(false);
	const canceled = { ...run, status: "CANCELED", finishedAt: run.updatedAt };
	expect(
		prepareTriggerRun(canceled, source, now, { discovery: true }).intake
			?.incident.severity,
	).toBe("P2");
	expect(
		prepareTriggerRun(canceled, source, now, {
			discovery: true,
			expectedCancellation: true,
		}).intake?.incident.severity,
	).toBe("INFO");
});

it("captures platform terminal failures and routes unmapped tasks to the fallback operation", () => {
	for (const status of [
		"FAILED",
		"CRASHED",
		"SYSTEM_FAILURE",
		"EXPIRED",
		"TIMED_OUT",
	]) {
		const result = prepareTriggerRun(
			{
				...run,
				taskIdentifier: "unmapped-task",
				status,
				finishedAt: run.updatedAt,
			},
			source,
			now,
			{ discovery: true },
		);
		expect(result.intake?.occurrence.operation).toBe("jobs.unknown");
		expect(result.terminal).toBe(true);
	}
});
