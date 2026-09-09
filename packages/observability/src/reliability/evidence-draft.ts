import type { prepareReliabilityEvidencePacket } from "./evidence-packet";
import type { prepareReliabilityEvidenceReferences } from "./evidence-references";

type Packet = ReturnType<typeof prepareReliabilityEvidencePacket> & {
	evidenceReferences?: ReturnType<typeof prepareReliabilityEvidenceReferences>;
};

/** Render trusted, reconstructed baseline packets; this does not authorize a send. */
export function renderReliabilityEvidenceDraft(packet: Packet) {
	if (packet.severity === "INFO")
		throw new Error("Informational incident has no ticket draft");
	const count = (value: Packet["counts"]["users"]) =>
		value.value === null
			? "unknown"
			: `${value.precision === "lower_bound" ? "at least " : ""}${value.value}`;
	// Encode markup and mentions even if future intake rules allow broader identifiers.
	const safe = (value: string) =>
		value.replace(
			/[&<>`*_\[\]@]/g,
			(character) => `&#${character.charCodeAt(0)};`,
		);
	const lines = [
		`Incident: ${safe(packet.incidentId)} (revision ${packet.revision})`,
		`Service: ${safe(packet.serviceId)} / production`,
		`Owner: ${safe(packet.owner)}`,
		`Severity: ${packet.severity}`,
		`First seen: ${packet.firstSeenAt}; last seen: ${packet.lastSeenAt}`,
		"",
		"## Recorded evidence",
		"",
		`Recorded events: ${packet.counts.events.value}`,
		`Sampled events: ${packet.counts.sampledEvents}`,
		`Distinct operations: ${count(packet.counts.operations)}`,
		`Distinct users: ${count(packet.counts.users)}`,
		"Provider query coverage: unknown",
		"",
		"## Investigation",
		"",
		"Root cause: not established. Confidence: unknown.",
		"Impact requires verification against the recorded provider evidence.",
		"Affected release and related work: not established.",
		"Next action: review provider evidence and establish impact before proposing a fix.",
		"Reproduction fixture and acceptance criteria: pending investigation.",
		"",
		"## Provider references",
		"",
	];
	const references = packet.evidenceReferences ?? [];
	for (const reference of references.slice(0, 10)) {
		lines.push(
			`- ${safe(reference.provider)} ${safe(reference.account)}/${safe(reference.project)}: event ${safe(reference.eventId)}, group ${safe(reference.groupId)}, operation ${safe(reference.operation)}, recorded impact ${safe(reference.impact)} at ${reference.occurredAt}`,
		);
	}
	if (!references.length)
		lines.push("Provider references have not been collected.");
	if (references.length > 10)
		lines.push(
			`${references.length - 10} additional sampled references are retained in the packet.`,
		);
	lines.push(
		"",
		"Analysis: deterministic-v1; no model calls or diagnostic queries performed.",
		"Draft requires review; this document does not approve publication or resolution.",
	);
	const title = `[${packet.severity}] ${packet.serviceId}: investigate ${packet.incidentId}`;
	const evidence = lines.join("\n");
	if (title.length > 240 || evidence.length > 20_000)
		throw new Error("Evidence draft exceeds publication budget");
	return { title, evidence };
}
