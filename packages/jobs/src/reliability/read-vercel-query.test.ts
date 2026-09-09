import { expect, it } from "bun:test";
import { readVercelQuery } from "./read-vercel-query";
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
	limit: 100,
};
const runtime = {
	nodePath: "/runtime/node",
	cliPath: "/runtime/vercel.js",
	configDirectory: "/runtime/isolated-config",
	token: "fixture-read-token",
};
it("passes credentials only through an explicit environment and returns normalized evidence", async () => {
	const result = await readVercelQuery(
		source,
		window,
		now,
		runtime,
		async (input) => {
			expect(input.env).toEqual({
				VERCEL_TOKEN: "fixture-read-token",
				CI: "1",
				NO_COLOR: "1",
			});
			expect(input.args).not.toContain("fixture-read-token");
			expect(input.args).toContain("/runtime/isolated-config");
			expect(input.timeoutMs).toBe(5000);
			return Buffer.from(
				JSON.stringify({
					id: "req_1",
					deploymentId: "dpl_1",
					projectId: "web",
					environment: "production",
					timestamp: now.getTime(),
					source: "serverless",
					level: "error",
					logs: [],
				}),
			);
		},
	);
	expect(result.intakes).toHaveLength(1);
	expect(JSON.stringify(result)).not.toContain("fixture-read-token");
});
it("rejects invalid credentials and windows before invoking a process", async () => {
	let called = false;
	await expect(
		readVercelQuery(
			source,
			window,
			now,
			{ ...runtime, token: "" },
			async () => {
				called = true;
				return Buffer.from("");
			},
		),
	).rejects.toThrow();
	await expect(
		readVercelQuery(
			source,
			{ ...window, until: new Date(now.getTime() + 1) },
			now,
			runtime,
			async () => {
				called = true;
				return Buffer.from("");
			},
		),
	).rejects.toThrow();
	expect(called).toBe(false);
});
