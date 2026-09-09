import { expect, it } from "bun:test";
import {
	GithubDiscoveryRateLimit,
	readGithubReceiptCandidates,
} from "./github-discovery";
const input = {
	repository: "gnd/fixture",
	token: "fixture",
	since: new Date("2026-09-09T12:00:00Z"),
	page: 1,
};
it("preserves a provider retry deadline longer than the default cooldown", async () => {
	try {
		await readGithubReceiptCandidates(
			{ ...input, now: () => input.since },
			async () =>
				new Response(null, { status: 429, headers: { "retry-after": "900" } }),
		);
		throw new Error("Expected throttling");
	} catch (error) {
		expect(error).toBeInstanceOf(GithubDiscoveryRateLimit);
		if (!(error instanceof GithubDiscoveryRateLimit)) throw error;
		expect(error.retryAt.toISOString()).toBe("2026-09-09T12:15:00.000Z");
	}
});
it("queries all issue states with bounded repository pagination", async () => {
	const result = await readGithubReceiptCandidates(input, async (url, init) => {
		const parsed = new URL(String(url));
		expect(parsed.origin + parsed.pathname).toBe(
			"https://api.github.com/repos/gnd/fixture/issues",
		);
		expect(parsed.searchParams.get("state")).toBe("all");
		expect(parsed.searchParams.get("since")).toBe(input.since.toISOString());
		expect(init?.redirect).toBe("error");
		return Response.json(
			Array.from({ length: 100 }, (_, number) => ({ number })),
		);
	});
	expect(result.saturated).toBe(true);
});
it("fails closed on unavailable or invalid discovery without leaking diagnostics", async () => {
	for (const response of [
		new Response("private", { status: 403 }),
		Response.json({ message: "private" }),
		Response.json(Array(101).fill({})),
	]) {
		await expect(
			readGithubReceiptCandidates(input, async () => response),
		).rejects.toThrow("GitHub receipt discovery unavailable");
	}
});
