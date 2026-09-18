import { expect, it } from "bun:test";
import {
	appendReliabilityGithubEvidence,
	createReliabilityGithubIssue,
} from "./github-create";
const input = {
	repository: "gnd/fixture",
	token: "fixture",
	incidentId: "incident_1",
	actionKey: "a".repeat(64),
	title: "Incident",
	evidence: "Safe evidence",
};
it("appends evidence to the existing issue without replacing its body or title", async () => {
	const result = await appendReliabilityGithubEvidence(
		{ ...input, issueNumber: 12 },
		async (url, init) => {
			expect(String(url)).toBe(
				"https://api.github.com/repos/gnd/fixture/issues/12/comments",
			);
			const payload = JSON.parse(String(init?.body));
			expect(Object.keys(payload)).toEqual(["body"]);
			expect(payload.body).toContain(input.actionKey);
			return Response.json(
				{
					id: 99,
					html_url: "https://github.com/gnd/fixture/issues/12#issuecomment-99",
				},
				{ status: 201 },
			);
		},
	);
	expect(result).toEqual({ status: "SENT", remoteId: "12" });
	expect(
		(
			await appendReliabilityGithubEvidence(
				{ ...input, issueNumber: 12 },
				async () =>
					Response.json(
						{
							id: 99,
							html_url:
								"https://github.com/gnd/fixture/issues/13#issuecomment-99",
						},
						{ status: 201 },
					),
			)
		).status,
	).toBe("UNCERTAIN");
});
it("recognizes body-only secondary limits without retrying permission failures", async () => {
	const now = new Date("2026-09-09T12:00:00Z");
	for (const message of [
		"You have exceeded a secondary rate limit.",
		"You have triggered an abuse detection mechanism.",
	]) {
		const result = await createReliabilityGithubIssue(
			input,
			async () => Response.json({ message }, { status: 403 }),
			() => now,
		);
		expect(result).toEqual({
			status: "PENDING",
			errorCode: "GITHUB_RATE_LIMITED",
			retryAt: new Date("2026-09-09T12:01:00Z"),
		});
	}
	for (const response of [
		Response.json(
			{ message: "Resource not accessible by integration" },
			{ status: 403 },
		),
		new Response("malformed", { status: 403 }),
		Response.json(
			{ message: `${"x".repeat(16_384)} secondary rate limit` },
			{ status: 403 },
		),
	]) {
		expect(
			(
				await createReliabilityGithubIssue(
					input,
					async () => response,
					() => now,
				)
			).status,
		).toBe("FAILED");
	}
});
it("defers throttled creates until provider limits and exponential backoff permit", async () => {
	const now = new Date("2026-09-09T12:00:00Z");
	for (const [status, headers, seconds] of [
		[429, {}, 120],
		[429, { "retry-after": "300" }, 300],
		[
			403,
			{
				"x-ratelimit-remaining": "0",
				"x-ratelimit-reset": String(now.getTime() / 1000 + 600),
			},
			601,
		],
	] as const) {
		const result = await createReliabilityGithubIssue(
			{ ...input, attempt: 2 },
			async () => new Response(null, { status, headers }),
			() => now,
		);
		expect(result).toEqual({
			status: "PENDING",
			errorCode: "GITHUB_RATE_LIMITED",
			retryAt: new Date(now.getTime() + seconds * 1000),
		});
	}
	expect(
		(
			await createReliabilityGithubIssue(
				input,
				async () => new Response(null, { status: 403 }),
				() => now,
			)
		).status,
	).toBe("FAILED");
	expect(
		(
			await createReliabilityGithubIssue(
				input,
				async () =>
					new Response(null, {
						status: 429,
						headers: { "retry-after": "invalid" },
					}),
				() => now,
			)
		).status,
	).toBe("FAILED");
});
it("publishes one marked issue and validates its repository-scoped receipt", async () => {
	let calls = 0;
	const result = await createReliabilityGithubIssue(
		input,
		async (url, init) => {
			calls++;
			expect(String(url)).toBe(
				"https://api.github.com/repos/gnd/fixture/issues",
			);
			expect(init?.redirect).toBe("error");
			expect(JSON.parse(String(init?.body)).body).toContain(
				`<!-- reliability-action:${input.actionKey} -->`,
			);
			return Response.json(
				{ number: 12, html_url: "https://github.com/gnd/fixture/issues/12" },
				{ status: 201 },
			);
		},
	);
	expect(result).toEqual({ status: "SENT", remoteId: "12" });
	expect(calls).toBe(1);
});
it("includes validated labels when creating an issue", async () => {
	const result = await createReliabilityGithubIssue(
		{ ...input, labels: ["bug", "reported-from-gnd"] },
		async (_url, init) => {
			const payload = JSON.parse(String(init?.body));
			expect(payload.labels).toEqual(["bug", "reported-from-gnd"]);
			return Response.json(
				{ number: 12, html_url: "https://github.com/gnd/fixture/issues/12" },
				{ status: 201 },
			);
		},
	);
	expect(result).toEqual({ status: "SENT", remoteId: "12" });
});
it("holds ambiguous creates without retrying or exposing provider details", async () => {
	for (const response of [
		new Response("private error", { status: 500 }),
		Response.json(
			{ number: 12, html_url: "https://github.com/other/repo/issues/12" },
			{ status: 201 },
		),
		new Response("invalid", { status: 201 }),
	]) {
		let calls = 0;
		const result = await createReliabilityGithubIssue(input, async () => {
			calls++;
			return response;
		});
		expect(result.status).toBe("UNCERTAIN");
		expect(calls).toBe(1);
		expect(JSON.stringify(result)).not.toContain("private");
	}
	expect(
		(
			await createReliabilityGithubIssue(input, async () => {
				throw new Error("private token");
			})
		).status,
	).toBe("UNCERTAIN");
	expect(
		(
			await createReliabilityGithubIssue(
				input,
				async () => new Response(null, { status: 401 }),
			)
		).status,
	).toBe("FAILED");
});
