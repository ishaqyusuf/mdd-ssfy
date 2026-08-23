import { describe, expect, test } from "bun:test";
import { salesRouter } from "./sales.route";

type SalesCallerContext = Parameters<typeof salesRouter.createCaller>[0];

describe("Sales Handoff Actions route boundary", () => {
	test("requires an authenticated session", async () => {
		const caller = salesRouter.createCaller({ db: {} } as SalesCallerContext);
		await expect(
			caller.getSalesHandoffActions({ limit: 50 }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("strips forged representative scope and uses the session actor", async () => {
		let orderQuery: unknown;
		const epochRepository = {
			findMany: async () => [],
			findFirst: async () => null,
			count: async () => 0,
			create: async () => {
				throw new Error("unexpected create");
			},
			update: async () => {
				throw new Error("unexpected update");
			},
		};
		const caller = salesRouter.createCaller({
			userId: 17,
			db: {
				users: {
					findFirst: async () => ({
						id: 17,
						roles: [
							{
								organizationId: 1,
								role: { name: "Sales Representative" },
							},
						],
					}),
				},
				salesHandoffActionEpoch: epochRepository,
				salesOrders: {
					findMany: async (input: unknown) => {
						orderQuery = input;
						return [];
					},
				},
				settings: { findFirst: async () => null },
				paymentAllocation: { findMany: async () => [] },
			},
		} as unknown as SalesCallerContext);

		const result = await caller.getSalesHandoffActions({
			limit: 50,
			representativeId: 999,
		} as never);
		expect(result.actions).toEqual([]);
		expect(orderQuery).toMatchObject({
			where: {
				type: "order",
				salesRepId: 17,
				deletedAt: null,
				deliveredAt: null,
			},
			orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
			take: 200,
		});
		expect(JSON.stringify(orderQuery)).not.toContain("999");
	});
});
