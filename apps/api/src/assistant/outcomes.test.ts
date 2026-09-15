import { expect, test } from "bun:test";
import { assistantOutcomeFromEnvelope, mergeAssistantOutcome, presentAssistantOutcome } from "./outcomes";

test("multiple candidates ask for a choice while missing input and no match remain distinct", () => {
	expect(assistantOutcomeFromEnvelope({ status: "requires_input", data: { candidates: [{ id: "order" }, { id: "quote" }] } })).toBe("ambiguous");
	expect(assistantOutcomeFromEnvelope({ status: "requires_input", data: { candidates: [] } })).toBe("input");
	expect(assistantOutcomeFromEnvelope({ status: "unavailable", data: { candidates: [] } })).toBe("empty");
	expect(presentAssistantOutcome({ kind: "ambiguous" })).toEqual({ message: "I found more than one match. Which one do you mean?", action: null });
	expect(mergeAssistantOutcome({ kind: "denied" }, { kind: "ambiguous" })).toEqual({ kind: "denied" });
	expect(mergeAssistantOutcome({ kind: "uncertain" }, { kind: "ambiguous" })).toEqual({ kind: "uncertain" });
});
