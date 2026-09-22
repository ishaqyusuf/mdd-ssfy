import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import { PERMISSIONS } from "@gnd/utils/constants";
import {
	assistantProposalCreateSchema,
	createAssistantActionProposal,
	decideAssistantActionProposal,
	getAssistantActionProposal,
} from "./approvals";
import {
	AssistantProposalPrecommitError,
	assistantEffectPolicies,
	getAssistantPermissionMatrix,
} from "./registry";

process.env.ASSISTANT_APPROVAL_SECRET = "test-only-assistant-approval-secret";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	timezone: "UTC",
	grants: { viewOrders: true, viewOrderPayment: true },
};
const token = "approval-token-with-enough-entropy-123456789";
const tokenHash = createHash("sha256")
	.update(JSON.stringify(token))
	.digest("hex");
const now = new Date("2026-09-13T12:00:00.000Z");

function proposal(overrides: Record<string, unknown> = {}) {
	return {
		id: "proposal-1",
		runId: "run-1",
		actorUserId: 42,
		toolId: "documents_generate_pdf",
		toolVersion: 1,
		effect: "artifact",
		payloadHash: "a".repeat(64),
		payload: {
			orderNo: "09502PC",
			mode: "invoice",
			expectedRevision: "revision-1",
			forceRegenerate: false,
		},
		targetRevision: "revision-1",
		diff: {
			summary: "Confirm generate sales PDF.",
			changes: ["Require the reviewed record revision."],
		},
		status: "pending",
		expiresAt: new Date("2026-09-13T12:15:00.000Z"),
		nonceHash: tokenHash,
		idempotencyKey: "proposal-request-1",
		eventSequence: 1,
		confirmedAt: null,
		consumedAt: null,
		rejectedAt: null,
		executionStartedAt: null,
		result: null,
		errorCode: null,
		run: { requestFingerprint: "request-fingerprint" },
		...overrides,
	};
}

const decision = {
	proposalId: "proposal-1",
	approvalToken: token,
	confirmationRequestId: "75e55a33-9bed-4d5d-9cf7-52d2fc9fbe71",
	decision: "approve" as const,
};

function executionStore(row = proposal(), counts: number[] = []) {
	const proposalUpdateMany = mock(async () => ({ count: counts.shift() ?? 1 }));
	const runUpdateMany = mock(async () => ({ count: 1 }));
	const store = {
		assistantActionProposal: {
			findFirst: mock(async () => row),
			updateMany: proposalUpdateMany,
		},
		assistantRun: { updateMany: runUpdateMany },
		$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
			callback(store),
	};
	return { store, proposalUpdateMany, runUpdateMany };
}

const allowedPreflight = mock(async () => ({
	ok: true as const,
	targetRevision: "revision-1",
}));

