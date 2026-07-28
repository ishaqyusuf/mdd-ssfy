import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appSourceRoot = join(currentDir, "../../../");
const forbiddenSources = ["@gnd/" + "ui", "packages/" + "ui"];
const serverOnlyImportPatterns = [
	/\bfrom\s+["']@gnd\/sales\/payment-system["']/,
];
const skippedDirectories = new Set([
	".expo",
	".turbo",
	"coverage",
	"dist",
	"node_modules",
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

const extensionOf = (filePath: string) => {
	const name = filePath.toLowerCase();
	const match = name.match(/\.[cm]?[tj]sx?$/);

	return match?.[0].replace(".c", ".").replace(".m", ".") ?? "";
};

const collectSourceFiles = (dir: string): string[] => {
	if (!existsSync(dir)) {
		return [];
	}

	return readdirSync(dir).flatMap((entry) => {
		if (skippedDirectories.has(entry)) {
			return [];
		}

		const entryPath = join(dir, entry);
		const stats = statSync(entryPath);

		if (stats.isDirectory()) {
			return collectSourceFiles(entryPath);
		}

		if (!stats.isFile() || !sourceExtensions.has(extensionOf(entryPath))) {
			return [];
		}

		return [entryPath];
	});
};

describe("mobile invoice form native UI boundary", () => {
	it("keeps Expo source free of the web UI package", () => {
		expect(existsSync(join(appSourceRoot, "app"))).toBe(true);
		expect(existsSync(join(appSourceRoot, "features"))).toBe(true);

		const violations = collectSourceFiles(appSourceRoot).flatMap((filePath) => {
			const source = readFileSync(filePath, "utf8");

			return forbiddenSources
				.filter((forbiddenSource) => source.includes(forbiddenSource))
				.map((forbiddenSource) => ({
					forbiddenSource,
					file: relative(appSourceRoot, filePath),
				}));
		});

		expect(violations).toEqual([]);
	});

	it("keeps Expo source off server-only package barrels", () => {
		const violations = collectSourceFiles(appSourceRoot).flatMap((filePath) => {
			const source = readFileSync(filePath, "utf8");

			return serverOnlyImportPatterns
				.filter((pattern) => pattern.test(source))
				.map((pattern) => ({
					forbiddenImport: pattern.source,
					file: relative(appSourceRoot, filePath),
				}));
		});

		expect(violations).toEqual([]);
	});
});
