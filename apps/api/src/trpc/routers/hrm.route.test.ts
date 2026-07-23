import { describe, expect, it } from "bun:test";
import { hrmRoutes } from "./hrm.route";

describe("hrm routes", () => {
	it("does not expose employees through the quick-login list", async () => {
		const caller = hrmRoutes.createCaller(
			{} as Parameters<typeof hrmRoutes.createCaller>[0],
		);

		expect(await caller.getQuickLoginEmployees()).toEqual([]);
	});
});
