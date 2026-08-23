import { describe, expect, test } from "bun:test";
import { salesRouter } from "./sales.route";

type SalesCallerContext = Parameters<typeof salesRouter.createCaller>[0];

function userWithRole(name: string) {
	return {
		roles: [{ role: { name } }],
	};
}

describe("sales handoff trigger route permissions", () => {
	test("rejects unauthenticated reads and writes at the protected boundary", async () => {
		const caller = salesRouter.createCaller({ db: {} } as SalesCallerContext);

		await expect(caller.getSalesHandoffTrigger()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(
			caller.updateSalesHandoffTrigger({
				mode: "ANY_PAYMENT",
				percentage: null,
			}),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("rejects an authenticated non-Super-Admin before settings are read", async () => {
		let settingsRead = false;
		const caller = salesRouter.createCaller({
			userId: 7,
			db: {
				users: { findFirst: async () => userWithRole("Sales") },
				settings: {
					findFirst: async () => {
						settingsRead = true;
						return null;
					},
				},
			},
		} as SalesCallerContext);

		await expect(caller.getSalesHandoffTrigger()).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
		expect(settingsRead).toBe(false);
	});

	test("allows a Super Admin to read the default and persist a validated policy", async () => {
		const writes: unknown[] = [];
		const settings = {
			findFirst: async () => null,
			create: async (input: unknown) => {
				writes.push(input);
			},
			update: async () => {
				throw new Error("unexpected update");
			},
		};
		const db = {
			users: { findFirst: async () => userWithRole("Super Admin") },
			salesHandoffActionEpoch: { findMany: async () => [] },
			salesOrders: { findMany: async () => [] },
			settings,
			$transaction: async (
				callback: (tx: { settings: typeof settings }) => Promise<unknown>,
				options: unknown,
			) => {
				expect(options).toEqual({ isolationLevel: "Serializable" });
				return callback({ settings });
			},
		};
		const caller = salesRouter.createCaller({
			userId: 1,
			db,
		} as unknown as SalesCallerContext);

		expect(await caller.getSalesHandoffTrigger()).toEqual({
			settings: {
				mode: "FULLY_PAID",
				percentage: null,
				revision: 0,
				changedAt: null,
			},
		});
		expect(
			await caller.updateSalesHandoffTrigger({
				mode: "PAYMENT_PERCENTAGE",
				percentage: 40,
			}),
		).toMatchObject({
			changed: true,
			settings: {
				mode: "PAYMENT_PERCENTAGE",
				percentage: 40,
				revision: 1,
			},
		});
		expect(writes).toHaveLength(1);
	});
});
