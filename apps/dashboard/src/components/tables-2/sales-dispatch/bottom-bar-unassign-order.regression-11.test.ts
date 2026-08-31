import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./bottom-bar.tsx", import.meta.url),
	"utf8",
);

describe("bulk driver assignment menu ordering", () => {
	test("places Unassign driver before named drivers", () => {
		const menu = source.slice(
			source.indexOf("function BulkAssign"),
			source.indexOf("function BulkCancel"),
		);
		expect(menu.indexOf("Unassign driver")).toBeLessThan(
			menu.indexOf("drivers.map"),
		);
	});
});
