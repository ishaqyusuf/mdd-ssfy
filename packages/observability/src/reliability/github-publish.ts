import {
	appendReliabilityGithubEvidence,
	createReliabilityGithubIssue,
} from "./github-create";
import type { GithubRequest } from "./github-response";

/** The remote ID comes from the durable claim, never from generated analysis. */
export function publishGithubIncident(
	input: Parameters<typeof createReliabilityGithubIssue>[0] & {
		remoteId: string | null;
	},
	request: GithubRequest = fetch,
	now: () => Date = () => new Date(),
) {
	if (input.remoteId === null)
		return createReliabilityGithubIssue(input, request, now);
	if (
		!/^[1-9]\d*$/.test(input.remoteId) ||
		!Number.isSafeInteger(Number(input.remoteId))
	)
		throw new Error("Invalid stored GitHub issue receipt");
	return appendReliabilityGithubEvidence(
		{ ...input, issueNumber: Number(input.remoteId) },
		request,
		now,
	);
}
