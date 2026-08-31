import { describe, expect, test } from "bun:test";
import { SalesOverviewGeneralV2Include } from "./sales-overview-general-v2";

describe("Sales Overview General V2 dispatch lifecycle regression", () => {
	test("loads the dispatch item count used to select an active dispatch", () => {
		expect(SalesOverviewGeneralV2Include.deliveries).toMatchObject({
			select: {
				status: true,
				_count: {
					select: { items: true },
				},
			},
		});
	});
});
