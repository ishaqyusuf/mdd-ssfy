// @ts-nocheck -- Bun's matcher declarations are not part of the dashboard tsc environment.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("sales inventory attention dialog", () => {
	it("closes on outside pointer input only while resolution is idle", () => {
		const source = readFileSync(
			resolve(import.meta.dir, "sales-menu.tsx"),
			"utf8",
		);
		const dialogStart = source.indexOf("const dialog = (");
		const dialogEnd = source.indexOf("if (!asSubmenu)", dialogStart);
		const dialog = source.slice(dialogStart, dialogEnd);

		expect(dialog).toContain("overlayProps={{");
		expect(dialog).toContain("onPointerDown: () => {");
		expect(dialog).toContain(
			"if (!isResolvingInventory) setInventoryPreflight(null)",
		);
		expect(dialog).toContain("disabled={isResolvingInventory}");
	});
});
