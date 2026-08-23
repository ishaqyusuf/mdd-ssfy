import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";

describe("batch sales completion packing-report hold", () => {
	it("uses the fail-closed lock and hold before the completion writer", async () => {
		const source = await readFile(
			new URL("./sales-mark-as-completed-domain.ts", import.meta.url),
			"utf8",
		);
		expect(source.includes("lockAndAssertNoPendingPackingReports")).toBe(true);
		expect(
			source.indexOf("lockAndAssertNoPendingPackingReports") <
				source.lastIndexOf("tx.qtyControl.updateMany"),
		).toBe(true);
		expect(source.includes('isolationLevel: "Serializable"')).toBe(true);
	});
});
