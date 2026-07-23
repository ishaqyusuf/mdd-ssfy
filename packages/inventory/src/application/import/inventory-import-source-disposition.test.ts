import { describe, expect, it, mock } from "bun:test";
import type { Db } from "@gnd/db";
import { tasks } from "@trigger.dev/sdk/v3";
import { inventoryImportSourceDispositionBatchSchema } from "../../schema";
import {
	applyInventoryImportSourceDisposition,
	applyInventoryImportSourceDispositionBatch,
} from "./inventory-import-source-disposition";

function createDb(targetProductKind = "inventory") {
	const candidate = {
		id: 11,
		uid: "inventory-11",
		name: "Retained custom item",
		productKind: "inventory",
		sourceStepUid: "stale-step",
		sourceComponentUid: "component-11",
		sourceCustom: true,
		publishedAt: null,
		primaryStoreFront: false,
		inventoryCategory: {
			id: 10,
			uid: "stale-step",
			title: "Stale category",
		},
		variants: [
			{
				_count: {
					stocks: 0,
					stockAllocations: 0,
					inboundDemands: 0,
				},
			},
		],
		_count: {
			lineItems: 1,
			lineItemComponents: 0,
		},
	};
	const updateMany = mock(
		async (_args: {
			where: Record<string, unknown>;
			data: {
				inventoryCategoryId: number;
				sourceStepUid: string | null;
				sourceComponentUid: string | null;
				sourceCustom: boolean;
			};
		}) => ({ count: 1 }),
	);
	const eventCreate = mock(async () => ({ id: 91 }));
	const db = {
		settings: {
			findFirst: async () => ({ meta: null }),
		},
		dykeSteps: {
			findMany: async () => [
				{
					id: 1,
					uid: "active-step",
					title: "Active step",
					stepProducts: [],
					priceSystem: [],
				},
				{
					id: 2,
					uid: "stale-step",
					title: "Stale step",
					stepProducts: [],
					priceSystem: [],
				},
			],
		},
		inventoryCategory: {
			findMany: async () => [{ uid: "stale-step" }],
			findFirst: async () => ({
				id: 20,
				uid: "active-step",
				productKind: targetProductKind,
			}),
		},
		inventory: {
			findMany: async (args: {
				where?: { id?: { in?: number[] } };
			}) => {
				const requestedId = args.where?.id?.in?.[0] ?? candidate.id;
				return [
					{
						...candidate,
						id: requestedId,
						uid: `inventory-${requestedId}`,
					},
				];
			},
			updateMany,
		},
		event: {
			create: eventCreate,
		},
		$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
			callback(db),
	} as unknown as Db;

	return { db, eventCreate, updateMany };
}

const input = {
	inventoryId: 11,
	targetCategoryId: 20,
	disposition: "retain_as_inventory" as const,
	baseline: {
		categoryId: 10,
		sourceStepUid: "stale-step",
		sourceComponentUid: "component-11",
		sourceCustom: true,
	},
};

describe("inventory import source disposition", () => {
	it("moves a reviewed row, detaches import ownership, audits, and queues sync", async () => {
		const { db, eventCreate, updateMany } = createDb();
		Reflect.set(
			tasks,
			"trigger",
			mock(async () => ({ id: "retained-inventory-sync" })),
		);

		const result = await applyInventoryImportSourceDisposition(db, input, 42);

		expect(updateMany).toHaveBeenCalledWith({
			where: {
				id: 11,
				deletedAt: null,
				inventoryCategoryId: 10,
				sourceStepUid: "stale-step",
				sourceComponentUid: "component-11",
				sourceCustom: true,
			},
			data: {
				inventoryCategoryId: 20,
				sourceStepUid: null,
				sourceComponentUid: null,
				sourceCustom: false,
			},
		});
		expect(eventCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					type: "inventory.import-source-disposition",
					userId: 42,
					data: expect.objectContaining({
						inventoryId: 11,
						disposition: "retain_as_inventory",
					}),
				}),
			}),
		);
		expect(result).toEqual({
			status: "applied",
			inventoryId: 11,
			previousCategoryId: 10,
			targetCategoryId: 20,
			disposition: "retain_as_inventory",
			auditEventId: 91,
			syncQueued: true,
			syncRunId: "retained-inventory-sync",
		});
		expect(tasks.trigger).toHaveBeenCalledWith(
			"sync-inventory-to-dyke",
			expect.objectContaining({
				inventoryId: 11,
				mode: "sync",
				source: "repair",
			}),
		);
	});

	it("skips a stale operator baseline without writing", async () => {
		const { db, eventCreate, updateMany } = createDb();

		const result = await applyInventoryImportSourceDisposition(
			db,
			{
				...input,
				baseline: {
					...input.baseline,
					sourceCustom: false,
				},
			},
			42,
		);

		expect(result).toEqual({
			status: "skipped",
			inventoryId: 11,
			reason: "changed_before_apply",
		});
		expect(updateMany).not.toHaveBeenCalled();
		expect(eventCreate).not.toHaveBeenCalled();
	});

	it("can retain the moved row as an explicit custom exception", async () => {
		const { db, updateMany } = createDb();
		Reflect.set(
			tasks,
			"trigger",
			mock(async () => ({ id: "retained-custom-sync" })),
		);

		const result = await applyInventoryImportSourceDisposition(
			db,
			{
				...input,
				disposition: "retain_as_custom",
			},
			42,
		);

		expect(updateMany.mock.calls[0]?.[0]?.data).toMatchObject({
			inventoryCategoryId: 20,
			sourceStepUid: null,
			sourceComponentUid: null,
			sourceCustom: true,
		});
		expect(result).toMatchObject({
			status: "applied",
			disposition: "retain_as_custom",
			syncQueued: true,
			syncRunId: "retained-custom-sync",
		});
	});

	it("rejects a target category with a different product kind", async () => {
		const { db, eventCreate, updateMany } = createDb("component");

		const result = await applyInventoryImportSourceDisposition(db, input, 42);

		expect(result).toEqual({
			status: "skipped",
			inventoryId: 11,
			reason: "target_kind_mismatch",
		});
		expect(updateMany).not.toHaveBeenCalled();
		expect(eventCreate).not.toHaveBeenCalled();
	});

	it("applies a bounded batch as independent guarded row operations", async () => {
		const { db, eventCreate, updateMany } = createDb();
		Reflect.set(
			tasks,
			"trigger",
			mock(async () => ({ id: "retained-batch-sync" })),
		);

		const result = await applyInventoryImportSourceDispositionBatch(
			db,
			{
				items: [input, { ...input, inventoryId: 12 }],
			},
			42,
		);

		expect(result).toMatchObject({
			appliedCount: 2,
			skippedCount: 0,
		});
		expect(result.results).toHaveLength(2);
		expect(updateMany).toHaveBeenCalledTimes(2);
		expect(eventCreate).toHaveBeenCalledTimes(2);
		expect(tasks.trigger).toHaveBeenCalledTimes(2);
	});

	it("rejects duplicate rows and batches above the operator limit", () => {
		expect(
			inventoryImportSourceDispositionBatchSchema.safeParse({
				items: [input, input],
			}).success,
		).toBe(false);
		expect(
			inventoryImportSourceDispositionBatchSchema.safeParse({
				items: Array.from({ length: 26 }, (_, index) => ({
					...input,
					inventoryId: index + 1,
				})),
			}).success,
		).toBe(false);
	});
});
