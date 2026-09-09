import { type GithubRequest, readBoundedJson } from "./github-response";

export class GithubDiscoveryRateLimit extends Error {
	constructor(readonly retryAt: Date) {
		super("GitHub receipt discovery rate limited");
	}
}

/** Page-limited discovery. A short page is not proof that an issue never existed. */
export async function readGithubReceiptCandidates(
	input: {
		repository: string;
		token: string;
		since: Date;
		page: number;
		issueNumber?: number;
		now?: () => Date;
	},
	request: GithubRequest = fetch,
): Promise<{ candidates: unknown[]; saturated: boolean }> {
	if (
		(input.issueNumber !== undefined &&
			(!Number.isSafeInteger(input.issueNumber) || input.issueNumber <= 0)) ||
		!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(input.repository) ||
		input.repository.length > 200 ||
		!input.token.trim() ||
		!Number.isFinite(input.since.getTime()) ||
		!Number.isSafeInteger(input.page) ||
		input.page < 1 ||
		input.page > 10
	)
		throw new Error("Invalid GitHub discovery query");
	const url = new URL(
		`https://api.github.com/repos/${input.repository}/issues${input.issueNumber === undefined ? "" : `/${input.issueNumber}/comments`}`,
	);
	url.search = new URLSearchParams({
		state: "all",
		sort: "created",
		direction: "asc",
		since: input.since.toISOString(),
		per_page: "100",
		page: String(input.page),
	}).toString();
	if (input.issueNumber !== undefined) {
		for (const key of ["state", "sort", "direction"])
			url.searchParams.delete(key);
	}
	try {
		const response = await request(url, {
			method: "GET",
			redirect: "error",
			signal: AbortSignal.timeout(5000),
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${input.token}`,
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});
		if (response.status !== 200) {
			await response.body?.cancel();
			if (
				response.status === 429 ||
				(response.status === 403 &&
					(response.headers.has("retry-after") ||
						response.headers.get("x-ratelimit-remaining") === "0"))
			) {
				const now = (input.now?.() ?? new Date()).getTime();
				let retryAt = now + 300_000;
				const after = response.headers.get("retry-after");
				const reset = response.headers.get("x-ratelimit-reset");
				if (after !== null) {
					if (!/^\d+$/.test(after)) throw new Error("Invalid retry hint");
					retryAt = Math.max(retryAt, now + Number(after) * 1000);
				}
				if (
					response.headers.get("x-ratelimit-remaining") === "0" &&
					reset !== null
				) {
					if (!/^\d+$/.test(reset)) throw new Error("Invalid reset hint");
					retryAt = Math.max(retryAt, Number(reset) * 1000 + 1000);
				}
				if (Number.isFinite(new Date(retryAt).getTime()))
					throw new GithubDiscoveryRateLimit(new Date(retryAt));
			}
			throw new Error("Unavailable");
		}
		const candidates = await readBoundedJson(response, 2_097_152);
		if (!Array.isArray(candidates) || candidates.length > 100)
			throw new Error("Invalid page");
		return { candidates, saturated: candidates.length === 100 };
	} catch (error) {
		if (error instanceof GithubDiscoveryRateLimit) throw error;
		throw new Error("GitHub receipt discovery unavailable");
	}
}
