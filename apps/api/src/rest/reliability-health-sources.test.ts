import { expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readConfiguredReliabilityHealth } from "./reliability-health-sources";

const entry = {
	provider: "trigger",
	account: "org",
	project: "jobs",
	serviceId: "jobs",
	maxAgeMs: 900_000,
};
it("keeps historical replay health separate from healthy incremental discovery", async () => {
	for (const provider of ["sentry", "trigger"]) {
		const historicalId = createHash("sha256")
			.update(
				JSON.stringify([
					provider === "sentry" ? "sentry-events" : "trigger-runs",
					"jobs",
					"org",
					"jobs",
					"production",
					"historical",
				]),
			)
			.digest("hex");
		const results = await readConfiguredReliabilityHealth(
			JSON.stringify([
				{ ...entry, provider },
				{ ...entry, provider, mode: "historical" },
			]),
			new Date(),
			async (_source, input, _provider, mode) => {
				if (mode === "historical") {
					expect(input.cursorId).toBe(historicalId);
					return { status: "stale" };
				}
				expect(input.cursorId).not.toBe(historicalId);
				return { status: "healthy" };
			},
		);
		expect(results).toEqual([{ status: "healthy" }, { status: "stale" }]);
	}
});
it("routes every provider to its independent discovery cursor", async () => {
	const seen: { provider: string; cursorId: string }[] = [];
	await readConfiguredReliabilityHealth(
		JSON.stringify([
			entry,
			{ ...entry, provider: "vercel" },
			{ ...entry, provider: "sentry" },
		]),
		new Date(),
		async (_source, input, provider) => {
			seen.push({ provider, cursorId: input.cursorId });
			return { status: "healthy" };
		},
	);
	expect(seen.map((value) => value.provider)).toEqual([
		"trigger",
		"vercel",
		"sentry",
	]);
	expect(seen[1]?.cursorId).toBe(
		createHash("sha256")
			.update(
				JSON.stringify(["vercel-query", "jobs", "org", "jobs", "production"]),
			)
			.digest("hex"),
	);
	expect(seen[0]?.cursorId).not.toBe(seen[1]?.cursorId);
	expect(seen[2]?.cursorId).toBe(
		createHash("sha256")
			.update(
				JSON.stringify(["sentry-events", "jobs", "org", "jobs", "production"]),
			)
			.digest("hex"),
	);
});
it("binds monitoring to the same production discovery cursor as polling", async () => {
	const now = new Date();
	await readConfiguredReliabilityHealth(
		JSON.stringify([entry]),
		now,
		async (source, input) => {
			expect(source).toEqual({
				account: "org",
				project: "jobs",
				service: { id: "jobs" },
			});
			expect(input.cursorId).toBe(
				createHash("sha256")
					.update(
						JSON.stringify([
							"trigger-runs",
							"jobs",
							"org",
							"jobs",
							"production",
						]),
					)
					.digest("hex"),
			);
			expect(input.maxAgeMs).toBe(900_000);
			return { status: "healthy" };
		},
	);
});
it("rejects missing, duplicate, and unsupported monitor sources before database reads", async () => {
	let reads = 0;
	for (const config of [
		undefined,
		"[]",
		JSON.stringify([entry, entry]),
		JSON.stringify([entry, { ...entry, mode: "incremental" }]),
		JSON.stringify([{ ...entry, provider: "vercel", mode: "historical" }]),
		JSON.stringify([{ ...entry, provider: "unsupported" }]),
	]) {
		await expect(
			readConfiguredReliabilityHealth(config, new Date(), async () => {
				reads++;
				return { status: "healthy" };
			}),
		).rejects.toThrow();
	}
	expect(reads).toBe(0);
});
