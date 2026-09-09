import { expect, it } from "bun:test";
import { publishGithubIncident } from "./github-publish";
const input = {
	repository: "gnd/fixture",
	token: "fixture",
	incidentId: "incident_1",
	actionKey: "a".repeat(64),
	title: "Incident",
	evidence: "Evidence",
};
it("creates once then publishes evidence to the stored issue", async () => {
	const urls: string[] = [];
	const request = async (url: string | URL | Request) => {
		urls.push(String(url));
		return Response.json(
			urls.length === 1
				? { number: 12, html_url: "https://github.com/gnd/fixture/issues/12" }
				: {
						id: 99,
						html_url:
							"https://github.com/gnd/fixture/issues/12#issuecomment-99",
					},
			{ status: 201 },
		);
	};
	expect(
		await publishGithubIncident({ ...input, remoteId: null }, request),
	).toEqual({ status: "SENT", remoteId: "12" });
	expect(
		await publishGithubIncident({ ...input, remoteId: "12" }, request),
	).toEqual({ status: "SENT", remoteId: "12" });
	expect(urls).toEqual([
		"https://api.github.com/repos/gnd/fixture/issues",
		"https://api.github.com/repos/gnd/fixture/issues/12/comments",
	]);
});
it("never falls back to creating an issue for an invalid stored receipt", () => {
	let calls = 0;
	for (const remoteId of ["", "0", "../12", "12.0", "9007199254740992"]) {
		expect(() =>
			publishGithubIncident({ ...input, remoteId }, async () => {
				calls++;
				return Response.json({});
			}),
		).toThrow("Invalid stored GitHub issue receipt");
	}
	expect(calls).toBe(0);
});
