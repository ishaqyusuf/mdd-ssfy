import {
	GithubDiscoveryRateLimit,
	readGithubReceiptCandidates,
} from "./github-discovery";
import { identifyGithubDeliveryReceipt } from "./github-receipt";
import type { GithubRequest } from "./github-response";

/** A bounded scan can recover a receipt, but never prove a create is safe to repeat. */
export async function discoverGithubDeliveryReceipt(
	input: {
		repository: string;
		token: string;
		actorId: number;
		incidentId: string;
		actionKey: string;
		since: Date;
		maxPages: number;
		issueNumber?: number;
		now?: () => Date;
	},
	request: GithubRequest = fetch,
) {
	if (
		!Number.isInteger(input.maxPages) ||
		input.maxPages < 1 ||
		input.maxPages > 4
	)
		throw new Error("Invalid GitHub recovery budget");
	// Validate marker/author binding before making any authenticated request.
	identifyGithubDeliveryReceipt({ ...input, candidates: [] });
	const matches = new Set<string>();
	for (let page = 1; page <= input.maxPages; page++) {
		let result: Awaited<ReturnType<typeof readGithubReceiptCandidates>>;
		try {
			result = await readGithubReceiptCandidates({ ...input, page }, request);
		} catch (error) {
			if (error instanceof GithubDiscoveryRateLimit)
				return { status: "rate_limited" as const, retryAt: error.retryAt };
			return { status: "unavailable" as const };
		}
		const receipt = identifyGithubDeliveryReceipt({
			...input,
			candidates: result.candidates,
		});
		if (receipt.status === "ambiguous") return { status: "ambiguous" as const };
		if (receipt.status === "found")
			matches.add(receipt.receiptId ?? receipt.remoteId);
		if (matches.size > 1) return { status: "ambiguous" as const };
		if (!result.saturated) {
			const remoteId = [...matches][0];
			return remoteId
				? {
						status: "found" as const,
						remoteId:
							input.issueNumber === undefined
								? remoteId
								: String(input.issueNumber),
					}
				: { status: "unresolved" as const };
		}
	}
	return { status: "incomplete" as const };
}
