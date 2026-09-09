import { summarizeReliabilityEvidenceCounts } from "./evidence-counts";
import type { ReliabilitySeverity } from "./intake";

/** Deterministic baseline only: enrichment and publication authorization are separate. */
export function prepareReliabilityEvidencePacket(input: {
	incidentId: string;
	revision: number;
	serviceId: string;
	owner: string;
	severity: ReliabilitySeverity;
	firstSeenAt: Date;
	lastSeenAt: Date;
	counts: Parameters<typeof summarizeReliabilityEvidenceCounts>[0];
}) {
	for (const value of [input.incidentId, input.serviceId, input.owner]) {
		if (
			typeof value !== "string" ||
			!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/.test(value)
		) {
			throw new Error("Invalid evidence packet identity");
		}
	}
	if (
		!Number.isSafeInteger(input.revision) ||
		input.revision < 1 ||
		!["P0", "P1", "P2", "INFO"].includes(input.severity) ||
		!Number.isFinite(input.firstSeenAt.getTime()) ||
		!Number.isFinite(input.lastSeenAt.getTime()) ||
		input.lastSeenAt < input.firstSeenAt
	) {
		throw new Error("Invalid evidence packet snapshot");
	}
	return {
		schemaVersion: 1 as const,
		incidentId: input.incidentId,
		revision: input.revision,
		serviceId: input.serviceId,
		owner: input.owner,
		environment: "production" as const,
		severity: input.severity,
		routing:
			input.severity === "INFO"
				? ("informational" as const)
				: input.severity === "P0" || input.severity === "P1"
					? ("urgent_investigation" as const)
					: ("investigation" as const),
		firstSeenAt: input.firstSeenAt.toISOString(),
		lastSeenAt: input.lastSeenAt.toISOString(),
		counts: summarizeReliabilityEvidenceCounts(input.counts),
		// Observation timestamps do not prove a successful provider query window.
		coverage: null,
		observedBehavior: null,
		impact: null,
		providerLinks: [],
		release: null,
		sourceLocations: [],
		relatedWork: { classification: "unknown" as const, links: [] },
		analysis: {
			version: "deterministic-v1",
			status: "needs-investigation" as const,
			confidence: "unknown" as const,
			hypotheses: [],
			model: null,
			toolCalls: 0,
			cost: 0,
			missingInformation: [
				"Observed behavior and impact",
				"Provider links and query coverage",
				"Affected release and source locations",
				"Related work and prior fixes",
				"Evidence-backed hypotheses",
				"Reproduction fixture and acceptance criteria",
			],
		},
		nextAction:
			"Review provider evidence and establish impact before proposing a fix.",
		fixtureStrategy: null,
		acceptanceCriteria: [],
	};
}
