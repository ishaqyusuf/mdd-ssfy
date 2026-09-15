import { expect, test } from "bun:test";
import { captureAssistantDiagnostic } from "./diagnostics";

test("database failure falls back with the same safe reference", async () => {
	const fallback: unknown[] = [];
	const result = await captureAssistantDiagnostic(
		new Error("SECRET SQL CUSTOMER"),
		{
			stage: "database",
			operation: "assistant.read",
			reference: "ERR-1234567890",
		},
		{
			health: async () => {},
			store: async () => {
				throw new Error("DB down");
			},
			fallback: (report) => {
				fallback.push(report);
			},
		},
	);
	expect(result).toEqual({ reference: "ERR-1234567890", recorded: false });
	expect(JSON.stringify(fallback)).toContain("ERR-1234567890");
	expect(JSON.stringify(fallback)).not.toContain("SECRET");
});

test("capture timeout is bounded and a broken fallback never changes the outcome", async () => {
	const result = await captureAssistantDiagnostic(
		new Error("secret"),
		{ stage: "provider", operation: "assistant.chat" },
		{
			health: async () => {},
			store: () => new Promise(() => {}),
			timeoutMs: 5,
			fallback: () => {
				throw new Error("sink down");
			},
		},
	);
	expect(result.recorded).toBe(false);
});

test("correlates the sanitized monitoring event with storage and database-down fallback", async () => {
	const sent: unknown[] = [];
	const stored: unknown[] = [];
	const fallback: unknown[] = [];
	await captureAssistantDiagnostic(new Error("private SQL token=secret"), { stage: "database", operation: "assistant.read" }, {
		health: async () => {},
		monitor: (report) => { sent.push(JSON.parse(JSON.stringify(report))); return "a".repeat(32); },
		store: async (report) => { stored.push(report); throw new Error("offline"); },
		fallback: (report) => { fallback.push(report); },
	});
	expect(sent).toHaveLength(1);
	expect(JSON.stringify(sent)).not.toContain("token=secret");
	expect(stored[0]).toMatchObject({ details: { monitoring: { status: "submitted", eventId: "a".repeat(32) } } });
	expect(fallback[0]).toEqual(stored[0]);
});

test("monitoring failure is recorded without preventing the database diagnostic", async () => {
	let stored: unknown;
	const result = await captureAssistantDiagnostic(new Error("private"), { stage: "provider", operation: "assistant.chat" }, {
		health: async () => {},
		monitor: () => { throw new Error("sink offline"); },
		store: async (report) => { stored = report; },
	});
	expect(result.recorded).toBe(true);
	expect(stored).toMatchObject({ details: { monitoring: { status: "failed" } } });
	expect(JSON.stringify(stored)).not.toContain("sink offline");
});
