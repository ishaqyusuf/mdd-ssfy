import {
	prepareReliabilityEvidencePacket,
	prepareReliabilityEvidenceReferences,
} from "@gnd/observability/reliability";
import { Prisma } from "@prisma/client";
import type { Database } from "../index";

/** Initialize a reviewable baseline without replacing any existing analysis. */
export async function initializeReliabilityEvidenceDraft(
	db: Database,
	input: { incidentId: string; serviceId: string; revision: number },
) {
	const packet = await getReliabilityEvidencePacket(db, input);
	if (!packet) return { status: "not_available" as const };
	const saved = await db.reliabilityIncident.updateMany({
		where: {
			id: input.incidentId,
			serviceId: input.serviceId,
			revision: input.revision,
			analysis: { equals: Prisma.DbNull },
		},
		data: { analysis: { schemaVersion: 1, state: "DRAFT", packet } },
	});
	return {
		status: saved.count === 1 ? ("saved" as const) : ("not_saved" as const),
	};
}

/** A consistent, service-scoped baseline. Reading a packet does not approve delivery. */
export function getReliabilityEvidencePacket(
	db: Database,
	input: { incidentId: string; serviceId: string; revision: number },
) {
	if (
		!input.incidentId ||
		!input.serviceId ||
		!Number.isSafeInteger(input.revision) ||
		input.revision < 1
	) {
		throw new Error("Invalid evidence snapshot request");
	}
	return db.$transaction(
		async (tx) => {
			const incident = await tx.reliabilityIncident.findFirst({
				where: {
					id: input.incidentId,
					serviceId: input.serviceId,
					revision: input.revision,
				},
				select: {
					id: true,
					serviceId: true,
					revision: true,
					owner: true,
					severity: true,
					firstSeenAt: true,
					lastSeenAt: true,
					occurrenceCount: true,
				},
			});
			if (!incident) return null;
			const severity = incident.severity;
			if (
				severity !== "P0" &&
				severity !== "P1" &&
				severity !== "P2" &&
				severity !== "INFO"
			) {
				throw new Error("Invalid stored incident severity");
			}
			const occurrences = await tx.reliabilityOccurrence.findMany({
				where: { incidentId: incident.id },
				orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
				take: 100,
				select: {
					occurrenceKey: true,
					provider: true,
					account: true,
					project: true,
					providerEventId: true,
					providerGroupId: true,
					operation: true,
					impact: true,
					occurredAt: true,
					evidence: true,
				},
			});
			const packet = prepareReliabilityEvidencePacket({
				incidentId: incident.id,
				serviceId: incident.serviceId,
				revision: incident.revision,
				owner: incident.owner,
				severity,
				firstSeenAt: incident.firstSeenAt,
				lastSeenAt: incident.lastSeenAt,
				counts: {
					eventCount: incident.occurrenceCount,
					sampleComplete: occurrences.length === incident.occurrenceCount,
					// Stored operation names are not distinct operation-instance identities.
					samples: occurrences.map((row) => ({
						eventId: row.occurrenceKey,
						operationId: null,
						userId: null,
					})),
				},
			});
			return {
				...packet,
				evidenceReferences: prepareReliabilityEvidenceReferences(occurrences),
			};
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
	);
}
