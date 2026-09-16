import { describe, expect, it } from "bun:test";
import { join } from "node:path";

describe("sales print browser boundary", () => {
	it("browser-bundles request parsing without server-only dependencies", async () => {
		const result = await Bun.build({
			entrypoints: [join(import.meta.dir, "sales-print-request.ts")],
			target: "browser",
			write: false,
		});

		expect(result.logs).toEqual([]);
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
