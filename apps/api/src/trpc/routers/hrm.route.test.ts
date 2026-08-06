import { describe, expect, it } from "bun:test";
import { hrmRoutes } from "./hrm.route";

describe("hrm routes", () => {
	it("does not expose employees through the quick-login list outside development", async () => {
		const caller = hrmRoutes.createCaller(
			{} as Parameters<typeof hrmRoutes.createCaller>[0],
		);

		expect(await caller.getQuickLoginEmployees()).toEqual([]);
	});

	it("returns minimal active test-account data in development", async () => {
		const previousNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "development";
		try {
			const caller = hrmRoutes.createCaller({
				db: {
					users: {
						findMany: async () => [
							{
								id: 11,
								name: "Miguel Driver",
								email: "driver@example.test",
								roles: [{ role: { name: "Driver" } }],
							},
						],
					},
				},
			} as Parameters<typeof hrmRoutes.createCaller>[0]);

			expect(await caller.getQuickLoginEmployees()).toEqual([
				{
					id: 11,
					name: "Miguel Driver",
					email: "driver@example.test",
					role: "Driver",
				},
			]);
		} finally {
			process.env.NODE_ENV = previousNodeEnv;
		}
	});
});
