import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const assignmentsSource = readFileSync(
	new URL("./production-assignments.tsx", import.meta.url),
	"utf8",
);
const submitFormSource = readFileSync(
	new URL("./production-submit-form.tsx", import.meta.url),
	"utf8",
);
const assignmentRowSource = readFileSync(
	new URL("./production-assignment-row.tsx", import.meta.url),
	"utf8",
);

describe("production assignment live refresh", () => {
	test("reloads assignment records after a successful submission", () => {
		expect(assignmentsSource).toContain("refreshAssignments");
		expect(assignmentsSource).toMatch(
			/\[item\.controlUid, assignmentRevision\]/,
		);
		expect(assignmentRowSource).toContain(
			"refreshAssignments: ctx.refreshAssignments",
		);
		expect(submitFormSource).toContain("ctx.refreshAssignments()");
	});
});
