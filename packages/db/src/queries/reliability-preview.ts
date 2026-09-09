import { createHash } from "node:crypto";
import { renderReliabilityEvidenceDraft } from "@gnd/observability/reliability";
import type { Database } from "../index";
import type { ReliabilityPrincipal } from "./reliability-actions";
import { getReliabilityEvidencePacket } from "./reliability-evidence";

/** Principal membership must come from the authenticated adapter, never request JSON. */
export async function previewReliabilityIncident(
	db: Database,
	input: { incidentId: string; serviceId: string; revision: number },
	principal: ReliabilityPrincipal,
) {
	if (!principal.actorId || !principal.serviceIds.includes(input.serviceId)) {
		return { status: "forbidden" as const };
	}
	const packet = await getReliabilityEvidencePacket(db, input);
	if (!packet) return { status: "not_available" as const };
	if (packet.severity === "INFO") return { status: "informational" as const };
	const draft = renderReliabilityEvidenceDraft(packet);
	const digest = createHash("sha256")
		.update(
			JSON.stringify([
				"reliability-draft-v1",
				packet.incidentId,
				packet.serviceId,
				packet.revision,
				draft.title,
				draft.evidence,
			]),
		)
		.digest("hex");
	return {
		status: "preview" as const,
		incidentId: packet.incidentId,
		serviceId: packet.serviceId,
		revision: packet.revision,
		digest,
		...draft,
	};
}
