import { expect, it } from "bun:test";
import { handleReliabilityHealthRequest } from "./reliability-health";

const token = "local-monitor-fixture-with-at-least-32-characters";
const request = (authorization?: string) =>
	new Request("https://api.example/api/reliability/health", {
		headers: authorization ? { authorization } : {},
	});
it("does not read monitoring state without a configured valid credential", async () => {
	let reads = 0;
	for (const [configured, auth, status] of [
		[null, `Bearer ${token}`, 404],
		[token, undefined, 401],
		[token, "Bearer wrong", 401],
	] as const) {
		const response = await handleReliabilityHealthRequest(request(auth), {
			token: configured,
			read: async () => {
				reads++;
				return [{ status: "healthy" }];
			},
		});
		expect(response.status).toBe(status);
	}
	expect(reads).toBe(0);
});
it("returns healthy only when every configured source is healthy", async () => {
	for (const [sources, status] of [
		[[{ status: "healthy" }], 200],
		[[{ status: "healthy" }, { status: "stale" }], 503],
		[[], 503],
	] as const) {
		const response = await handleReliabilityHealthRequest(
			request(`Bearer ${token}`),
			{ token, read: async () => sources },
		);
		expect(response.status).toBe(status);
		expect(response.headers.get("cache-control")).toBe("no-store");
	}
});
it("fails closed on storage errors without disclosing diagnostics", async () => {
	const response = await handleReliabilityHealthRequest(
		request(`Bearer ${token}`),
		{
			token,
			read: async () => {
				throw new Error("private database diagnostic");
			},
		},
	);
	expect(response.status).toBe(503);
	expect(await response.text()).not.toContain("private database diagnostic");
});
