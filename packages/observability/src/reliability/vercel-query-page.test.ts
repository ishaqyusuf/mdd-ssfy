import { expect, it } from "bun:test";
import { prepareVercelQueryPage } from "./vercel-query-page";
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
const window = {
	since: new Date("2026-09-09T11:00:00Z"),
	until: now,
	limit: 2,
};
const row = {
	id: "req_1",
	deploymentId: "dpl_1",
	projectId: "web",
	environment: "production",
	source: "serverless",
	timestamp: now.getTime(),
	level: "error",
	responseStatusCode: 500,
	logs: [],
};
it("keeps saturation visible even when only one returned row is actionable", () => {
	const output = Buffer.from(
		[row, { ...row, id: "req_2", level: "info", responseStatusCode: 200 }]
			.map((entry) => JSON.stringify(entry))
			.join("\n"),
	);
	const result = prepareVercelQueryPage(output, source, window, now);
	expect(result.saturated).toBe(true);
	expect(result.intakes).toHaveLength(1);
	expect(result.recordsRead).toBe(2);
});
it("rejects out-of-window records and future query windows", () => {
	expect(() =>
		prepareVercelQueryPage(
			Buffer.from(
				JSON.stringify({ ...row, timestamp: window.since.getTime() - 1 }),
			),
			source,
			window,
			now,
		),
	).toThrow("Vercel query returned out-of-window record");
	expect(() =>
		prepareVercelQueryPage(
			Buffer.from(""),
			source,
			{ ...window, until: new Date(now.getTime() + 1) },
			now,
		),
	).toThrow("Invalid Vercel query window");
});
