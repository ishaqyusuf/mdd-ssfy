import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
	getDoorSwingOptions,
	normalizeDoorSwingValue,
} from "./door-swing-options";

describe("getDoorSwingOptions", () => {
	it("uses in/out swing choices for garage and exterior door families", () => {
		for (const line of [
			{ title: "Garage Door" },
			{ formSteps: [{ value: "Exterior Door" }] },
		]) {
			expect(getDoorSwingOptions(line)).toEqual([
				{ value: "inswing", label: "In-Swing" },
				{ value: "outswing", label: "Out-Swing" },
			]);
		}
	});

	it("keeps the legacy free-form swing behavior for other door families", () => {
		expect(getDoorSwingOptions({ title: "Interior Door" })).toBeNull();
	});

	it("normalizes legacy in/out spellings without changing other swing values", () => {
		expect(normalizeDoorSwingValue("In-Swing")).toBe("inswing");
		expect(normalizeDoorSwingValue("OUT SWING")).toBe("outswing");
		expect(normalizeDoorSwingValue("LH")).toBe("LH");
	});

	it("wires the shared choices into the door-size and HPT row surfaces", () => {
		const doorSizeSource = readFileSync(
			new URL("./modals/door-size-qty-dialog.tsx", import.meta.url),
			"utf8",
		);
		const hptSource = readFileSync(
			new URL("./house-package-tool-panel.tsx", import.meta.url),
			"utf8",
		);
		expect(doorSizeSource).toContain("getDoorSwingOptions(props.line)");
		expect(hptSource).toContain("props.swingOptions.map");
		expect(hptSource).toContain("<SelectItem");
	});
});
