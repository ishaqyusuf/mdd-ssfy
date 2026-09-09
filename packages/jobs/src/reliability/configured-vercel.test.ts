import { expect, it } from "bun:test";
import { runConfiguredVercelReconciliation } from "./configured-vercel";
const entry = {
	account: "team",
	project: "web",
	operation: "runtime.error",
	serviceId: "web",
	owner: "platform",
	tokenEnv: "RELIABILITY_VERCEL_READ_TOKEN_WEB",
};
const env = {
	RELIABILITY_VERCEL_POLL_ENABLED: "true",
	RELIABILITY_VERCEL_READ_SOURCES: JSON.stringify([entry]),
	RELIABILITY_VERCEL_READ_TOKEN_WEB: "fixture",
	RELIABILITY_VERCEL_NODE_PATH: "/runtime/node",
	RELIABILITY_VERCEL_CLI_PATH: "/runtime/vercel.js",
};
it("keeps unconfigured or nonproduction polling inert", async () => {
	let calls = 0;
	for (const config of [
		{ env: {}, environment: "PRODUCTION" },
		{ env, environment: "DEVELOPMENT" },
	]) {
		expect(
			(
				await runConfiguredVercelReconciliation({
					...config,
					now: () => new Date(),
					execute: async () => {
						calls++;
						return { status: "complete", queries: 0, occurrences: 0 };
					},
				})
			).status,
		).toBe("disabled");
	}
	expect(calls).toBe(0);
});
it("validates configuration before execution and sanitizes source failures", async () => {
	await expect(
		runConfiguredVercelReconciliation({
			env: { ...env, RELIABILITY_VERCEL_NODE_PATH: "relative" },
			environment: "PRODUCTION",
			now: () => new Date(),
			execute: async () => {
				throw new Error("Must not execute");
			},
		}),
	).rejects.toThrow("Invalid Vercel polling configuration");
	const result = await runConfiguredVercelReconciliation({
		env,
		environment: "PRODUCTION",
		now: () => new Date(),
		execute: async () => {
			throw new Error("private fixture");
		},
	});
	expect(result.status).toBe("attention_required");
	expect(JSON.stringify(result)).not.toContain("private fixture");
});
