import { expect, test } from "bun:test";
import {
	assistantTechnicalDetails,
	buildAssistantDiagnostic,
} from "./diagnostic-details";
import { assistantOutcomeSchema, presentAssistantOutcome } from "./outcomes";

test("retains recognized PDF failure types without retaining document error text", () => {
	for (const name of ["InvalidPDFException", "PasswordException"]) {
		const details = assistantTechnicalDetails(Object.assign(new Error("private document payload"), { name }));
		expect(details.causes).toEqual([{ name }]);
		expect(JSON.stringify(details)).not.toContain("private document payload");
	}
});

test("attachment corrections are informational and private decoder text is redacted", () => {
	for (const kind of ["attachment-too-large", "attachment-unreadable", "attachment-unsupported", "image-unsupported"] as const) {
		const record = buildAssistantDiagnostic(new Error("private decoder payload"), { stage: "attachment", operation: "assistant.extractPdf", outcome: kind });
		expect(record.severity).toBe("info");
		expect(record.publicMessage).toBe(presentAssistantOutcome({ kind }).message);
		expect(JSON.stringify(record)).not.toContain("private decoder payload");
	}
});

test("a hidden retry attempt is described accurately and metadata stays inside details", () => {
	const diagnostic = buildAssistantDiagnostic(new Error("private"), { stage: "tool", operation: "sales_get_order_status", attempt: 1, presentation: "not-shown", outcome: "temporary" });
	expect(diagnostic.publicMessage).toBe("No error message was shown for this attempt.");
	expect(diagnostic.details).toMatchObject({ attempt: 1, presentation: "not-shown" });
	expect(diagnostic).not.toHaveProperty("attempt");
	expect(diagnostic).not.toHaveProperty("presentation");
});

test("nested diagnostic causes keep actionable codes and frames without payloads", () => {
	const inner = Object.assign(
		new Error(
			"mysql://secret:password@host customer@example.com SELECT * FROM Users",
		),
		{
			name: "PrismaClientKnownRequestError",
			code: "P2024",
		},
	);
	const error = new Error("sk-secret-key provider response body", {
		cause: inner,
	});
	error.stack =
		"Error: sk-secret-key\n at run (/Users/name/project/apps/api/src/assistant/runtime.ts:20:4)\n at customer@example.com";
	const details = assistantTechnicalDetails(error);
	expect(details.causes[1]).toEqual({
		name: "PrismaClientKnownRequestError",
		code: "P2024",
	});
	expect(details.frames).toEqual(["apps/api/src/assistant/runtime.ts:20:4"]);
	for (const value of [
		"secret",
		"password",
		"SELECT",
		"customer@example.com",
		"/Users/name",
	]) {
		expect(JSON.stringify(details)).not.toContain(value);
	}
});

test("handles cycles and throwing getters without losing safe failure context", () => {
	const error = { name: "attacker-supplied-secret", cause: null as unknown };
	error.cause = error;
	Object.defineProperty(error, "stack", {
		get() {
			throw new Error("secret");
		},
	});
	expect(assistantTechnicalDetails(error)).toEqual({
		causes: [{ name: "Error" }],
		frames: [],
	});
});

test("one public reference maps to the classified private incident", () => {
	const report = buildAssistantDiagnostic(new Error("provider-secret"), {
		stage: "provider",
		operation: "assistant.chat",
		requestId: "request-1",
	});
	expect(report.reference).toMatch(/^ERR-[A-Z0-9]{10}$/);
	expect(report.publicMessage).toBe(
		"I couldn't check that right now. Please try again.",
	);
	expect(JSON.stringify(report)).not.toContain("provider-secret");
	expect(
		assistantOutcomeSchema.safeParse({ kind: "temporary", details: "private" })
			.success,
	).toBe(false);
});

test("empty, cancelled and uncertain outcomes are distinct and cannot imply a saved action", () => {
	expect(presentAssistantOutcome({ kind: "empty" }).action).toBeNull();
	expect(presentAssistantOutcome({ kind: "cancelled" }).message).toBe(
		"Stopped.",
	);
	expect(presentAssistantOutcome({ kind: "uncertain" }).action).toBe(
		"Check status",
	);
});
