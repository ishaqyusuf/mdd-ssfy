import { describe, expect, test } from "bun:test";
import { saveCommunityModelCost } from "./community";

describe("saveCommunityModelCost", () => {
	test("saves a new model cost with blank optional dates", async () => {
		let createdData: Record<string, unknown> | undefined;
		let synchronizedAmountDue: number | undefined;
		const defaultStartDate = new Date("2026-07-27T12:00:00.000Z");

		const transactionDb = {
			communityModels: {
				findUnique: async () => ({
					id: 104,
					modelName: "2315 LH",
					pivotId: 22,
				}),
			},
			communityModelCost: {
				create: async ({ data }: { data: Record<string, unknown> }) => {
					if (data.startDate === null) {
						throw new Error("startDate cannot be null");
					}
					createdData = data;
					return { id: 55 };
				},
				findFirstOrThrow: async () => ({
					id: 55,
					startDate: createdData?.startDate ?? defaultStartDate,
					endDate: null,
					meta: createdData?.meta,
					community: { id: 104 },
				}),
			},
			communityModelPivot: {
				findUnique: async () => ({
					id: 22,
					communityModels: [],
				}),
			},
			homes: {
				updateMany: async () => ({ count: 0 }),
			},
			homeTasks: {
				updateMany: async ({
					data,
				}: {
					data: { amountDue?: number };
				}) => {
					synchronizedAmountDue = data.amountDue;
					return { count: 1 };
				},
			},
		};
		const ctx = {
			db: {
				$transaction: async (
					callback: (tx: typeof transactionDb) => Promise<unknown>,
				) => callback(transactionDb),
			},
		};

		await expect(
			saveCommunityModelCost(ctx as never, {
				id: null,
				startDate: null,
				endDate: null,
				communityModelId: 104,
				costs: { HuxiDD: 852.13 },
				tax: { HuxiDD: 0 },
				meta: {},
				model: "2315 LH",
			}),
		).resolves.toBeUndefined();

		expect(createdData?.startDate).toBeUndefined();
		expect(synchronizedAmountDue).toBe(852.13);
	});
});
