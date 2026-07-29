import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const inventoryTabSource = readFileSync(
	new URL("./sales-overview-system/tabs/inventory-tab.tsx", import.meta.url),
	"utf8",
);

describe("legacy sales inventory adaptation UI", () => {
	test("starts canonical continue automatically and keeps clear as recovery", () => {
		expect(inventoryTabSource).toContain('action: "continue"');
		expect(inventoryTabSource).toContain("legacyStatus,");
		expect(inventoryTabSource).toContain("useEffect");
		expect(inventoryTabSource).toContain("Retry migration");
		expect(inventoryTabSource).toContain(
			"Clear legacy status and configure from scratch",
		);
		expect(inventoryTabSource).not.toContain("Override and configure");
		expect(inventoryTabSource).not.toContain("Reset status and configure");
	});

	test("allows inbound creation with status alone", () => {
		expect(inventoryTabSource).toContain("Supplier (optional)");
		expect(inventoryTabSource).toContain(
			"supplierId: supplierId ? Number(supplierId) : null",
		);
		expect(inventoryTabSource).toContain("reference: reference.trim() || null");
		expect(inventoryTabSource).toContain("expectedAt: expectedAt ? new Date");
		expect(inventoryTabSource).not.toContain('title: "Select a supplier"');
	});
});
