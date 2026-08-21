import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./sales-payment-method-control.tsx", import.meta.url),
	"utf8",
);

describe("sales payment method control contract", () => {
	it("uses one adaptive check input group", () => {
		expect(source.includes("<InputGroup")).toBe(true);
		expect(source.includes("<InputGroup.Button")).toBe(true);
		expect(source.includes('placeholder="Enter check number"')).toBe(true);
		expect(source.includes('method === "check"')).toBe(true);
	});

	it("owns an accessible terminal submenu with availability", () => {
		expect(source.includes("<DropdownMenu.Sub")).toBe(true);
		expect(source.includes("<DropdownMenu.SubTrigger")).toBe(true);
		expect(source.includes("model.availableTerminalCount")).toBe(true);
		expect(source.includes("onTerminalChange(terminal)")).toBe(true);
	});

	it("shows a selected terminal label instead of the generic method", () => {
		expect(source.includes("buildPaymentMethodControlModel")).toBe(true);
		expect(source.includes("model.triggerLabel")).toBe(true);
		expect(source.includes("Terminal Payment")).toBe(false);
	});

	it("keeps Check validation on the border without a visible error label", () => {
		expect(source.includes('method === "check" && "sr-only"')).toBe(true);
		expect(source.includes("aria-invalid={invalid || undefined}")).toBe(true);
	});
});
