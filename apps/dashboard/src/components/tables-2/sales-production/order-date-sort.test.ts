import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const columns = readFileSync(new URL("./columns.tsx", import.meta.url), "utf8");
const header = readFileSync(
	new URL("./table-header.tsx", import.meta.url),
	"utf8",
);

describe("Sales Production Order Date sorting", () => {
	it("cycles the visible Order Date header through newest and oldest server sorts", () => {
		expect(columns).toContain('sortField: "orderDate"');
		expect(header).toContain('filters.sort === "newest"');
		expect(header).toContain('filters.sort === "oldest"');
		expect(header).toContain('field === "orderDate"');
	});
});
