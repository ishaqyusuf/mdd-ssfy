import type { Database } from "@gnd/db";
import {
	type ReliabilityDeliveryOutcome,
	claimReliabilityDelivery,
	settleReliabilityDelivery,
} from "@gnd/db/queries";

/** The caller binds a reviewed draft and destination credentials before claiming. */
export async function deliverReliabilityIncident(
	db: Database,
	input: {
		incidentId: string;
		serviceId: string;
		revision: number;
		destination: "GITHUB" | "SLACK";
		now: () => Date;
		publish: (delivery: {
			actionKey: string;
			attempt: number;
			remoteId: string | null;
		}) => Promise<ReliabilityDeliveryOutcome>;
	},
) {
	const claim = await claimReliabilityDelivery(db, {
		incidentId: input.incidentId,
		destination: input.destination,
		now: input.now(),
		leaseMs: 30_000,
		publication: { serviceId: input.serviceId, revision: input.revision },
	});
	if (!claim?.leaseId || !claim.leaseExpiresAt)
		return { status: "not_claimed" };
	if (input.now() >= claim.leaseExpiresAt) return { status: "lease_lost" };
	let outcome: ReliabilityDeliveryOutcome;
	try {
		outcome = await input.publish({
			actionKey: claim.actionKey,
			attempt: claim.attempts,
			remoteId: claim.remoteId,
		});
	} catch {
		outcome = { status: "UNCERTAIN", errorCode: "PUBLICATION_RESULT_UNKNOWN" };
	}
	const saved = await settleReliabilityDelivery(db, {
		deliveryId: claim.id,
		leaseId: claim.leaseId,
		now: input.now(),
		outcome,
	});
	return {
		status: saved
			? outcome.status === "PENDING" && claim.attempts >= 5
				? "FAILED"
				: outcome.status
			: "lease_lost",
	};
}
