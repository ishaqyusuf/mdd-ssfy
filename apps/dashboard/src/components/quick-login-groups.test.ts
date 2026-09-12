import { describe, expect, it } from "bun:test";

import { groupQuickLoginUsersByRole } from "./quick-login-groups";

describe("groupQuickLoginUsersByRole", () => {
	it("groups users by trimmed role and reports each group count", () => {
		const groups = groupQuickLoginUsersByRole([
			{ id: 1, role: "Admin", name: "Ada" },
			{ id: 2, role: " Sales ", name: "Sam" },
			{ id: 3, role: "Admin", name: "Ali" },
		]);

		expect(groups).toEqual([
			{
				role: "Admin",
				count: 2,
				users: [
					{ id: 1, role: "Admin", name: "Ada" },
					{ id: 3, role: "Admin", name: "Ali" },
				],
			},
			{
				role: "Sales",
				count: 1,
				users: [{ id: 2, role: " Sales ", name: "Sam" }],
			},
		]);
	});

	it("places users without a role in a final No role group", () => {
		const groups = groupQuickLoginUsersByRole([
			{ id: 1, role: null },
			{ id: 2, role: "Worker" },
			{ id: 3, role: "   " },
		]);

		expect(groups.map(({ role, count }) => ({ role, count }))).toEqual([
			{ role: "Worker", count: 1 },
			{ role: "No role", count: 2 },
		]);
	});
});
