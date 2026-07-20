import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { addMoney } from "@gnd/sales/payment-system/money";

const appSourceRoot = resolve(import.meta.dir, "../../..");
const browserSalesFormRoots = [
	join(appSourceRoot, "components/forms/new-sales-form"),
	join(appSourceRoot, "components/forms/sales-form"),
];
const forbiddenImportPattern =
	/from\s+["']@gnd\/sales\/payment-system["']/g;
const sourceExtensions = new Set([".ts", ".tsx"]);

describe("sales payment browser boundary", () => {
	it("exposes canonical money helpers without evaluating server infrastructure", () => {
		expect(addMoney(10.01, 0.02)).toBe(10.03);
	});

	it("keeps the broad server payment barrel out of browser sales forms", () => {
		const violations = browserSalesFormRoots.flatMap((sourceRoot) =>
			collectSourceFiles(sourceRoot).flatMap((filePath) => {
				const source = readFileSync(filePath, "utf8");
				const imports = source.match(forbiddenImportPattern) ?? [];

				return imports.map(() => relative(appSourceRoot, filePath));
			}),
		);

		expect(violations).toEqual([]);
	});
});

function collectSourceFiles(directory: string): string[] {
	if (!existsSync(directory)) return [];

	return readdirSync(directory).flatMap((entry) => {
		const entryPath = join(directory, entry);
		const stats = statSync(entryPath);

		if (stats.isDirectory()) return collectSourceFiles(entryPath);
		if (!stats.isFile() || !sourceExtensions.has(extname(entryPath))) return [];

		return [entryPath];
	});
}
