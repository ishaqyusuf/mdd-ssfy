import { createHash } from "node:crypto";
import type { Database } from "../index";

/** Supplied by the authenticated adapter from server-owned membership records. */
export type ReliabilityPrincipal = {
	actorId: string;
	serviceIds: readonly string[];
};

export type ReliabilityActionCommand = {
	incidentId: string;
	requestId: string;
	expectedRevision: number;
	action: "ACKNOWLEDGE" | "ASSIGN_SELF";
};

const actionableStates = [
	"DETECTED",
	"NEEDS_INVESTIGATION",
	"TRIAGED",
	"FIX_DRAFTED",
	"IN_REVIEW",
	"READY_TO_RELEASE",
	"OBSERVING",
	"REGRESSED",
];

export async function applyReliabilityAction(
	db: Database,
	command: ReliabilityActionCommand,
	principal: ReliabilityPrincipal,
) {
	const identifier = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/;
	if (
		!identifier.test(command.requestId) ||
		!identifier.test(principal.actorId) ||
		!Number.isSafeInteger(command.expectedRevision) ||
		command.expectedRevision < 1 ||
		!["ACKNOWLEDGE", "ASSIGN_SELF"].includes(command.action)
	) {
		throw new Error("Invalid reliability action");
	}
	const actionKey = createHash("sha256")
		.update(
			JSON.stringify(["human-action", command.incidentId, command.requestId]),
		)
		.digest("hex");
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM ReliabilityIncident WHERE id = ${command.incidentId} FOR UPDATE`;
			const incident = await tx.reliabilityIncident.findUnique({
				where: { id: command.incidentId },
			});
			if (!incident || !principal.serviceIds.includes(incident.serviceId)) {
				throw new Error("Unauthorized reliability action");
			}
			const previous = await tx.reliabilityTransition.findUnique({
				where: { actionKey },
			});
			if (previous) {
				if (
					previous.actor !== principal.actorId ||
					previous.action !== command.action ||
					previous.revision !== command.expectedRevision + 1
				) {
					throw new Error("Reliability action identity conflict");
				}
				return { incident, duplicate: true };
			}
			if (incident.revision !== command.expectedRevision)
				throw new Error("Stale reliability revision");
			if (!actionableStates.includes(incident.status))
				throw new Error("Reliability action not allowed in current state");
			const updated = await tx.reliabilityIncident.update({
				where: { id: incident.id },
				data: {
					revision: { increment: 1 },
					...(command.action === "ASSIGN_SELF"
						? { owner: principal.actorId }
						: {}),
				},
			});
			await tx.reliabilityTransition.create({
				data: {
					actionKey,
					incidentId: incident.id,
					actor: principal.actorId,
					action: command.action,
					fromStatus: incident.status,
					toStatus: updated.status,
					revision: updated.revision,
				},
			});
			await tx.reliabilityDelivery.createMany({
				data: ["GITHUB", "SLACK"].map((destination) => ({
					actionKey: createHash("sha256")
						.update(
							JSON.stringify([
								incident.id,
								destination,
								"UPSERT",
								updated.revision,
							]),
						)
						.digest("hex"),
					incidentId: incident.id,
					destination,
					action: "UPSERT",
					revision: updated.revision,
				})),
			});
			return { incident: updated, duplicate: false };
		},
		{ timeout: 10_000 },
	);
}
