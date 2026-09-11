import { expect, test } from "bun:test";
import { selectedFixtures } from "./evaluate-sales-request-generation";

test("live evaluation requires one explicit case", () => {
	expect(() => selectedFixtures(["--live"])).toThrow(
		"Live evaluation requires exactly one --case=<id>",
	);
	expect(() =>
		selectedFixtures([
			"--live",
			"--case=english-explicit-interior",
			"--case=spanish-explicit-exterior",
		]),
	).toThrow("Live evaluation requires exactly one --case=<id>");
	expect(
		selectedFixtures(["--live", "--case=english-explicit-interior"]),
	).toHaveLength(1);
});
