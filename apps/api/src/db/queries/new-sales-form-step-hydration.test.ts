import { describe, expect, it } from "bun:test";

import { collapseDuplicateRelationalFormSteps } from "./new-sales-form";

describe("relational sales-form step hydration", () => {
	it("keeps one stable row per logical step when stale component revisions remain active", () => {
		const stable = {
			id: 396499,
			stepId: 61,
			componentId: 386,
			prodUid: "stable-jamb",
			value: "5-1/2",
		};
		const staleAlternate = {
			id: 403255,
			stepId: 61,
			componentId: 384,
			prodUid: "stale-jamb",
			value: '5-1/4"',
		};

		expect(
			collapseDuplicateRelationalFormSteps([stable, staleAlternate]),
		).toEqual([stable]);
	});
});
