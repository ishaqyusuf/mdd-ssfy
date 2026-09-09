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
