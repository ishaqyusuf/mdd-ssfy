import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const packageRoot = resolve(import.meta.dir);
const entrypoint = join(packageRoot, "sales-form-core.ts");
const relativeImportPattern =
	/(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["'](\.[^"']+)["']/g;

describe("sales-form-core native safety", () => {
	it("does not pull web UI modules into the mobile-facing barrel", () => {
		const visited = new Set<string>();
		const violations: string[] = [];

		walk(entrypoint, visited, violations);

		expect(violations).toEqual([]);
	});
});

function walk(filePath: string, visited: Set<string>, violations: string[]) {
	const normalizedPath = normalize(filePath);
	if (visited.has(normalizedPath)) return;
	visited.add(normalizedPath);

	const source = readFileSync(normalizedPath, "utf8");
	const relativePath = relative(packageRoot, normalizedPath);
	if (normalizedPath.endsWith(".tsx")) {
		violations.push(`${relativePath}: TSX module reached from sales-form-core`);
	}
	if (source.includes("@gnd/ui")) {
		violations.push(`${relativePath}: imports @gnd/ui`);
	}

	for (const specifier of source.matchAll(relativeImportPattern)) {
		const target = resolveImport(normalizedPath, specifier[1]);
		if (!target) continue;
		walk(target, visited, violations);
	}
}

function resolveImport(fromFile: string, specifier: string) {
	const base = resolve(dirname(fromFile), specifier);
	const candidates = extname(base)
		? [base]
		: [
				`${base}.ts`,
				`${base}.tsx`,
				join(base, "index.ts"),
				join(base, "index.tsx"),
			];
	return candidates.find((candidate) => existsSync(candidate)) || null;
}
