import { describe, expect, test } from "bun:test";
import { getAssistantSuggestions } from "./suggestions";

describe("assistant suggestions", () => {
	test("adapts suggestions to the actor's grants", () => {
		expect(getAssistantSuggestions({ editOrders: true })).toHaveLength(4);
		expect(getAssistantSuggestions({})).toEqual([]);
	});
});
