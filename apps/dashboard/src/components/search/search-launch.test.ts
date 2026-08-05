import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const searchSource = readFileSync(
	new URL("./search.tsx", import.meta.url),
	"utf8",
);
const salesNavSource = readFileSync(
	new URL("../sales-nav.tsx", import.meta.url),
	"utf8",
);
const salesRepWorkspaceSource = readFileSync(
	new URL("../sales-rep-dashboard/workspace.tsx", import.meta.url),
	"utf8",
);

describe("Find Anything sales creation handoff", () => {
	it("opens Find Anything from the shared sales header only", () => {
		expect(salesNavSource).toContain('openSearch("sales-create")');
		expect(salesRepWorkspaceSource).not.toContain('openSearch("sales-create")');
		expect(salesNavSource).not.toContain("href={item.href}");
		expect(salesRepWorkspaceSource).toContain(
			'href="/sales-form/create-order"',
		);
		expect(salesRepWorkspaceSource).toContain(
			'href="/sales-form/create-quote"',
		);
	});

	it("shows contextual coaching only for the sales-create launch", () => {
		expect(searchSource).toContain('launchSource === "sales-create"');
		expect(searchSource).toContain(
			"Use Find Anything to start a new sale or quote.",
		);
	});
});
