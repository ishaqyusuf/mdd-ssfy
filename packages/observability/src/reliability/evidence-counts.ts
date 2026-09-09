type Sample = {
	/** Canonical scoped occurrence identity, not an unscoped provider event ID. */
	eventId: string;
	/** Correlation identity of an operation instance, not its operation name. */
	operationId: string | null;
	/** Use an opaque scoped identity; this function never returns identities. */
	userId: string | null;
};

type DistinctCount = {
	value: number | null;
	precision: "exact" | "lower_bound" | "unknown";
};

/** Counts describe ledger evidence, not the completeness of provider ingestion. */
export function summarizeReliabilityEvidenceCounts(input: {
	eventCount: number;
	sampleComplete: boolean;
	samples: readonly Sample[];
}) {
	if (
		!Number.isSafeInteger(input.eventCount) ||
		input.eventCount < 0 ||
		typeof input.sampleComplete !== "boolean" ||
		input.samples.length > 1000
	)
		throw new Error("Invalid reliability evidence counts");
	const events = new Map<string, Sample>();
	for (const sample of input.samples) {
		for (const value of [sample.eventId, sample.operationId, sample.userId]) {
			if (
				value !== null &&
				(typeof value !== "string" || value.length === 0 || value.length > 512)
			) {
				throw new Error("Invalid reliability evidence identity");
			}
		}
		if (sample.eventId === null) throw new Error("Missing evidence identity");
		const previous = events.get(sample.eventId);
		if (
			previous &&
			(previous.operationId !== sample.operationId ||
				previous.userId !== sample.userId)
		) {
			throw new Error("Conflicting reliability evidence identity");
		}
		events.set(sample.eventId, sample);
	}
	if (
		events.size > input.eventCount ||
		(input.sampleComplete && events.size !== input.eventCount)
	) {
		throw new Error("Inconsistent reliability evidence coverage");
	}
	function distinct(field: "operationId" | "userId"): DistinctCount {
		const identities = new Set<string>();
		let missing = false;
		for (const sample of events.values()) {
			const value = sample[field];
			if (value === null) missing = true;
			else identities.add(value);
		}
		if (input.sampleComplete && !missing) {
			return { value: identities.size, precision: "exact" };
		}
		return identities.size > 0
			? { value: identities.size, precision: "lower_bound" }
			: { value: null, precision: "unknown" };
	}
	return {
		events: { value: input.eventCount, precision: "recorded" as const },
		sampledEvents: events.size,
		operations: distinct("operationId"),
		users: distinct("userId"),
	};
}
