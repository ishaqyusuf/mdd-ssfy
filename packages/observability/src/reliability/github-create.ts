import { updateGithubEvidenceBlock } from "./github-evidence-block";

import { type GithubRequest, readBoundedJson } from "./github-response";

type Result =
	| { status: "SENT"; remoteId: string }
	| { status: "PENDING"; errorCode: string; retryAt: Date }
	| { status: "FAILED" | "UNCERTAIN"; errorCode: string };

/** A create is never retried here: an ambiguous response requires reconciliation. */
async function writeGithubEvidence(
	input: {
		repository: string;
		token: string;
		incidentId: string;
		actionKey: string;
		title: string;
		evidence: string;
		attempt?: number;
	},
	request: GithubRequest = fetch,
	now: () => Date = () => new Date(),
	issueNumber?: number,
): Promise<Result> {
	if (
		(issueNumber !== undefined &&
			(!Number.isSafeInteger(issueNumber) || issueNumber <= 0)) ||
		!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/.test(input.repository) ||
		input.repository.length > 200 ||
		!Number.isInteger(input.attempt ?? 1) ||
		(input.attempt ?? 1) < 1 ||
		(input.attempt ?? 1) > 5 ||
		!input.token.trim() ||
		!/^[a-f0-9]{64}$/.test(input.actionKey) ||
		/<!--\s*reliability-action:/i.test(input.evidence) ||
		!input.title.trim() ||
		input.title.length > 240 ||
		/[\r\n]/.test(input.title)
	)
		throw new Error("Invalid GitHub incident publication");
	const body = `${updateGithubEvidenceBlock({ ...input, existingBody: null })}\n<!-- reliability-action:${input.actionKey} -->`;
	try {
		const response = await request(
			`https://api.github.com/repos/${input.repository}/issues${issueNumber === undefined ? "" : `/${issueNumber}/comments`}`,
			{
				method: "POST",
				redirect: "error",
				signal: AbortSignal.timeout(5000),
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${input.token}`,
					"Content-Type": "application/json",
					"X-GitHub-Api-Version": "2022-11-28",
				},
				body: JSON.stringify(
					issueNumber === undefined ? { title: input.title, body } : { body },
				),
			},
		);
		if (response.status !== 201) {
			let secondaryLimit = false;
			if (
				response.status === 403 &&
				!response.headers.has("retry-after") &&
				response.headers.get("x-ratelimit-remaining") !== "0"
			) {
				const error = await readBoundedJson(response, 16_384).catch(() => null);
				secondaryLimit =
					typeof error?.message === "string" &&
					/\b(?:secondary rate limit|abuse detection mechanism)\b/i.test(
						error.message,
					);
			} else await response.body?.cancel();
			if (
				secondaryLimit ||
				response.status === 429 ||
				(response.status === 403 &&
					(response.headers.has("retry-after") ||
						response.headers.get("x-ratelimit-remaining") === "0"))
			) {
				const clock = now().getTime();
				let retryAt = clock + 60_000 * 2 ** ((input.attempt ?? 1) - 1);
				const after = response.headers.get("retry-after");
				const reset = response.headers.get("x-ratelimit-reset");
				if (after !== null) {
					if (!/^\d+$/.test(after))
						return {
							status: "FAILED",
							errorCode: "GITHUB_RETRY_HEADER_INVALID",
						};
					retryAt = Math.max(retryAt, clock + Number(after) * 1000);
				}
				if (
					response.headers.get("x-ratelimit-remaining") === "0" &&
					reset !== null
				) {
					if (!/^\d+$/.test(reset))
						return {
							status: "FAILED",
							errorCode: "GITHUB_RETRY_HEADER_INVALID",
						};
					retryAt = Math.max(retryAt, Number(reset) * 1000 + 1000);
				}
				if (
					!Number.isFinite(clock) ||
					!Number.isFinite(new Date(retryAt).getTime())
				)
					return { status: "FAILED", errorCode: "GITHUB_RETRY_HEADER_INVALID" };
				return {
					status: "PENDING",
					errorCode: "GITHUB_RATE_LIMITED",
					retryAt: new Date(retryAt),
				};
			}
			return {
				status: [400, 401, 403, 404, 410, 422, 429].includes(response.status)
					? "FAILED"
					: "UNCERTAIN",
				errorCode: `GITHUB_HTTP_${response.status}`,
			};
		}
		const receipt = await readBoundedJson(response, 1_048_576);
		if (issueNumber !== undefined) {
			if (
				!Number.isSafeInteger(receipt?.id) ||
				receipt.id <= 0 ||
				receipt.html_url !==
					`https://github.com/${input.repository}/issues/${issueNumber}#issuecomment-${receipt.id}`
			)
				throw new Error("Invalid comment receipt");
			return { status: "SENT", remoteId: String(issueNumber) };
		}
		if (
			!Number.isSafeInteger(receipt?.number) ||
			receipt.number <= 0 ||
			receipt.html_url !==
				`https://github.com/${input.repository}/issues/${receipt.number}` ||
			receipt.pull_request
		)
			throw new Error("Invalid receipt");
		return { status: "SENT", remoteId: String(receipt.number) };
	} catch {
		return { status: "UNCERTAIN", errorCode: "GITHUB_CREATE_UNCERTAIN" };
	}
}

export function createReliabilityGithubIssue(
	input: Parameters<typeof writeGithubEvidence>[0],
	request: GithubRequest = fetch,
	now: () => Date = () => new Date(),
) {
	return writeGithubEvidence(input, request, now);
}

export function appendReliabilityGithubEvidence(
	input: Omit<Parameters<typeof createReliabilityGithubIssue>[0], "title"> & {
		issueNumber: number;
	},
	request: GithubRequest = fetch,
	now: () => Date = () => new Date(),
) {
	return writeGithubEvidence(
		{ ...input, title: "Incident update" },
		request,
		now,
		input.issueNumber,
	);
}
