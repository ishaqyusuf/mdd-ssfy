import { type GithubRequest, readBoundedJson } from "./github-response";

/** Returns a credential for immediate use; never persist or log it. */
export async function exchangeGithubInstallationToken(
	input: {
		jwt: string;
		installationId: number;
		repositoryId: number;
		repository: string;
		now: () => Date;
		issuesPermission?: "read" | "write";
	},
	request: GithubRequest = fetch,
) {
	if (
		(input.issuesPermission !== undefined &&
			!["read", "write"].includes(input.issuesPermission)) ||
		![input.installationId, input.repositoryId].every(
			(value) => Number.isSafeInteger(value) && value > 0,
		) ||
		!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(input.repository) ||
		!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(input.jwt)
	)
		throw new Error("Invalid GitHub installation token request");
	try {
		const response = await request(
			`https://api.github.com/app/installations/${input.installationId}/access_tokens`,
			{
				method: "POST",
				redirect: "error",
				signal: AbortSignal.timeout(5000),
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${input.jwt}`,
					"Content-Type": "application/json",
					"X-GitHub-Api-Version": "2022-11-28",
				},
				body: JSON.stringify({
					repository_ids: [input.repositoryId],
					permissions: { issues: input.issuesPermission ?? "write" },
				}),
			},
		);
		if (response.status !== 201) {
			await response.body?.cancel();
			throw new Error("Exchange rejected");
		}
		const result = await readBoundedJson(response, 131_072);
		const now = input.now().getTime();
		const expiresAt = new Date(result?.expires_at);
		if (
			!Number.isFinite(now) ||
			!Number.isFinite(expiresAt.getTime()) ||
			expiresAt.getTime() <= now + 60_000 ||
			expiresAt.getTime() > now + 3_660_000 ||
			typeof result.token !== "string" ||
			!/^[A-Za-z0-9_]{1,4096}$/.test(result.token) ||
			result.permissions?.issues !== (input.issuesPermission ?? "write") ||
			Object.entries(result.permissions).some(
				([key, value]) =>
					key !== "issues" && !(key === "metadata" && value === "read"),
			) ||
			!Array.isArray(result.repositories) ||
			result.repositories.length !== 1 ||
			result.repositories[0]?.id !== input.repositoryId ||
			result.repositories[0]?.full_name !== input.repository
		)
			throw new Error("Unverified token scope");
		return { token: result.token as string, expiresAt };
	} catch {
		throw new Error("GitHub installation token unavailable");
	}
}
