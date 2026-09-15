import { expect, test } from "bun:test";
import { assistantDiagnosticFilterSchema } from "./diagnostic-contract";
import { encodeAssistantDiagnosticCursor } from "@gnd/db/assistant-diagnostic-cursor";

test("diagnostic filters validate dates, categories and bounded pagination", () => {
	const result = assistantDiagnosticFilterSchema.parse({
		stage: "provider",
		outcome: "temporary",
		provider: "deepseek",
		environment: "development",
		model: "deepseek-flash",
		from: "2026-09-15T00:00:00Z",
		to: "2026-09-15T23:59:00Z",
	});
	expect(result.from).toEqual(new Date("2026-09-15T00:00:00Z"));
	expect(result.take).toBe(20);
	for (const invalid of [
		{ from: "2026-09-16", to: "2026-09-15" },
		{ stage: "arbitrary" },
		{ outcome: "private-sql" },
		{ take: 500 },
		{ reference: "../other-user" },
	])
		expect(assistantDiagnosticFilterSchema.safeParse(invalid).success).toBe(
			false,
		);
});

test("page cursors carry a valid immutable ordering boundary", () => {
	const cursor = encodeAssistantDiagnosticCursor({ createdAt: new Date("2026-09-15T00:00:00.000Z"), reference: "ERR-ABCDEFGHIJ" });
	expect(assistantDiagnosticFilterSchema.parse({ cursor }).cursor).toBe(cursor);
	for (const invalid of ["ERR-ABCDEFGHIJ", "2026-02-30T00:00:00.000Z|ERR-ABCDEFGHIJ", "2026-09-15T00:00:00.000Z|../private", `${cursor}|extra`]) {
		expect(assistantDiagnosticFilterSchema.safeParse({ cursor: invalid }).success).toBe(false);
	}
});
