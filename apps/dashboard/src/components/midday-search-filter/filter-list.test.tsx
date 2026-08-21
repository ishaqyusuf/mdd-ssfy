/** @jsxImportSource react */
import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { FilterDefinition } from "./filter-definitions";
import { FilterList } from "./filter-list";

const definitions: FilterDefinition[] = [
	{
		key: "status",
		label: "Status",
		type: "multi-select",
		options: [
			{ label: "Pending", value: "pending", color: "#d97706" },
			{ label: "Complete", value: "complete", color: "#059669" },
		],
	},
	{
		key: "customer",
		label: "Customer",
		type: "single-select",
		options: [{ label: "Customer A", value: "customer-a" }],
	},
];

describe("FilterList option colors", () => {
	it("renders a color marker for a single active option", () => {
		const markup = renderToStaticMarkup(
			<FilterList definitions={definitions} filters={{ status: "pending" }} />,
		);

		expect(markup).toContain("background-color:#d97706");
		expect(markup).toContain("Pending");
	});

	it("renders every marker for multiple active options", () => {
		const markup = renderToStaticMarkup(
			<FilterList
				definitions={definitions}
				filters={{ status: ["pending", "complete"] }}
			/>,
		);

		expect(markup).toContain("background-color:#d97706");
		expect(markup).toContain("background-color:#059669");
		expect(markup).toContain("Pending");
		expect(markup).toContain("Complete");
	});

	it("keeps an uncolored active option marker-free", () => {
		const markup = renderToStaticMarkup(
			<FilterList
				definitions={definitions}
				filters={{ customer: "customer-a" }}
			/>,
		);

		expect(markup).toContain("Customer A");
		expect(markup).not.toContain("background-color");
	});
});
