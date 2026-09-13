import { describe, expect, test } from "bun:test";
import { benchmarkAssistantToolSelection } from "./selection-benchmark";

describe("assistant tool selection benchmark", () => {
	test("compares semantic ranking with the deterministic baseline", async () => {
		const result = await benchmarkAssistantToolSelection();

		expect(result.total).toBe(24);
		expect(result.fixture).toEqual({
			model: "Apple NaturalLanguage English sentence embedding",
			dimension: 512,
		});
		expect(result.semantic.top3).toBeGreaterThanOrEqual(0.4);
		expect(result.deterministic.top3).toBeGreaterThanOrEqual(0.6);
		expect(result.decision).toBe("keep_embeddings_optional");
		expect(result.semantic.latencyMs).toBeGreaterThanOrEqual(0);
		expect(result.misses.length).toBeGreaterThan(0);
	});
});
