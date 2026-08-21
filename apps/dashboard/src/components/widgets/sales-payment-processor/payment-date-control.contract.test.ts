import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./sales-payment-processor.tsx", import.meta.url),
	"utf8",
);

describe("sales payment processor date control contract", () => {
	it("uses the browser-safe payment date module", () => {
		expect(
			source.includes('from "@gnd/sales/payment-system/payment-date";'),
		).toBe(true);
		expect(source.includes('from "@gnd/sales/payment-system";')).toBe(false);
	});

	it("shows the payment date only to Super Admin and reclaims its grid column", () => {
		expect(source.includes("canSetSalesPaymentDate")).toBe(true);
		expect(source.includes("canSetPaymentDate ? (")).toBe(true);
		expect(source.includes('"grid-cols-1"')).toBe(true);
		expect(
			source.includes(
				"paymentDate: canSetPaymentDate ? formData.paymentDate : null",
			),
		).toBe(true);
	});

	it("places the compact date group before the payment method", () => {
		const dateControl = source.indexOf("<PaymentDateControl");
		const methodControl = source.indexOf("<SalesPaymentMethodControl");

		expect(dateControl).toBeGreaterThan(-1);
		expect(methodControl).toBeGreaterThan(dateControl);
		expect(source.includes('<ButtonGroup aria-label="Payment date">')).toBe(
			true,
		);
	});

	it("switches between icon, selected date, and clear states", () => {
		expect(source.includes('key="calendar-icon"')).toBe(true);
		expect(source.includes('key="payment-date"')).toBe(true);
		expect(source.includes("Clear payment date and use today")).toBe(true);
		expect(source.includes('form.setValue("paymentDate", value')).toBe(true);
	});

	it("animates layout changes and respects reduced motion", () => {
		expect(source.includes("useReducedMotion()")).toBe(true);
		expect(source.includes("<motion.div")).toBe(true);
		expect(source.includes("<AnimatePresence")).toBe(true);
		expect(source.includes("motion-reduce:transition-none")).toBe(true);
	});

	it("uses the standard 36px button height for date and clear controls", () => {
		const dateControl = source.slice(
			source.indexOf("function PaymentDateControl"),
			source.indexOf("export function SalesPaymentProcessor"),
		);

		expect(dateControl.match(/size="icon"/g)?.length).toBe(2);
		expect(dateControl.includes('className="size-9')).toBe(true);
	});
});
