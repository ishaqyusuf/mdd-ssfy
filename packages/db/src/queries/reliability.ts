import { createHash } from "node:crypto";
import type {
	PreparedIncidentIntake,
	ReliabilitySeverity,
} from "@gnd/observability/reliability";
import { Prisma } from "@prisma/client";
import type { Database } from "../index";

const severityOrder: Record<ReliabilitySeverity, number> = {
	P0: 0,
	P1: 1,
	P2: 2,
	INFO: 3,
};

function deliveryKey(
	incidentId: string,
	destination: string,
	revision: number,
) {
	return createHash("sha256")
		.update(JSON.stringify([incidentId, destination, "UPSERT", revision]))
		.digest("hex");
}

export async function ingestReliabilityOccurrence(
	db: Database,
	intake: PreparedIncidentIntake,
) {
	for (let attempt = 0; ; attempt++) {
		try {
			return await db.$transaction(
				async (tx) => {
					const duplicate = await tx.reliabilityOccurrence.findUnique({
						where: { occurrenceKey: intake.occurrence.key },
						include: { incident: true },
					});
					if (duplicate) {
						if (duplicate.incident.problemKey !== intake.incident.problemKey)
							throw new Error("Reliability occurrence identity conflict");
						return { incident: duplicate.incident, duplicate: true };
					}
					const existing = await tx.reliabilityIncident.findUnique({
						where: { problemKey: intake.incident.problemKey },
					});
					const occurredAt = new Date(intake.occurrence.occurredAt);
					const severity =
						existing &&
						existing.severity in severityOrder &&
						severityOrder[existing.severity as ReliabilitySeverity] <
							severityOrder[intake.incident.severity]
							? existing.severity
							: intake.incident.severity;
					const regressed =
						existing?.resolvedAt &&
						occurredAt > existing.resolvedAt &&
						intake.incident.severity !== "INFO";
					const newlyActionable =
						existing?.status === "NOT_ACTIONABLE" &&
						intake.incident.severity !== "INFO";
					const status = regressed
						? "REGRESSED"
						: newlyActionable
							? intake.incident.status
							: (existing?.status ?? intake.incident.status);
					const incident = existing
						? await tx.reliabilityIncident.update({
								where: { id: existing.id },
								data: {
									severity,
									status,
									revision: { increment: 1 },
									occurrenceCount: { increment: 1 },
									firstSeenAt:
										occurredAt < existing.firstSeenAt
											? occurredAt
											: existing.firstSeenAt,
									lastSeenAt:
										occurredAt > existing.lastSeenAt
											? occurredAt
											: existing.lastSeenAt,
									...(regressed ? { resolvedAt: null } : {}),
								},
							})
						: await tx.reliabilityIncident.create({
								data: {
									...intake.incident,
									firstSeenAt: occurredAt,
									lastSeenAt: occurredAt,
								},
							});
					await tx.reliabilityOccurrence.create({
						data: {
							occurrenceKey: intake.occurrence.key,
							incidentId: incident.id,
							provider: intake.occurrence.provider,
							account: intake.occurrence.account,
							project: intake.occurrence.project,
							environment: intake.occurrence.environment,
							providerEventId: intake.occurrence.eventId,
							providerGroupId: intake.occurrence.groupId,
							operation: intake.occurrence.operation,
							impact: intake.occurrence.impact,
							evidence: intake.occurrence.evidence,
							occurredAt,
						},
					});
					if (!existing || existing.status !== incident.status) {
						await tx.reliabilityTransition.create({
							data: {
								actionKey: createHash("sha256")
									.update(`intake:${intake.occurrence.key}`)
									.digest("hex"),
								incidentId: incident.id,
								actor: "system:ingestion",
								action: regressed ? "REGRESS" : "DETECT",
								fromStatus: existing?.status,
								toStatus: incident.status,
								revision: incident.revision,
							},
						});
					}
					if (incident.severity !== "INFO" && incident.status !== "RESOLVED") {
						await tx.reliabilityDelivery.createMany({
							data: ["GITHUB", "SLACK"].map((destination) => ({
								actionKey: deliveryKey(
									incident.id,
									destination,
									incident.revision,
								),
								incidentId: incident.id,
								destination,
								action: "UPSERT",
								revision: incident.revision,
							})),
						});
					}
					return { incident, duplicate: false };
				},
				{
					isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
					timeout: 10_000,
				},
			);
		} catch (error) {
			if (
				attempt >= 4 ||
				!(error instanceof Prisma.PrismaClientKnownRequestError) ||
				!["P2002", "P2034"].includes(error.code)
			)
				throw error;
			await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
		}
	}
}

export function getReliabilityIncident(db: Database, problemKey: string) {
	return db.reliabilityIncident.findUnique({
		where: { problemKey },
		include: {
			occurrences: {
				orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
				take: 100,
			},
			deliveries: {
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 100,
			},
			transitions: { orderBy: { revision: "desc" }, take: 100 },
		},
	});
}
