import type { Database } from "@gnd/db";
import {
	getUncertainGithubDelivery,
	recordReliabilityDeliveryReceipt,
} from "@gnd/db/queries";
import {
	type GithubRequest,
	discoverGithubDeliveryReceipt,
} from "@gnd/observability/reliability";

/** Registry-bound credentials and actor identity are supplied by the caller. */
export async function recoverGithubDelivery(
	db: Database,
	input: {
		deliveryId: string;
		serviceId: string;
		repository: string;
		token: string;
		actorId: number;
		now: () => Date;
	},
	request: GithubRequest = fetch,
) {
	const delivery = await getUncertainGithubDelivery(db, input);
	if (!delivery) return { status: "not_eligible" as const };
	if (
		delivery.remoteId !== null &&
		(!/^[1-9]\d*$/.test(delivery.remoteId) ||
			!Number.isSafeInteger(Number(delivery.remoteId)))
	)
		return { status: "invalid_receipt" as const };
	const result = await discoverGithubDeliveryReceipt(
		{
			repository: input.repository,
			token: input.token,
			actorId: input.actorId,
			incidentId: delivery.incidentId,
			actionKey: delivery.actionKey,
			since: new Date(delivery.createdAt.getTime() - 300_000),
			maxPages: 4,
			now: input.now,
			...(delivery.remoteId === null
				? {}
				: { issueNumber: Number(delivery.remoteId) }),
		},
		request,
	);
	if (result.status !== "found") return result;
	const saved = await recordReliabilityDeliveryReceipt(db, {
		deliveryId: delivery.id,
		actionKey: delivery.actionKey,
		remoteId: result.remoteId,
		now: input.now(),
	});
	return {
		status: saved ? ("recovered" as const) : ("state_changed" as const),
	};
}
