import { expect, it } from "bun:test";
import { runGithubRecoveryBatch } from "./github-recovery-batch";
const env = {
	RELIABILITY_GITHUB_RECOVERY_ENABLED: "true",
	RELIABILITY_GITHUB_REGISTRATIONS: JSON.stringify([
		{
			serviceId: "web",
			repository: "gnd/fixture",
			repositoryId: 1,
			installationId: 2,
			actorId: 3,
			clientId: "Iv1.fixture",
			privateKeyEnv: "RELIABILITY_GITHUB_APP_KEY_WEB",
		},
	]),
};
it("stops the batch immediately after provider throttling", async () => {
	let calls = 0;
	const result = await runGithubRecoveryBatch({
		env,
		environment: "PRODUCTION",
		now: () => new Date(),
		select: async () =>
			["first", "second"].map((id) => ({ id, incident: { serviceId: "web" } })),
		execute: async () => {
			calls++;
			return { status: "rate_limited" };
		},
	});
	expect(calls).toBe(1);
	expect(result).toEqual({
		status: "rate_limited",
		results: [{ deliveryId: "first", status: "rate_limited" }],
	});
});
it("does no selection when disabled or outside production", async () => {
	let reads = 0;
	for (const config of [
		{ env: {}, environment: "PRODUCTION" },
		{ env, environment: "DEVELOPMENT" },
	]) {
		expect(
			(
				await runGithubRecoveryBatch({
					...config,
					now: () => new Date(),
					select: async () => {
						reads++;
						return [];
					},
					execute: async () => ({ status: "recovered" }),
				})
			).status,
		).toBe("disabled");
	}
	expect(reads).toBe(0);
});
it("bounds serial recovery and sanitizes failures before stopping at the budget", async () => {
	let time = 0;
	let calls = 0;
	const result = await runGithubRecoveryBatch({
		env,
		environment: "PRODUCTION",
		now: () => new Date(time),
		select: async (ids, _now, limit) => {
			expect(ids).toEqual(["web"]);
			expect(limit).toBe(5);
			return ["one", "two", "three"].map((id) => ({
				id,
				incident: { serviceId: "web" },
			}));
		},
		execute: async () => {
			calls++;
			time += 60_000;
			if (calls === 1) throw new Error("private credentials");
			return { status: "recovered" };
		},
	});
	expect(result.status).toBe("budget_exhausted");
	expect(calls).toBe(2);
	expect(result.results).toEqual([
		{ deliveryId: "one", status: "failed" },
		{ deliveryId: "two", status: "recovered" },
	]);
});
