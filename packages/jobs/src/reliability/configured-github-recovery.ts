import type { Database } from "@gnd/db";
import {
	expireGithubSender,
	extendGithubRecoveryCooldown,
	getUncertainGithubDelivery,
	reserveGithubRecoveryScan,
} from "@gnd/db/queries";
import type { GithubRequest } from "@gnd/observability/reliability";
import { getGithubReliabilityCredentials } from "./github-credentials";
import { recoverGithubDelivery } from "./recover-github";

/** Recovery has its own opt-in and never creates an issue or comment. */
export async function recoverConfiguredGithubDelivery(
	db: Database,
	input: {
		env: Record<string, string | undefined>;
		environment: string;
		deliveryId: string;
		serviceId: string;
		now: () => Date;
	},
	request: GithubRequest = fetch,
) {
	if (
		input.environment !== "PRODUCTION" ||
		input.env.RELIABILITY_GITHUB_RECOVERY_ENABLED !== "true"
	)
		return { status: "disabled" };
	await expireGithubSender(db, {
		deliveryId: input.deliveryId,
		serviceId: input.serviceId,
		now: input.now(),
	});
	if (!(await getUncertainGithubDelivery(db, input)))
		return { status: "not_eligible" };
	if (
		!(await reserveGithubRecoveryScan(db, {
			deliveryId: input.deliveryId,
			serviceId: input.serviceId,
			now: input.now(),
		}))
	)
		return { status: "cooldown" };
	const credentials = await getGithubReliabilityCredentials(
		{ ...input, issuesPermission: "read" },
		request,
	);
	if (!credentials) return { status: "not_configured" };
	const result = await recoverGithubDelivery(
		db,
		{ ...input, ...credentials },
		request,
	);
	if (result.status === "rate_limited")
		await extendGithubRecoveryCooldown(db, {
			deliveryId: input.deliveryId,
			serviceId: input.serviceId,
			retryAt: result.retryAt,
		});
	return result;
}
