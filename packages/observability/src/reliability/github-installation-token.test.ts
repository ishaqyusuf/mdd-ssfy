import { expect, it } from "bun:test";
import { exchangeGithubInstallationToken } from "./github-installation-token";
const input = {
	jwt: "fixture.app.signature",
	installationId: 1,
	repositoryId: 2,
	repository: "gnd/fixture",
	now: () => new Date("2026-09-09T12:00:00Z"),
};
const response = {
	token: "ghs_fixture",
	expires_at: "2026-09-09T13:00:00Z",
	permissions: { issues: "write", metadata: "read" },
	repositories: [{ id: 2, full_name: "gnd/fixture" }],
};
it("requests read-only recovery credentials and rejects a write grant", async () => {
	const readInput = { ...input, issuesPermission: "read" as const };
	const credential = await exchangeGithubInstallationToken(
		readInput,
		async (_url, init) => {
			expect(JSON.parse(String(init?.body)).permissions).toEqual({
				issues: "read",
			});
			return Response.json(
				{ ...response, permissions: { issues: "read", metadata: "read" } },
				{ status: 201 },
			);
		},
	);
	expect(credential.expiresAt.getTime()).toBe(Date.parse(response.expires_at));
	await expect(
		exchangeGithubInstallationToken(readInput, async () =>
			Response.json(response, { status: 201 }),
		),
	).rejects.toThrow("GitHub installation token unavailable");
});
it("requests one repository with issues write and validates the returned scope", async () => {
	const result = await exchangeGithubInstallationToken(
		input,
		async (url, init) => {
			expect(String(url)).toBe(
				"https://api.github.com/app/installations/1/access_tokens",
			);
			expect(JSON.parse(String(init?.body))).toEqual({
				repository_ids: [2],
				permissions: { issues: "write" },
			});
			expect(init?.redirect).toBe("error");
			return Response.json(response, { status: 201 });
		},
	);
	expect(result.expiresAt.toISOString()).toBe(
		response.expires_at.replace("Z", ".000Z"),
	);
});
it("rejects broader, mismatched, expired or unreadable credentials", async () => {
	for (const value of [
		{ ...response, permissions: { issues: "write", contents: "write" } },
		{ ...response, repositories: [{ id: 3, full_name: "gnd/other" }] },
		{ ...response, expires_at: "2026-09-09T12:00:00Z" },
		{ message: "private details" },
	]) {
		await expect(
			exchangeGithubInstallationToken(input, async () =>
				Response.json(value, { status: 201 }),
			),
		).rejects.toThrow("GitHub installation token unavailable");
	}
});
