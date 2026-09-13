import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { buildInvoicePrintPageFromSalesFormSnapshot } from "@gnd/sales/print/snapshot-sections";

const sourceRoot = import.meta.dir;
const sourceExtensions = new Set([".ts", ".tsx"]);
const broadPrintImport = /from\s+["']@gnd\/sales\/print["']/g;

describe("new sales form print browser boundary", () => {
	it("exposes the in-memory snapshot composer through a client-safe leaf export", () => {
		expect(typeof buildInvoicePrintPageFromSalesFormSnapshot).toBe("function");
	});

	it("keeps the server-heavy print barrel out of the client form", () => {
		const violations = collectSourceFiles(sourceRoot).flatMap((filePath) => {
			const imports =
				readFileSync(filePath, "utf8").match(broadPrintImport) ?? [];

			return imports.map(() => relative(sourceRoot, filePath));
		});

		expect(violations).toEqual([]);
	});

	it("browser-bundles the preview without Prisma or database runtime", async () => {
		const result = await Bun.build({
			entrypoints: [join(sourceRoot, "request-generation-invoice-preview.ts")],
			target: "browser",
			write: false,
		});

		expect(result.success).toBe(true);
		expect(result.outputs).toHaveLength(1);

		const bundle = result.outputs[0];
		if (!bundle) throw new Error("Expected one browser bundle output");
		const output = await bundle.text();
		expect(output).not.toContain("PrismaClient");
		expect(output).not.toContain("@prisma/client");
		expect(output).not.toContain("packages/db/src");
	});
});

function collectSourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const entryPath = join(directory, entry);
		const stats = statSync(entryPath);

		if (stats.isDirectory()) return collectSourceFiles(entryPath);
		if (!stats.isFile() || !sourceExtensions.has(extname(entryPath))) return [];

		return [entryPath];
	});
}
