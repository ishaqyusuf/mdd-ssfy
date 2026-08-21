import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
	new URL("./sales-payment-processor.tsx", import.meta.url),
	"utf8",
);
const optionsSection = source.slice(
	source.indexOf('<h3 className="text-sm font-medium">Options</h3>'),
	source.indexOf("{isSheet", source.indexOf("Options</h3>")),
);

describe("sales payment processor options layout", () => {
	it("uses a flat divided list instead of bordered option cards", () => {
		expect(optionsSection.includes("divide-y")).toBe(true);
		expect(optionsSection.includes("sm:grid-cols-2")).toBe(false);
		expect(optionsSection.includes("rounded-md border p-3")).toBe(false);
	});

	it("renders every option with compact inline title and description copy", () => {
		expect(optionsSection.match(/<InlinePaymentOptionCopy/g)?.length).toBe(4);
		expect(optionsSection.includes("Email a receipt after payment.")).toBe(true);
		expect(optionsSection.includes("Skip sending a payment link.")).toBe(true);
	});
});
