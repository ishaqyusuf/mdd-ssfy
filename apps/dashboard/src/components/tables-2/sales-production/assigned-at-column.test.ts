import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const columns = readFileSync(new URL("./columns.tsx", import.meta.url), "utf8");
const header = readFileSync(
	new URL("./table-header.tsx", import.meta.url),
	"utf8",
);

describe("Sales Production Assigned At column", () => {
	it("renders the assignment timestamp through the sortable server contract", () => {
		expect(columns).toContain('id: "assignedAt"');
		expect(columns).toContain('header: "Assigned At"');
		expect(columns).toContain('sortField: "assignedAt"');
		expect(header).toContain('filters.sort === "assigned-desc"');
		expect(header).toContain('filters.sort === "assigned-asc"');
	});
});
