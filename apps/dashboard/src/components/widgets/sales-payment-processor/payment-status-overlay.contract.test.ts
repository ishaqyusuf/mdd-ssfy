import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./payment-status-overlay.tsx", import.meta.url),
	"utf8",
);

describe("sales payment print status overlay contract", () => {
	it("keeps the payment screen in a preparing state while printing", () => {
		expect(source.includes('state === "printing"')).toBe(true);
		expect(source.includes("getPaymentStatusOverlayContent")).toBe(true);
	});

	it("offers print-only recovery after payment has already succeeded", () => {
		expect(source.includes('state === "print_failed"')).toBe(true);
		expect(source.includes("onRetryPrint")).toBe(true);
		expect(source.includes("Retry print")).toBe(true);
		expect(source.includes("Back to payment form")).toBe(true);
	});
});
