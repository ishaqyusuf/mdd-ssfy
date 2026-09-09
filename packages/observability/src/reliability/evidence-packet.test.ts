import { expect, test } from "bun:test";
import { prepareReliabilityEvidencePacket } from "./evidence-packet";

const input = {
	incidentId: "incident-1",
	revision: 2,
	serviceId: "gnd",
	owner: "operations",
	severity: "P0" as const,
	firstSeenAt: new Date("2026-09-09T10:00:00Z"),
	lastSeenAt: new Date("2026-09-09T10:05:00Z"),
	counts: { eventCount: 2, sampleComplete: false, samples: [] },
};

test("urgent fallback is versioned, deterministic and honest about unknown evidence", () => {
	const packet = prepareReliabilityEvidencePacket(input);
	expect(packet).toEqual(prepareReliabilityEvidencePacket(input));
	expect(packet.routing).toBe("urgent_investigation");
	expect(packet.analysis).toMatchObject({
		status: "needs-investigation",
		hypotheses: [],
		model: null,
		toolCalls: 0,
	});
	expect(packet.coverage).toBeNull();
	expect(packet.relatedWork).toEqual({ classification: "unknown", links: [] });
	expect(packet.counts.users.precision).toBe("unknown");
	expect(packet.revision).toBe(2);
});

test("informational evidence is not promoted to an actionable ticket", () => {
	expect(
		prepareReliabilityEvidencePacket({ ...input, severity: "INFO" }).routing,
	).toBe("informational");
	expect(
		prepareReliabilityEvidencePacket({ ...input, severity: "P2" }).routing,
	).toBe("investigation");
});

test("rejects inconsistent time, revisions and unsafe identifiers", () => {
	expect(() =>
		prepareReliabilityEvidencePacket({ ...input, revision: 0 }),
	).toThrow();
	expect(() =>
		prepareReliabilityEvidencePacket({ ...input, lastSeenAt: new Date(0) }),
	).toThrow();
	expect(() =>
		prepareReliabilityEvidencePacket({ ...input, owner: "<script>" }),
	).toThrow();
});
