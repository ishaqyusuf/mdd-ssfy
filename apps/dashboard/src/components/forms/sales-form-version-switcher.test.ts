import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("sales form version switcher", () => {
	const source = readFileSync(
		new URL("./sales-form-version-switcher.tsx", import.meta.url),
		"utf8",
	);

	it("warns about unsaved work before switching in either direction", () => {
		expect(source.includes("<AlertDialog")).toBe(true);
		expect(source.includes("Save before switching forms")).toBe(true);
		expect(source.includes("Unsaved changes do not transfer")).toBe(true);
		expect(source.includes("confirmSwitch")).toBe(true);
		expect(source.includes("<Link")).toBe(false);
	});

	it("places and styles each switch action according to its destination", () => {
		expect(source.includes("<Portal")).toBe(false);
		expect(source.includes('variant="destructive"')).toBe(true);
		expect(source.includes("bg-emerald-600")).toBe(true);
	});

	it("uses compact, padded confirmation actions", () => {
		expect(source.includes("sm:max-w-md")).toBe(true);
		expect(source.includes("Switch anyway")).toBe(true);
		expect(source.includes('className="px-4"')).toBe(true);
	});

	it("is mounted before each form's primary controls", () => {
		const newHeaderSource = readFileSync(
			new URL(
				"../../../../../packages/sales/src/sales-form/ui/header-actions.tsx",
				import.meta.url,
			),
			"utf8",
		);
		const legacyFormSource = readFileSync(
			new URL("./sales-form/sales-form.tsx", import.meta.url),
			"utf8",
		);

		expect(
			newHeaderSource.indexOf("{props.versionSwitcherSlot}") <
				newHeaderSource.indexOf("{canOpenOverview ?"),
		).toBe(true);
		expect(
			legacyFormSource.indexOf("{versionSwitcher}") <
				legacyFormSource.indexOf("<TakeoffSwitch"),
		).toBe(true);
	});
});
