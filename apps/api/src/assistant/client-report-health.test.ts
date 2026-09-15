import { expect, test } from "bun:test";
import { createAssistantClientReportHealth } from "./client-report-health";

test("report limiter loss emits a bounded independent signal", () => {
	let time = 0;
	let emitted = 0;
	const report = createAssistantClientReportHealth(() => { emitted++; }, () => time);
	for (let i = 0; i < 100; i++) report();
	expect(emitted).toBe(1);
	time = 59_999;
	report();
	expect(emitted).toBe(1);
	time = 60_000;
	report();
	expect(emitted).toBe(2);
});

test("a failing output sink remains bounded and cannot replace rejection", () => {
	let emitted = 0;
	const report = createAssistantClientReportHealth(() => { emitted++; throw new Error("sink failed"); }, () => 0);
	expect(report).not.toThrow();
	expect(report).not.toThrow();
	expect(emitted).toBe(1);
});
