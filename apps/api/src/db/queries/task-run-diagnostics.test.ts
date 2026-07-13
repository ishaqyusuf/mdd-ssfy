import { describe, expect, test } from "bun:test";
import {
	finalizeTaskRunDiagnosticWithRetriever,
	recordTaskRunStartFailure,
} from "./task-run-diagnostics";

function buildContext() {
	const calls: Array<{ name: string; payload: unknown }> = [];
	type DiagnosticMutationPayload = {
		data?: Record<string, unknown>;
		update?: Record<string, unknown>;
	};
	const user = {
		id: 7,
		name: "Admin User",
		email: "admin@example.com",
		roles: [
			{
				role: {
					name: "Super Admin",
				},
			},
		],
	};

	return {
		calls,
		ctx: {
			userId: user.id,
			db: {
				users: {
					findFirst: async () => user,
				},
				taskRunDiagnostic: {
					create: async (payload: unknown) => {
						calls.push({ name: "taskRunDiagnostic.create", payload });
						return {
							id: "diagnostic-id",
							...(payload as DiagnosticMutationPayload).data,
						};
					},
					upsert: async (payload: unknown) => {
						calls.push({ name: "taskRunDiagnostic.upsert", payload });
						return {
							id: "diagnostic-id",
							...(payload as DiagnosticMutationPayload).update,
						};
					},
				},
			},
		} as unknown as Parameters<typeof recordTaskRunStartFailure>[0],
	};
}

describe("task run diagnostics", () => {
	test("records task start failures with actor snapshot and bounded metadata", async () => {
		const { ctx, calls } = buildContext();

		await recordTaskRunStartFailure(ctx, {
			taskName: "send-sales-email",
			title: "Sending sales email",
			errorMessage: "Trigger API rejected the request",
			metadata: {
				type: "sales-email",
				entityId: 42,
				entityLabel: "sale #42",
			},
		});

		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			name: "taskRunDiagnostic.create",
			payload: {
				data: {
					status: "START_FAILED",
					taskName: "send-sales-email",
					actorId: 7,
					actorName: "Admin User",
					entityType: "sales-email",
					entityId: "42",
					userMessage: "Unable to start this background task.",
					internalError: "Trigger API rejected the request",
				},
			},
		});
	});

	test("lets an observed output failure override a successful trigger run", async () => {
		const { ctx, calls } = buildContext();

		await finalizeTaskRunDiagnosticWithRetriever(
			ctx,
			{
				runId: "run_123",
				observedStatus: "FAILED",
				errorMessage: "Email provider reported 2 failed messages.",
				metadata: {
					taskName: "send-sales-email",
					type: "sales-email",
					entityLabel: "2 sales",
				},
			},
			async () => ({
				id: "run_123",
				taskIdentifier: "send-sales-email",
				status: "COMPLETED",
				isCompleted: true,
				output: {
					emails: {
						sent: 0,
						failed: 2,
						skipped: 0,
					},
				},
				finishedAt: "2026-07-13T10:30:00.000Z",
			}),
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({
			name: "taskRunDiagnostic.upsert",
			payload: {
				where: {
					runId: "run_123",
				},
				update: {
					status: "FAILED",
					taskName: "send-sales-email",
					entityType: "sales-email",
					entityLabel: "2 sales",
					userMessage: "The background task failed.",
					internalError: "Email provider reported 2 failed messages.",
					outputSummary: {
						emails: {
							sent: 0,
							failed: 2,
							skipped: 0,
						},
					},
				},
			},
		});
	});
});
