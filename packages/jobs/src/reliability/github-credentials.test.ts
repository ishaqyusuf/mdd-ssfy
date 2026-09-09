import { expect, it } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import { getGithubReliabilityCredentials } from "./github-credentials";
it("binds app signing and token scope to the registered service", async () => {
	const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
	const entry = {
		serviceId: "web",
		repository: "gnd/fixture",
		repositoryId: 2,
		installationId: 3,
		actorId: 4,
		clientId: "Iv1.fixture",
		privateKeyEnv: "RELIABILITY_GITHUB_APP_KEY_WEB",
	};
	const input = {
		serviceId: "web",
		env: {
			RELIABILITY_GITHUB_REGISTRATIONS: JSON.stringify([entry]),
			RELIABILITY_GITHUB_APP_KEY_WEB: privateKey
				.export({ type: "pkcs8", format: "pem" })
				.toString(),
		},
		now: () => new Date("2026-09-09T12:00:00Z"),
	};
	let calls = 0;
	const request = async (_url: string | URL | Request, init?: RequestInit) => {
		calls++;
		const jwt = new Headers(init?.headers).get("authorization")?.slice(7) ?? "";
		const payload = jwt.split(".")[1] ?? "";
		expect(JSON.parse(Buffer.from(payload, "base64url").toString()).iss).toBe(
			entry.clientId,
		);
		expect(JSON.parse(String(init?.body))).toEqual({
			repository_ids: [2],
			permissions: { issues: "write" },
		});
		return Response.json(
			{
				token: "ghs_fixture",
				expires_at: "2026-09-09T13:00:00Z",
				permissions: { issues: "write" },
				repositories: [{ id: 2, full_name: entry.repository }],
			},
			{ status: 201 },
		);
	};
	expect(
		await getGithubReliabilityCredentials(
			{ ...input, serviceId: "missing" },
			request,
		),
	).toBeNull();
	expect(calls).toBe(0);
	const result = await getGithubReliabilityCredentials(input, request);
	expect(result?.repository).toBe(entry.repository);
	expect(result?.actorId).toBe(4);
	expect(result).not.toHaveProperty("privateKey");
	expect(result).not.toHaveProperty("jwt");
});
