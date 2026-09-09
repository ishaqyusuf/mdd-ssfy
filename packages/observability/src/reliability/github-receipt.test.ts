import { expect, it } from "bun:test";
import { identifyGithubDeliveryReceipt } from "./github-receipt";
const input = {
	repository: "gnd/fixture",
	actorId: 123,
	incidentId: "incident_1",
	actionKey: "a".repeat(64),
};
const candidate = {
	number: 12,
	html_url: "https://github.com/gnd/fixture/issues/12",
	user: { id: 123 },
	body: `<!-- reliability:incident_1:start -->\nEvidence\n<!-- reliability:incident_1:end -->\n<!-- reliability-action:${input.actionKey} -->`,
};
it("recovers only comments on the expected issue and detects duplicate comments", () => {
	const comment = {
		...candidate,
		id: 99,
		html_url: "https://github.com/gnd/fixture/issues/12#issuecomment-99",
	};
	expect(
		identifyGithubDeliveryReceipt({
			...input,
			issueNumber: 12,
			candidates: [comment],
		}),
	).toEqual({ status: "found", remoteId: "12", receiptId: "99" });
	expect(
		identifyGithubDeliveryReceipt({
			...input,
			issueNumber: 13,
			candidates: [comment],
		}),
	).toEqual({ status: "unresolved" });
	expect(
		identifyGithubDeliveryReceipt({
			...input,
			issueNumber: 12,
			candidates: [
				comment,
				{
					...comment,
					id: 100,
					html_url: "https://github.com/gnd/fixture/issues/12#issuecomment-100",
				},
			],
		}),
	).toEqual({ status: "ambiguous" });
});
it("accepts only the scoped automation receipt and detects multiple remote creates", () => {
	expect(
		identifyGithubDeliveryReceipt({
			...input,
			candidates: [candidate, candidate],
		}),
	).toEqual({ status: "found", remoteId: "12" });
	expect(
		identifyGithubDeliveryReceipt({
			...input,
			candidates: [
				candidate,
				{
					...candidate,
					number: 13,
					html_url: "https://github.com/gnd/fixture/issues/13",
				},
			],
		}),
	).toEqual({ status: "ambiguous" });
});
it("leaves missing or untrusted receipts unresolved without authorizing recreation", () => {
	for (const candidates of [
		[],
		[{ ...candidate, user: { id: 999 } }],
		[{ ...candidate, html_url: "https://github.com/other/repo/issues/12" }],
		[{ ...candidate, pull_request: {} }],
		[{ ...candidate, body: candidate.body + candidate.body }],
		[
			{
				...candidate,
				body: candidate.body.replace(input.actionKey, "b".repeat(64)),
			},
		],
	]) {
		expect(identifyGithubDeliveryReceipt({ ...input, candidates })).toEqual({
			status: "unresolved",
		});
	}
});
