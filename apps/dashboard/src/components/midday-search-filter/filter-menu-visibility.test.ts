import { describe, expect, it } from "bun:test";

import { shouldShowFilterMenu } from "./filter-menu-visibility";

describe("Midday filter menu visibility", () => {
	it("keeps the trigger visible while lazy filter metadata is unresolved", () => {
		expect(
			shouldShowFilterMenu({
				filterList: undefined,
				loading: false,
				nonSearchDefinitionCount: 0,
			}),
		).toBe(true);
	});

	it("hides the trigger for an explicitly search-only filter list", () => {
		expect(
			shouldShowFilterMenu({
				filterList: [],
				loading: false,
				nonSearchDefinitionCount: 0,
			}),
		).toBe(false);
	});

	it("shows the trigger for loading or resolved non-search filters", () => {
		expect(
			shouldShowFilterMenu({
				filterList: [],
				loading: true,
				nonSearchDefinitionCount: 0,
			}),
		).toBe(true);
		expect(
			shouldShowFilterMenu({
				filterList: [],
				loading: false,
				nonSearchDefinitionCount: 1,
			}),
		).toBe(true);
	});
});
