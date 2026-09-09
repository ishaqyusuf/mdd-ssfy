import { expect, test } from "bun:test";
import { renderReliabilityEvidenceDraft } from "./evidence-draft";
import { prepareReliabilityEvidencePacket } from "./evidence-packet";

test("renders an urgent investigation draft without inventing root cause or impact", () => {
	const packet = prepareReliabilityEvidencePacket({
		incidentId: "incident-1",
		serviceId: "gnd",
		owner: "ops",
		revision: 1,
		severity: "P0",
		firstSeenAt: new Date(0),
		lastSeenAt: new Date(0),
		counts: { eventCount: 4, sampleComplete: false, samples: [] },
	});
	const draft = renderReliabilityEvidenceDraft(packet);
	expect(draft.title).toBe("[P0] gnd: investigate incident-1");
	expect(draft.evidence).toContain("Recorded events: 4");
	expect(draft.evidence).toContain("Distinct users: unknown");
	expect(draft.evidence).toContain("Root cause: not established");
	expect(draft.evidence).toContain("Provider query coverage: unknown");
	expect(draft.evidence.length).toBeLessThanOrEqual(20_000);
});

test("keeps informational incidents out of ticket draft generation", () => {
	const packet = prepareReliabilityEvidencePacket({
		incidentId: "incident-1",
		serviceId: "gnd",
		owner: "ops",
		revision: 1,
		severity: "INFO",
		firstSeenAt: new Date(0),
		lastSeenAt: new Date(0),
		counts: { eventCount: 1, sampleComplete: false, samples: [] },
	});
	expect(() => renderReliabilityEvidenceDraft(packet)).toThrow();
});
