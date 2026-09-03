import { describe, expect, it } from "bun:test";

import {
	FILTER_OPTION_COLORS,
	getDeliveryFilterOptionColor,
	getFilterOptionColorFromTone,
	getPaymentFilterOptionColor,
	getStatusFilterOptionColor,
} from "./filter-option-colors";

describe("filter option colors", () => {
	it("maps canonical lifecycle tones without re-deriving status labels", () => {
		expect(getFilterOptionColorFromTone("rose")).toBe(
			FILTER_OPTION_COLORS.rose,
		);
		expect(getFilterOptionColorFromTone("indigo")).toBe(
			FILTER_OPTION_COLORS.indigo,
		);
		expect(getFilterOptionColorFromTone("stone")).toBe(
			FILTER_OPTION_COLORS.stone,
		);
	});
	it("normalizes status aliases into stable semantic colors", () => {
		expect(getStatusFilterOptionColor("signature_pending")).toBe(
			FILTER_OPTION_COLORS.amber,
		);
		expect(getStatusFilterOptionColor("today")).toBe(
			FILTER_OPTION_COLORS.amber,
		);
		expect(getStatusFilterOptionColor("packing queue")).toBe(
			FILTER_OPTION_COLORS.amber,
		);
		expect(getStatusFilterOptionColor("IN PROGRESS")).toBe(
			FILTER_OPTION_COLORS.blue,
		);
		expect(getStatusFilterOptionColor("part-paid")).toBe(
			FILTER_OPTION_COLORS.orange,
		);
		expect(getStatusFilterOptionColor("fulfilled")).toBe(
			FILTER_OPTION_COLORS.emerald,
		);
		expect(getStatusFilterOptionColor("canceled")).toBe(
			FILTER_OPTION_COLORS.rose,
		);
	});

	it("uses neutral slate for unknown dynamic statuses", () => {
		expect(getStatusFilterOptionColor("legacy custom state")).toBe(
			FILTER_OPTION_COLORS.slate,
		);
	});

	it("colors payment and delivery state without treating them as identities", () => {
		expect(getPaymentFilterOptionColor("paid")).toBe(
			FILTER_OPTION_COLORS.emerald,
		);
		expect(getPaymentFilterOptionColor("due")).toBe(FILTER_OPTION_COLORS.amber);
		expect(getPaymentFilterOptionColor("credit")).toBe(
			FILTER_OPTION_COLORS.violet,
		);
		expect(getDeliveryFilterOptionColor("pickup")).toBe(
			FILTER_OPTION_COLORS.violet,
		);
		expect(getDeliveryFilterOptionColor("delivery")).toBe(
			FILTER_OPTION_COLORS.blue,
		);
		expect(getDeliveryFilterOptionColor("ship")).toBe(
			FILTER_OPTION_COLORS.cyan,
		);
	});
});
