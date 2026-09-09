import { expect, it } from "bun:test";
import { prepareVercelQueryLog } from "./vercel-query-log";
const source = {
	account: "team",
	project: "web",
	operation: "runtime.error",
	service: {
		id: "web",
		owner: "platform",
		operations: ["runtime.error"],
		sources: [{ provider: "vercel" as const, account: "team", project: "web" }],
	},
};
const now = new Date("2026-09-09T12:00:00Z");
const row = {
	id: "req_1",
	deploymentId: "dpl_1",
	projectId: "web",
	environment: "production",
	source: "serverless",
	timestamp: now.getTime(),
	level: "info",
	responseStatusCode: 200,
	logs: [{ level: "error", message: "private error" }],
};
it("detects nested errors and request status without copying CLI display content", () => {
	const result = prepareVercelQueryLog(row, source, now);
	expect(result?.incident.severity).toBe("P2");
	expect(result?.occurrence.evidence?.requestId).toBe("req_1");
	expect(JSON.stringify(result)).not.toContain("private error");
	expect(
		prepareVercelQueryLog(
			{ ...row, logs: [], responseStatusCode: 503 },
			source,
			now,
		),
	).not.toBeNull();
	expect(prepareVercelQueryLog({ ...row, logs: [] }, source, now)).toBeNull();
});
it("rejects ambiguous request identity and scope", () => {
	expect(() =>
		prepareVercelQueryLog({ ...row, id: "" }, source, now),
	).toThrow();
	expect(() =>
		prepareVercelQueryLog({ ...row, projectId: "other" }, source, now),
	).toThrow();
});