describe("Assistant approval execution", () => {
	test("a changed reviewed record stays distinct from revoked access on status reads and decision replay", async () => {
		const { store } = executionStore(proposal({ status: "succeeded", result: { privateArtifactId: "artifact-1" } }));
		const preflight = (async () => ({ ok: true, targetRevision: "new-revision" })) as never;
		const read = await getAssistantActionProposal(store as never, actor, "proposal-1", now, preflight);
		const replay = await decideAssistantActionProposal(store as never, actor, decision, { preflight, execute: (async () => { throw new Error("must not replay"); }) as never }, now);
		for (const result of [read, replay]) {
			expect(result.errorCode).toBe("TARGET_CHANGED");
			expect(result.review).toBeNull();
			expect(result.result).toBeNull();
		}
	});
	test("unexpected preflight outages are captured without denying or executing the pending action", async () => {
		const original = new Error("private database connection");
		const captured: unknown[] = [];
		const { store, proposalUpdateMany } = executionStore();
		const execute = mock(async () => ({ status: "success" }));
		await expect(decideAssistantActionProposal(store as never, actor, decision, {
			preflight: (async () => { throw original; }) as never,
			execute: execute as never,
			capture: async (error, context) => { captured.push({ error, context }); return { reference: "ERR-ABCDEFGHIJ", recorded: true }; },
		}, now)).rejects.toMatchObject({ assistantOutcome: { kind: "temporary", reference: "ERR-ABCDEFGHIJ" } });
		expect(proposalUpdateMany).not.toHaveBeenCalled();
		expect(execute).not.toHaveBeenCalled();
		expect(captured).toHaveLength(1);
		expect(captured[0]).toMatchObject({ error: original, context: { operation: "assistant.approval.preflight", outcome: "temporary" } });
	});

	test("status reauthorization does not mislabel an infrastructure outage as revoked access", async () => {
		const original = new Error("private provider outage");
		const { store } = executionStore(proposal({ status: "succeeded" }));
		await expect(getAssistantActionProposal(store as never, actor, "proposal-1", now, (async () => { throw original; }) as never)).rejects.toBe(original);
	});

	for (const claimed of [0, 1]) {
		test(`stale status reads capture only the winning recovery (claimed: ${claimed})`, async () => {
			const row = proposal({ status: "executing", executionStartedAt: new Date("2026-09-13T11:54:59.000Z") });
			const { store, proposalUpdateMany, runUpdateMany } = executionStore(row, [claimed]);
			const captured: unknown[] = [];
			const capture = async (error: unknown, context: { reference?: string }) => {
				captured.push({ error, context });
				return { reference: context.reference!, recorded: true };
			};
			const result = await getAssistantActionProposal(store as never, actor, row.id, now, allowedPreflight as never, capture);
			expect(result.status).toBe(claimed ? "unknown" : "processing");
			expect(captured).toHaveLength(claimed);
			if (claimed) {
				expect(result.outcome?.kind).toBe("uncertain");
				expect(result.outcome?.reference).toMatch(/^ERR-[A-Z0-9]{10}$/);
				expect(captured[0]).toMatchObject({ context: { stage: "action", operation: "assistant.approval.recoverStaleExecution", outcome: "uncertain", runId: row.runId, reference: result.outcome?.reference } });
				expect(proposalUpdateMany.mock.calls[0]?.[0]).toMatchObject({ data: { result: { assistantOutcome: result.outcome } } });
				expect(runUpdateMany.mock.calls[0]?.[0]).toMatchObject({ data: { terminalResult: { assistantOutcome: result.outcome } } });
				const next = executionStore(proposal({ status: "unknown", result: result.result }));
				const replay = await getAssistantActionProposal(next.store as never, actor, row.id, now, allowedPreflight as never, capture);
				expect(replay.outcome).toEqual(result.outcome);
				expect(captured).toHaveLength(1);
				expect(next.proposalUpdateMany).not.toHaveBeenCalled();
			} else {
				expect(result.outcome).toBeNull();
			}
		});
	}

	test("captures the original uncertain action once and retains the reference on authorized replay", async () => {
		const original = new Error("private provider response token=secret");
		const captured: unknown[] = [];
		const deps = {
			preflight: allowedPreflight as never,
			execute: mock(async () => { throw original; }) as never,
			capture: async (error: unknown, context: { reference?: string }) => {
				captured.push({ error, context });
				return { reference: context.reference!, recorded: true };
			},
		};
		const { store, proposalUpdateMany } = executionStore();
		const result = await decideAssistantActionProposal(store as never, actor, decision, deps, now);
		expect(result.outcome?.kind).toBe("uncertain");
		expect(result.outcome?.reference).toMatch(/^ERR-[A-Z0-9]{10}$/);
		expect(captured).toHaveLength(1);
		expect(captured[0]).toMatchObject({ error: original, context: { runId: "run-1", actorUserId: 42, outcome: "uncertain" } });
		expect(JSON.stringify(result)).not.toContain("token=secret");
		expect(proposalUpdateMany.mock.calls[1]?.[0]).toMatchObject({ data: { result: { assistantOutcome: result.outcome } } });
		const replayStore = executionStore(proposal({ status: "unknown", result: result.result }));
		const replay = await decideAssistantActionProposal(replayStore.store as never, actor, decision, deps, now);
		expect(replay.outcome).toEqual(result.outcome);
		expect(deps.execute).toHaveBeenCalledTimes(1);
		expect(captured).toHaveLength(1);
	});

	test("returned failures are captured and their raw warning data is excluded from the receipt", async () => {
		const captured: unknown[] = [];
		const { store } = executionStore();
		const result = await decideAssistantActionProposal(store as never, actor, decision, {
			preflight: allowedPreflight as never,
			execute: mock(async () => ({ status: "failed", warnings: ["private SQL password=secret"] })) as never,
			capture: async (error, context) => { captured.push({ error, context }); return { reference: context.reference!, recorded: true }; },
		}, now);
		expect(result.outcome).toMatchObject({ kind: "temporary" });
		expect(captured).toHaveLength(1);
		expect(JSON.stringify(result)).not.toContain("password");
	});

	test("publishes one permission and confirmation policy for every tool", () => {
		const matrix = getAssistantPermissionMatrix();
		expect(matrix.length).toBeGreaterThan(10);
		expect(assistantEffectPolicies.read).toEqual({
			confirmation: "none",
			directExecution: true,
		});
		expect(assistantEffectPolicies.destructive).toEqual({
			confirmation: "explicit",
			directExecution: false,
		});
		expect(matrix.every((entry) => entry.checks.includes("job_resume"))).toBe(
			true,
		);
		const permissionNames = new Set<string>(PERMISSIONS);
		expect(
			matrix.filter((entry) =>
				entry.toolId.startsWith("sales_") ||
				entry.toolId.startsWith("customers_"),
			).flatMap((entry) => [
				...entry.requiredGrants,
				...entry.anyOfGrants,
			]).filter((grant) => !permissionNames.has(grant)),
		).toEqual([]);
	});

	test("rejects caller-authored confirmation diffs", () => {
		expect(() =>
			assistantProposalCreateSchema.parse({
				conversationId: "conversation-1",
				clientRequestId: decision.confirmationRequestId,
				toolId: "documents_generate_pdf",
				toolVersion: 1,
				input: {},
				diff: { summary: "This caller text must not be trusted" },
			}),
		).toThrow();
	});

	test("persists exact input and a server-derived review without storing the token", async () => {
		const proposalCreate = mock(async (input) => ({
			...proposal(),
			...input.data,
		}));
		const store = {
			assistantConversation: {
				findFirst: mock(async () => ({ id: "conversation-1" })),
			},
			assistantActionProposal: {
				findFirst: mock(async () => null),
				create: proposalCreate,
			},
			assistantRun: { create: mock(async () => ({ id: "run-1" })) },
			$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
				callback(store),
		};
		const input = {
			conversationId: "conversation-1",
			clientRequestId: decision.confirmationRequestId,
			toolId: "documents_generate_pdf",
			toolVersion: 1,
			input: proposal().payload,
		};
		const result = await createAssistantActionProposal(
			store as never,
			actor,
			input,
			now,
			mock(async () => ({ ok: true, targetRevision: "revision-1" })) as never,
		);
		expect(result).toMatchObject({
			status: "pending",
			deduplicated: false,
			review: {
				title: "Generate PDF",
				targetRevision: "revision-1",
				parameters: input.input,
			},
		});
		expect(proposalCreate.mock.calls[0]?.[0]).toMatchObject({
			data: {
				payload: input.input,
				targetRevision: "revision-1",
				diff: { summary: "Confirm generate pdf." },
				status: "pending",
			},
		});
		expect(JSON.stringify(proposalCreate.mock.calls[0]?.[0])).not.toContain(
			result.approvalToken,
		);
	});

	test("rejects an idempotency key reused with a different request fingerprint", async () => {
		const store = {
			assistantConversation: {
				findFirst: async () => ({ id: "conversation-1" }),
			},
			assistantActionProposal: {
				findFirst: async () =>
					proposal({ run: { requestFingerprint: "different" } }),
			},
		};
		await expect(
			createAssistantActionProposal(
				store as never,
				actor,
				{
					conversationId: "conversation-1",
					clientRequestId: decision.confirmationRequestId,
					toolId: "documents_generate_pdf",
					toolVersion: 1,
					input: proposal().payload,
				},
				now,
				allowedPreflight as never,
			),
		).rejects.toThrow("conflicts");
	});

	test("hides cross-actor proposal existence", async () => {
		const findFirst = mock(async () => null);
		await expect(
			getAssistantActionProposal(
				{ assistantActionProposal: { findFirst } } as never,
				actor,
				"another-user-proposal",
				now,
				allowedPreflight as never,
			),
		).rejects.toThrow("not found");
		expect(findFirst.mock.calls[0]?.[0]).toMatchObject({
			where: { actorUserId: 42 },
		});
	});

	test("removes protected terminal data after access is revoked", async () => {
		const { store } = executionStore(
			proposal({
				status: "succeeded",
				result: { privateArtifactId: "artifact-1", assistantOutcome: { kind: "uncertain", reference: "ERR-ABCDEFGHIJ" } },
			}),
		);
		const result = await getAssistantActionProposal(
			store as never,
			actor,
			"proposal-1",
			now,
			mock(async () => {
				throw new AssistantProposalPrecommitError("denied", "revoked");
			}) as never,
		);
		expect(result).toMatchObject({
			status: "succeeded",
			result: null,
			review: null,
			errorCode: "AUTHORIZATION_CHANGED",
		});
		expect(JSON.stringify(result)).not.toContain("artifact-1");
		expect(result.outcome).toBeNull();
		expect(JSON.stringify(result)).not.toContain("ERR-ABCDEFGHIJ");
	});

	test("rejects a forged token before preflight or execution", async () => {
		const { store } = executionStore();
		const preflight = mock(async () => ({ ok: true as const }));
		const execute = mock(async () => ({ status: "success" }));
		await expect(
			decideAssistantActionProposal(
				store as never,
				actor,
				{
					...decision,
					approvalToken: "forged-token-with-enough-characters-123",
				},
				{ preflight: preflight as never, execute: execute as never },
				now,
			),
		).rejects.toThrow("not found");
		expect(preflight).not.toHaveBeenCalled();
		expect(execute).not.toHaveBeenCalled();
	});

	test("reauthorizes, claims, executes, and advances the parent run atomically", async () => {
		const { store, proposalUpdateMany, runUpdateMany } = executionStore();
		const execute = mock(async () => ({
			status: "pending",
			data: { jobId: "job-1" },
		}));
		const result = await decideAssistantActionProposal(
			store as never,
			actor,
			decision,
			{ capture: async (_error, context) => ({ reference: context.reference!, recorded: true }),
				preflight: allowedPreflight as never, execute: execute as never },
			now,
		);
		expect(result).toMatchObject({
			status: "succeeded",
			result: { status: "pending" },
		});
		expect(execute).toHaveBeenCalledTimes(1);
		expect(proposalUpdateMany).toHaveBeenCalledTimes(2);
		expect(runUpdateMany.mock.calls[0]?.[0]).toMatchObject({
			data: { status: "executing" },
		});
		expect(runUpdateMany.mock.calls[1]?.[0]).toMatchObject({
			data: { status: "succeeded" },
		});
	});

	test("returns an authorized persisted result on replay without repeating the effect", async () => {
		const { store } = executionStore(
			proposal({ status: "succeeded", result: { status: "pending" } }),
		);
		const execute = mock(async () => ({ status: "success" }));
		const result = await decideAssistantActionProposal(
			store as never,
			actor,
			decision,
			{ capture: async (_error, context) => ({ reference: context.reference!, recorded: true }),
				preflight: allowedPreflight as never, execute: execute as never },
			now,
		);
		expect(result).toMatchObject({
			status: "succeeded",
			result: { status: "pending" },
		});
		expect(execute).not.toHaveBeenCalled();
	});

	test("expires and rejects proposals with terminal parent-run state", async () => {
		const expiredStore = executionStore(
			proposal({ expiresAt: new Date("2026-09-13T11:59:59.000Z") }),
		);
		const execute = mock(async () => ({ status: "success" }));
		const expired = await decideAssistantActionProposal(
			expiredStore.store as never,
			actor,
			decision,
			{ capture: async (_error, context) => ({ reference: context.reference!, recorded: true }),
				preflight: allowedPreflight as never, execute: execute as never },
			now,
		);
		expect(expired).toMatchObject({
			status: "expired",
			errorCode: "APPROVAL_EXPIRED",
		});
		expect(expiredStore.runUpdateMany.mock.calls[0]?.[0]).toMatchObject({
			data: { status: "failed" },
		});

		const rejectedStore = executionStore();
		const rejected = await decideAssistantActionProposal(
			rejectedStore.store as never,
			actor,
			{ ...decision, decision: "reject" },
			{ capture: async (_error, context) => ({ reference: context.reference!, recorded: true }),
				preflight: allowedPreflight as never, execute: execute as never },
			now,
		);
		expect(rejected).toMatchObject({
			status: "rejected",
			errorCode: "APPROVAL_REJECTED",
		});
		expect(execute).not.toHaveBeenCalled();
	});

	test("durably records revision conflicts and revoked authorization", async () => {
		const conflictStore = executionStore();
		const execute = mock(async () => ({ status: "success" }));
		const conflict = await decideAssistantActionProposal(
			conflictStore.store as never,
			actor,
			decision,
			{
				preflight: mock(async () => ({
					ok: true,
					targetRevision: "revision-2",
				})) as never,
				execute: execute as never,
			},
			now,
		);
		expect(conflict).toMatchObject({
			status: "conflict",
			errorCode: "TARGET_CHANGED",
		});

		const deniedStore = executionStore();
		const denied = await decideAssistantActionProposal(
			deniedStore.store as never,
			actor,
			decision,
			{
				preflight: mock(async () => {
					throw new AssistantProposalPrecommitError("denied", "private authorization detail");
				}) as never,
				execute: execute as never,
			},
			now,
		);
		expect(denied).toMatchObject({
			status: "denied",
			result: null,
			review: null,
			errorCode: "AUTHORIZATION_CHANGED",
		});
		expect(JSON.stringify(denied)).not.toContain(
			"private authorization detail",
		);
		expect(execute).not.toHaveBeenCalled();
	});

	test("classifies known failure envelopes without claiming success", async () => {
		const { store, runUpdateMany } = executionStore();
		const result = await decideAssistantActionProposal(
			store as never,
			actor,
			decision,
			{
				capture: async (_error, context) => ({ reference: context.reference!, recorded: true }),
				preflight: allowedPreflight as never,
				execute: mock(async () => ({
					status: "conflict",
					warnings: [],
				})) as never,
			},
			now,
		);
		expect(result).toMatchObject({
			status: "conflict",
			errorCode: "EXECUTION_CONFLICT",
		});
		expect(runUpdateMany.mock.calls[1]?.[0]).toMatchObject({
			data: { status: "failed" },
		});
	});

	test("records thrown and stale executions as unknown without retrying", async () => {
		const thrownStore = executionStore();
		const execute = mock(async () => {
			throw new Error("provider accepted before timeout");
		});
		const result = await decideAssistantActionProposal(
			thrownStore.store as never,
			actor,
			decision,
			{ capture: async (_error, context) => ({ reference: context.reference!, recorded: true }),
				preflight: allowedPreflight as never, execute: execute as never },
			now,
		);
		expect(result).toMatchObject({
			status: "unknown",
			errorCode: "EXECUTION_OUTCOME_UNKNOWN",
		});
		expect(JSON.stringify(result)).not.toContain("provider accepted");

		const staleStore = executionStore(
			proposal({
				status: "executing",
				executionStartedAt: new Date("2026-09-13T11:54:59.000Z"),
			}),
		);
		const stale = await decideAssistantActionProposal(
			staleStore.store as never,
			actor,
			decision,
			{ capture: async (_error, context) => ({ reference: context.reference!, recorded: true }),
				preflight: allowedPreflight as never, execute: execute as never },
			now,
		);
		expect(stale).toMatchObject({
			status: "unknown",
			errorCode: "EXECUTION_OUTCOME_UNKNOWN",
		});
		expect(execute).toHaveBeenCalledTimes(1);
	});

	test("classifies a precommit rejection without reporting an unknown outcome", async () => {
		const { store, runUpdateMany } = executionStore();
		const result = await decideAssistantActionProposal(
			store as never,
			actor,
			decision,
			{
				capture: async (_error, context) => ({ reference: context.reference!, recorded: true }),
				preflight: allowedPreflight as never,
				execute: mock(async () => {
					throw new AssistantProposalPrecommitError(
						"conflict",
						"target changed",
					);
				}) as never,
			},
			now,
		);
		expect(result).toMatchObject({
			status: "conflict",
			errorCode: "EXECUTION_CONFLICT",
		});
		expect(JSON.stringify(result)).not.toContain("target changed");
		expect(runUpdateMany.mock.calls[1]?.[0]).toMatchObject({
			data: { status: "failed", errorCode: "EXECUTION_CONFLICT" },
		});
	});
});
