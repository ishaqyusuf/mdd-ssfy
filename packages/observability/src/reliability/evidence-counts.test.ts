import { expect, test } from "bun:test";
import { summarizeReliabilityEvidenceCounts } from "./evidence-counts";

test("deduplicates sampled identities and marks partial coverage as lower bounds", () => {
	const counts = summarizeReliabilityEvidenceCounts({
		eventCount: 12,
		sampleComplete: false,
		samples: [
			{ eventId: "a", operationId: "op1", userId: null },
			{ eventId: "a", operationId: "op1", userId: null },
			{ eventId: "b", operationId: "op1", userId: "u1" },
		],
	});
	expect(counts.events).toEqual({ value: 12, precision: "recorded" });
	expect(counts.sampledEvents).toBe(2);
	expect(counts.operations).toEqual({ value: 1, precision: "lower_bound" });
	expect(counts.users).toEqual({ value: 1, precision: "lower_bound" });
	expect(JSON.stringify(counts)).not.toContain("u1");
});

test("exact distinct counts require complete coverage and known identities", () => {
	expect(
		summarizeReliabilityEvidenceCounts({
			eventCount: 1,
			sampleComplete: true,
			samples: [{ eventId: "a", operationId: "op1", userId: null }],
		}),
	).toMatchObject({
		operations: { value: 1, precision: "exact" },
		users: { value: null, precision: "unknown" },
	});
	expect(() =>
		summarizeReliabilityEvidenceCounts({
			eventCount: 2,
			sampleComplete: true,
			samples: [],
		}),
	).toThrow();
});

test("rejects conflicting repeated evidence and invalid totals", () => {
	expect(() =>
		summarizeReliabilityEvidenceCounts({
			eventCount: 1,
			sampleComplete: false,
			samples: [
				{ eventId: "a", operationId: "one", userId: null },
				{ eventId: "a", operationId: "two", userId: null },
			],
		}),
	).toThrow();
	expect(() =>
		summarizeReliabilityEvidenceCounts({
			eventCount: -1,
			sampleComplete: false,
			samples: [],
		}),
	).toThrow();
});
