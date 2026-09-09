import type { Database } from "@gnd/db";
import {
	type GithubRequest,
	publishGithubIncident,
} from "@gnd/observability/reliability";
import { deliverReliabilityIncident } from "./deliver-incident";
import { getGithubReliabilityCredentials } from "./github-credentials";

/** Invoked with a reviewed, revision-bound draft after the publication gate. */
export async function publishConfiguredGithubIncident(
	db: Database,
	input: {
		env: Record<string, string | undefined>;
		environment: string;
		incidentId: string;
		serviceId: string;
		revision: number;
		title: string;
		evidence: string;
		now: () => Date;
	},
	request: GithubRequest = fetch,
) {
	if (
		input.environment !== "PRODUCTION" ||
		input.env.RELIABILITY_GITHUB_PUBLICATION_ENABLED !== "true"
	)
		return { status: "disabled" };
	const credentials = await getGithubReliabilityCredentials(input, request);
	if (!credentials) return { status: "not_configured" };
	return deliverReliabilityIncident(db, {
		incidentId: input.incidentId,
		serviceId: input.serviceId,
		revision: input.revision,
		destination: "GITHUB",
		now: input.now,
		publish: (delivery) => {
			if (credentials.expiresAt.getTime() <= input.now().getTime() + 30_000)
				return Promise.resolve({
					status: "PENDING",
					errorCode: "GITHUB_CREDENTIAL_EXPIRED",
					retryAt: new Date(input.now().getTime() + 60_000),
				});
			return publishGithubIncident(
				{
					repository: credentials.repository,
					token: credentials.token,
					incidentId: input.incidentId,
					title: input.title,
					evidence: input.evidence,
					...delivery,
				},
				request,
				input.now,
			);
		},
	});
}
