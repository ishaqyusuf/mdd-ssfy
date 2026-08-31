import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const assignmentRowSource = readFileSync(
	new URL("./production-assignment-row.tsx", import.meta.url),
	"utf8",
);
const submissionsSource = readFileSync(
	new URL("./production-submissions.tsx", import.meta.url),
	"utf8",
);

describe("production assignment document layout", () => {
	it("top-aligns assignment facts with a reserved action rail", () => {
		assert.match(
			assignmentRowSource,
			/grid min-w-0 flex-1 grid-cols-1 items-start gap-3 pr-28/,
		);
	});

	it("aligns submission rows to the shared compact action gutter", () => {
		assert.match(submissionsSource, /md:items-center md:pr-8/);
		assert.match(submissionsSource, /className="size-8 shrink-0"/);
	});
});
