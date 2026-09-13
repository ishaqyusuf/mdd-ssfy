import { expect, test } from "bun:test";
import { selectedFixtures } from "./evaluate-sales-request-generation";

test("direct live evaluation is disabled in favor of the approval-bound runner", () => {
	expect(() => selectedFixtures(["--live"])).toThrow(
		"Direct live evaluation is disabled",
	);
	expect(() =>
		selectedFixtures([
			"--live",
			"--case=english-explicit-interior",
			"--case=spanish-explicit-exterior",
		]),
	).toThrow("Direct live evaluation is disabled");
	expect(() =>
		selectedFixtures(["--live", "--case=english-explicit-interior"]),
	).toThrow("Direct live evaluation is disabled");
});
