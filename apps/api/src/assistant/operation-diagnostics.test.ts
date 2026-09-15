import { expect, test } from "bun:test";
import { runAssistantOperation } from "./operation-diagnostics";
import { AssistantProposalPrecommitError } from "./registry";

test("captures original action failure but returns a safe non-retryable uncertain error", async () => {
	const original = new Error("private SQL password=secret");
	const captured: unknown[] = [];
	try {
		await runAssistantOperation(
			{ stage: "action", operation: "assistant.decideApproval" },
			async () => {
				throw original;
			},
			{
				uncertainOnFailure: true,
				capture: async (error, context) => {
					captured.push({ error, context });
					return { reference: "ERR-ABCDEFGHIJ", recorded: true };
				},
			},
		);
		throw new Error("expected failure");
	} catch (error) {
		expect(error).toMatchObject({
			referenceId: "ERR-ABCDEFGHIJ",
			retryable: false,
			publicMessage:
				"I couldn't confirm whether that was saved. Check its status before trying again.",
		});
		expect(String(error)).not.toContain("password");
		expect(error).not.toHaveProperty("cause", original);
	}
	expect(captured).toHaveLength(1);
	expect(captured[0]).toMatchObject({
		error: original,
		context: { outcome: "uncertain" },
	});
});

test("successful operations are unchanged and do not create incidents", async () => {
	let captures = 0;
	expect(
		await runAssistantOperation(
			{ stage: "action", operation: "read" },
			async () => ({ status: "ready" }),
			{
				capture: async () => {
					captures++;
					return { reference: "ERR-ABCDEFGHIJ", recorded: true };
				},
			},
		),
	).toEqual({ status: "ready" });
	expect(captures).toBe(0);
});

test("expected approval denials and conflicts retain their public classification", async () => {
	for (const kind of ["denied", "conflict"] as const) {
		await expect(runAssistantOperation({ stage: "action", operation: "approval" }, async () => { throw new AssistantProposalPrecommitError(kind, "private preflight detail"); }, {
			uncertainOnFailure: true,
			capture: async () => ({ reference: "ERR-ABCDEFGHIJ", recorded: true }),
		})).rejects.toMatchObject({ assistantOutcome: { kind, reference: "ERR-ABCDEFGHIJ" } });
	}
});

test("nested boundaries retain one occurrence and user cancellation does not create an incident", async () => {
	let captures = 0;
	const capture = async () => {
		captures++;
		return { reference: "ERR-ABCDEFGHIJ", recorded: true };
	};
	await expect(
		runAssistantOperation(
			{ stage: "stream", operation: "outer" },
			() =>
				runAssistantOperation(
					{ stage: "history", operation: "inner" },
					async () => {
						throw new Error("private");
					},
					{ capture },
				),
			{ capture },
		),
	).rejects.toMatchObject({
		referenceId: "ERR-ABCDEFGHIJ",
		operation: "inner",
	});
	expect(captures).toBe(1);
	const controller = new AbortController();
	controller.abort();
	const cancelled = new Error("Cancelled request");
	await expect(
		runAssistantOperation(
			{ stage: "attachment", operation: "download" },
			async () => {
				throw cancelled;
			},
			{ capture, signal: controller.signal },
		),
	).rejects.toBe(cancelled);
	expect(captures).toBe(1);
});
