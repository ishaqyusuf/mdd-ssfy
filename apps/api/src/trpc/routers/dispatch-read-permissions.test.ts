import { describe, expect, it } from "bun:test";

import { dispatchRouters } from "./dispatch.route";

describe("dispatch read permissions", () => {
	it("rejects unauthenticated operational and driver reads", async () => {
		const caller = dispatchRouters.createCaller({
			db: {},
		} as Parameters<typeof dispatchRouters.createCaller>[0]);
		const reads = [
			() => caller.index({ size: 1 }),
			() => caller.assignedDispatch({ size: 1 }),
			() => caller.driverWorkQueue({ size: 1 }),
			() => caller.driverWorkQueueSummary({ size: 1 }),
			() => caller.dispatchOverviewV2({ dispatchId: 1 }),
			() => caller.manifest({ dispatchId: 1 }),
			() => caller.packingList({ tab: "current" }),
			() => caller.dispatchSummary(),
		];

		for (const read of reads) {
			await expect(read()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		}
	});

	it("rejects a driver reading another driver's manifest", async () => {
		const caller = dispatchRouters.createCaller({
			userId: 19,
			db: {
				users: {
					findFirstOrThrow: async () => ({
						id: 19,
						email: "driver@example.test",
						name: "Driver One",
						phoneNo: null,
						roles: [{ role: { id: 7, name: "Driver" } }],
					}),
				},
				roles: {
					findFirstOrThrow: async () => ({
						name: "Driver",
						RoleHasPermissions: [{ permission: { name: "view delivery" } }],
					}),
				},
				modelHasPermissions: { findMany: async () => [] },
				orderDelivery: {
					findFirst: async () => ({ driverId: 20 }),
				},
			},
		} as Parameters<typeof dispatchRouters.createCaller>[0]);

		await expect(caller.manifest({ dispatchId: 501 })).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});

	it("rejects fulfillment dispatch resolution without the dedicated permission", async () => {
		const caller = dispatchRouters.createCaller({
			userId: 19,
			db: {
				users: {
					findFirstOrThrow: async () => ({
						id: 19,
						email: "driver@example.test",
						name: "Driver One",
						phoneNo: null,
						roles: [{ role: { id: 7, name: "Driver" } }],
					}),
				},
				roles: {
					findFirstOrThrow: async () => ({
						name: "Driver",
						RoleHasPermissions: [{ permission: { name: "edit delivery" } }],
					}),
				},
				modelHasPermissions: { findMany: async () => [] },
			},
		} as Parameters<typeof dispatchRouters.createCaller>[0]);

		await expect(
			caller.ensureSalesOrderFulfillmentDispatch({ salesId: 501 }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
