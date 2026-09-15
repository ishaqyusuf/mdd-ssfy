import { expect, test } from "bun:test";
import { getAssistantCaptureHealth, recordAssistantCaptureHealth } from "./capture-health";
import { captureAssistantDiagnostic } from "./diagnostics";

test("capture health decodes both Redis response shapes and reports unavailable instead of false zeros", async () => {
	const values = { attempts: "2", storageConfirmed: "1", storageUnconfirmed: "1", monitorSubmitted: "1", monitorFailed: "1" };
	for (const raw of [values, Object.entries(values).flat(), JSON.stringify(Object.entries(values).flat())]) {
		const result = await getAssistantCaptureHealth(async () => raw);
		expect(result.available).toBe(true);
		expect(result.counts).toEqual({ attempts: 2, storageConfirmed: 1, storageUnconfirmed: 1, monitorSubmitted: 1, monitorUnavailable: 0, monitorFailed: 1 });
	}
	for (const raw of [null, ["attempts"], { attempts: "private" }, { attempts: "1" }, { attempts: -1 }, { attempts: null }]) {
		expect((await getAssistantCaptureHealth(async () => raw)).counts).toBeNull();
	}
	expect((await getAssistantCaptureHealth(async () => [])).counts?.attempts).toBe(0);
	expect((await getAssistantCaptureHealth(async () => { throw new Error("offline"); })).available).toBe(false);
	expect((await getAssistantCaptureHealth(() => new Promise(() => {}))).available).toBe(false);
});

test("health commands carry counters only and expire the daily bucket", async () => {
	let command: (string | number)[] = [];
	await recordAssistantCaptureHealth({ stored: false, monitoring: "failed" }, async value => { command = value; return 1; }, new Date("2026-09-15T10:00:00Z"));
	expect(command[0]).toBe("EVAL");
	expect(command[1]).toContain("2678400");
	expect(command[3]).toMatch(/^gnd:assistant:capture-health:(development|test|production):2026-09-15$/);
	expect(command.slice(4)).toEqual(["storageUnconfirmed", "monitorFailed"]);
});

test("database-down capture reports unconfirmed storage and health failure cannot replace capture result", async () => {
	const events: unknown[] = [];
	const previous = console.error;
	console.error = () => {};
	try {
		const result = await captureAssistantDiagnostic(new Error("private SQL"), { stage: "database", operation: "qa.capture" }, {
			store: async () => { throw new Error("database down"); }, monitor: () => undefined, fallback: () => {},
			health: async event => { events.push(event); throw new Error("metrics down"); },
		});
		expect(result.recorded).toBe(false);
		expect(events).toEqual([{ stored: false, monitoring: "unavailable" }]);
		const saved = await captureAssistantDiagnostic(new Error("private SQL"), { stage: "database", operation: "qa.capture" }, {
			store: async () => {}, monitor: () => "a".repeat(32), health: async () => { throw new Error("metrics down"); },
		});
		expect(saved.recorded).toBe(true);
	} finally { console.error = previous; }
});
