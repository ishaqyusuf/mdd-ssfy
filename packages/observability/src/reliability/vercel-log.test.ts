import { expect, it } from "bun:test";
import { prepareVercelLog } from "./vercel-log";
const source = {
	account: "team",
	project: "project",
	operation: "runtime.error",
	service: {
		id: "web",
		owner: "platform",
		operations: ["runtime.error"],
		sources: [
			{ provider: "vercel" as const, account: "team", project: "project" },
		],
	},
};
const now = new Date("2026-09-09T12:00:00Z");

it("accepts dotted trace identity but rejects conflicting aliases", () => {
	expect(
		prepareVercelLog(
			{ ...log, level: "error", "trace.id": "trace_1" },
			source,
			now,
		)?.occurrence.evidence?.traceId,
	).toBe("trace_1");
	expect(() =>
		prepareVercelLog(
			{ ...log, level: "error", traceId: "trace_1", "trace.id": "trace_2" },
			source,
			now,
		),
	).toThrow("Conflicting Vercel trace identity");
});
const log = {
	id: "log1",
	deploymentId: "dpl_1",
	projectId: "project",
	environment: "production",
	source: "lambda",
	level: "info",
	timestamp: now.getTime(),
	message: "private customer data",
};

it("retains bounded correlation identifiers and excludes arbitrary evidence", () => {
	const result = prepareVercelLog(
		{
			...log,
			level: "error",
			requestId: "req_1",
			traceId: "abcdef123456",
			message: "private",
			path: "/customer/secret",
			headers: { authorization: "secret" },
		},
		source,
		now,
	);
	expect(result?.occurrence.evidence).toEqual({
		deploymentId: "dpl_1",
		requestId: "req_1",
		traceId: "abcdef123456",
	});
	expect(JSON.stringify(result)).not.toContain("/customer/secret");
});
it("detects error levels, 5xx, and lambda crashes without carrying raw content", () => {
	for (const details of [
		{ level: "error" },
		{ level: "fatal" },
		{ statusCode: 503 },
		{ statusCode: -1 },
		{ proxy: { statusCode: 502, path: "/?secret=value" } },
	]) {
		const result = prepareVercelLog({ ...log, ...details }, source, now);
		expect(result?.incident.severity).toBe("P2");
		expect(JSON.stringify(result)).not.toContain("private customer");
		expect(JSON.stringify(result)).not.toContain("secret=value");
	}
	expect(prepareVercelLog(log, source, now)).toBeNull();
	expect(
		prepareVercelLog({ ...log, proxy: { statusCode: -1 } }, source, now),
	).toBeNull();
});
it("rejects unknown scope and missing environment while ignoring explicit preview", () => {
	expect(() =>
		prepareVercelLog({ ...log, projectId: "other" }, source, now),
	).toThrow();
	expect(() =>
		prepareVercelLog({ ...log, environment: undefined }, source, now),
	).toThrow();
	expect(
		prepareVercelLog(
			{ ...log, environment: "preview", level: "error" },
			source,
			now,
		),
	).toBeNull();
	expect(() =>
		prepareVercelLog({ ...log, timestamp: Number.NaN }, source, now),
	).toThrow();
});
