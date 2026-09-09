import {
	type GithubRequest,
	exchangeGithubInstallationToken,
	signGithubAppJwt,
} from "@gnd/observability/reliability";
import { resolveGithubReliabilityRegistration } from "./github-registration";

/** Acquire fresh credentials per operation; no key/token enters persisted job output. */
export async function getGithubReliabilityCredentials(
	input: {
		serviceId: string;
		env: Record<string, string | undefined>;
		now: () => Date;
		issuesPermission?: "read" | "write";
	},
	request: GithubRequest = fetch,
) {
	const registration = resolveGithubReliabilityRegistration(
		input.serviceId,
		input.env,
	);
	if (!registration) return null;
	const jwt = signGithubAppJwt({
		clientId: registration.clientId,
		privateKey: registration.privateKey,
		now: input.now(),
	});
	const credential = await exchangeGithubInstallationToken(
		{
			jwt,
			installationId: registration.installationId,
			repositoryId: registration.repositoryId,
			repository: registration.repository,
			now: input.now,
			issuesPermission: input.issuesPermission,
		},
		request,
	);
	return {
		repository: registration.repository,
		actorId: registration.actorId,
		token: credential.token,
		expiresAt: credential.expiresAt,
	};
}
