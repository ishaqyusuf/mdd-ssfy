import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Sales Request AI interpretation warning management", () => {
	test("groups warnings, reports counts, and wires both guidance states", () => {
		const source = readFileSync(
			new URL(
				"./sales-request-interpretation-warnings-section.tsx",
				import.meta.url,
			),
			"utf8",
		);

		expect(source).toContain(
			"salesRequest.listInterpretationWarnings.queryOptions()",
		);
		expect(source).toContain(
			"salesRequest.setInterpretationWarningGuidanceByKey.mutationOptions",
		);
		expect(source).toContain("query.data.categories.map");
		expect(source).toContain("Total occurrences");
		expect(source).toContain("Unique warnings");
		expect(source).toContain("Used as instructions");
		expect(source).toContain("Don’t show again");
		expect(source).toContain("Show warning again");
		expect(source).toContain("active: !warning.doNotShow");
	});
});
