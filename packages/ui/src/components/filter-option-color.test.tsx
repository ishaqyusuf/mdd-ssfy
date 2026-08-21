import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { FilterOptionColor } from "./filter-option-color";

describe("FilterOptionColor", () => {
	it("renders a decorative Midday-style square", () => {
		const markup = renderToStaticMarkup(
			<FilterOptionColor color="#2563eb" />,
		);

		expect(markup).toContain('aria-hidden="true"');
		expect(markup).toContain("background-color:#2563eb");
		expect(markup).toContain("height:12px");
		expect(markup).toContain("width:12px");
	});

	it("renders nothing when no color is provided", () => {
		expect(renderToStaticMarkup(<FilterOptionColor />)).toBe("");
	});
});
