/** @jsxImportSource react */
import { describe, expect, it } from "bun:test";
import { FilterOptionLabel } from "@gnd/ui/filter-option-label";
import { renderToStaticMarkup } from "react-dom/server";

describe("Dealership filter option labels", () => {
	it("renders colored and uncolored options", () => {
		const colored = renderToStaticMarkup(
			<FilterOptionLabel label="Paid" color="#059669" />,
		);
		const uncolored = renderToStaticMarkup(
			<FilterOptionLabel label="Customer A" />,
		);

		expect(colored).toContain("background-color:#059669");
		expect(colored).toContain("Paid");
		expect(uncolored).toContain("Customer A");
		expect(uncolored).not.toContain("background-color");
	});
});
