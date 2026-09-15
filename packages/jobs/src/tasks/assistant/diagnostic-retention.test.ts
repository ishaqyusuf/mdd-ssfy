import { expect, test } from "bun:test";
import { runAssistantDiagnosticRetention } from "./diagnostic-retention";

test("retention stops after draining expired rows and uses one stable cutoff", async () => {
	const now = new Date("2026-09-15T00:00:00Z");
	const calls: Date[] = [];
	const result = await runAssistantDiagnosticRetention(async (cutoff) => {
		calls.push(cutoff);
		return calls.length === 1 ? 200 : 3;
	}, now);
	expect(result).toEqual({ deleted: 203, moreMayRemain: false });
	expect(calls).toEqual([now, now]);
});

test("retention bounds a large backlog and surfaces failures to job retry", async () => {
	let calls = 0;
	expect(
		await runAssistantDiagnosticRetention(async () => {
			calls++;
			return 200;
		}),
	).toEqual({ deleted: 2000, moreMayRemain: true });
	expect(calls).toBe(10);
	await expect(
		runAssistantDiagnosticRetention(async () => {
			throw new Error("storage unavailable");
		}),
	).rejects.toThrow("storage unavailable");
});
