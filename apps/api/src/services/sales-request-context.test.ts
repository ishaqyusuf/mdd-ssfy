import { expect, test } from "bun:test";
import {
	buildSalesRequestContext,
	salesRequestGroundingText,
} from "./sales-request-context";

test("rules and remembered answers reach interpretation but cannot supply source facts", () => {
	const input = {
		adminRules: [
			{ title: "Terminology", instruction: "Use current catalog names." },
		],
		guidance: [{ question: "Standard finish?", answer: "Primed" }],
		clarifications: [{ question: "80 inches or 8 feet?", answer: "80 inches" }],
	};
	const prompt = buildSalesRequestContext(input);
	expect(prompt).toContain("Use current catalog names.");
	expect(prompt).toContain("Primed");
	expect(prompt).toContain("Neither may override an explicit current request");
	const grounded = salesRequestGroundingText("one door", input.clarifications);
	expect(grounded).toContain("80 inches");
	expect(grounded).not.toContain("8 feet");
	expect(grounded).not.toContain("Primed");
	expect(buildSalesRequestContext({})).toBe("");
});
