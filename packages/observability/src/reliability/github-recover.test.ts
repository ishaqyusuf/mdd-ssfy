import { expect, it } from "bun:test";
import { discoverGithubDeliveryReceipt } from "./github-recover";
const input = {
	repository: "gnd/fixture",
	token: "fixture",
	actorId: 123,
	incidentId: "incident_1",
	actionKey: "a".repeat(64),
	since: new Date("2026-09-09T12:00:00Z"),
	maxPages: 2,
};
const candidate = {
	number: 12,
	html_url: "https://github.com/gnd/fixture/issues/12",
	user: { id: 123 },
	body: `<!-- reliability:incident_1:start -->\nEvidence\n<!-- reliability:incident_1:end -->\n<!-- reliability-action:${input.actionKey} -->`,
};
it("recovers comments on the stored issue and catches cross-page duplicates", async () => {
	const comment = {
		...candidate,
		id: 99,
		html_url: "https://github.com/gnd/fixture/issues/12#issuecomment-99",
	};
	expect(
		await discoverGithubDeliveryReceipt(
			{ ...input, issueNumber: 12 },
			async (url) => {
				const parsed = new URL(String(url));
				expect(parsed.pathname).toBe("/repos/gnd/fixture/issues/12/comments");
				expect(parsed.searchParams.has("state")).toBe(false);
				return Response.json([comment]);
			},
		),
	).toEqual({ status: "found", remoteId: "12" });
	let calls = 0;
	expect(
		(
			await discoverGithubDeliveryReceipt(
				{ ...input, issueNumber: 12 },
				async () => {
					calls++;
					return Response.json(
						calls === 1
							? [comment, ...Array(99).fill({})]
							: [
									{
										...comment,
										id: 100,
										html_url:
											"https://github.com/gnd/fixture/issues/12#issuecomment-100",
									},
								],
					);
				},
			)
		).status,
	).toBe("ambiguous");
});
it("waits for remaining pages before returning a unique recovered receipt", async () => {
	let calls = 0;
	const result = await discoverGithubDeliveryReceipt(input, async () => {
		calls++;
		return Response.json(calls === 1 ? [candidate, ...Array(99).fill({})] : []);
	});
	expect(result).toEqual({ status: "found", remoteId: "12" });
	expect(calls).toBe(2);
});
it("holds incomplete, unavailable, absent and conflicting discovery results", async () => {
	expect(
		(
			await discoverGithubDeliveryReceipt({ ...input, maxPages: 1 }, async () =>
				Response.json([candidate, ...Array(99).fill({})]),
			)
		).status,
	).toBe("incomplete");
	expect(
		(await discoverGithubDeliveryReceipt(input, async () => Response.json([])))
			.status,
	).toBe("unresolved");
	expect(
		(
			await discoverGithubDeliveryReceipt(
				input,
				async () => new Response(null, { status: 429 }),
			)
		).status,
	).toBe("rate_limited");
	let calls = 0;
	expect(
		(
			await discoverGithubDeliveryReceipt(input, async () => {
				calls++;
				return Response.json(
					calls === 1
						? [candidate, ...Array(99).fill({})]
						: [
								{
									...candidate,
									number: 13,
									html_url: "https://github.com/gnd/fixture/issues/13",
								},
							],
				);
			})
		).status,
	).toBe("ambiguous");
});
