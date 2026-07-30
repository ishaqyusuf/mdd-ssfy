import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { RECENT_SALES_QUERY_INPUT } from "./recent-sales-query";

const root = dirname(fileURLToPath(import.meta.url));

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Recent Sales dashboard list", () => {
	it("keeps the recent-order query bounded, explicitly sorted, and sales-rep scoped", () => {
		expect(RECENT_SALES_QUERY_INPUT).toEqual({
			size: 5,
			showing: null,
			sort: ["createdAt.desc"],
		});
	});

	it("uses a semantic responsive list without table-only interaction mechanics", () => {
		const source = readSource("recent-sales-list.tsx");

		expect(source.includes("<section")).toBe(true);
		expect(source.includes("<ul")).toBe(true);
		expect(source.includes("<li")).toBe(true);
		expect(source.includes('type="button"')).toBe(true);
		expect(source.includes("aria-label={`Open order")).toBe(true);
		expect(source.includes("grid-cols-[minmax(0,1fr)_auto]")).toBe(true);
		expect(source.includes("overflow-auto")).toBe(false);
		expect(source.includes("useVirtualizer")).toBe(false);
		expect(source.includes("DndContext")).toBe(false);
		expect(source.includes("Checkbox")).toBe(false);
	});

	it("keeps mutations and workspace actions out of the summary surface", () => {
		const source = readSource("recent-sales-list.tsx");

		expect(source.includes("SalesMenu")).toBe(false);
		expect(source.includes("useMutation")).toBe(false);
		expect(source.includes("/sales-book/orders")).toBe(true);
		expect(source.includes("/sales-form/create-order")).toBe(true);
	});
});
