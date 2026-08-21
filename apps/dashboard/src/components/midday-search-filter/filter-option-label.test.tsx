/** @jsxImportSource react */
import { describe, expect, it } from "bun:test";
import { FilterOptionLabel } from "@gnd/ui/filter-option-label";
import { renderToStaticMarkup } from "react-dom/server";

describe("Dashboard filter option labels", () => {
	it("renders a colored option in the standard list", () => {
		const markup = renderToStaticMarkup(
			<FilterOptionLabel label="In progress" color="#2563eb" />,
		);

		expect(markup).toContain("background-color:#2563eb");
		expect(markup).toContain("In progress");
		expect(markup).not.toContain("line-clamp-1");
	});

	it("keeps an uncolored long-list option aligned without a marker", () => {
		const markup = renderToStaticMarkup(
			<FilterOptionLabel label="Customer A" truncate />,
		);

		expect(markup).toContain("Customer A");
		expect(markup).toContain("line-clamp-1");
		expect(markup).not.toContain("background-color");
	});
});
