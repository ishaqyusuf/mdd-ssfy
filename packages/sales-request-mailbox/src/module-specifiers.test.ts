import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("Sales Request mailbox module specifiers", () => {
	test("keeps internal TypeScript imports extensionless", () => {
		const sourceRoot = import.meta.dir;
		const forbiddenSuffix = [".", "j", "s"].join("");
		const violations: string[] = [];

		for (const relativePath of new Bun.Glob("**/*.ts").scanSync({
			cwd: sourceRoot,
		})) {
			const source = readFileSync(`${sourceRoot}/${relativePath}`, "utf8");
			const internalSpecifier = new RegExp(
				`(?:from\\s+|import\\s*)["']\\.{1,2}/[^"']*${forbiddenSuffix}["']`,
				"g",
			);

			if (internalSpecifier.test(source)) {
				violations.push(relativePath);
			}
		}

		expect(violations).toEqual([]);
	});
});
