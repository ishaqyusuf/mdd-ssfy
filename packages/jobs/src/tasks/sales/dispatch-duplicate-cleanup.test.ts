import { describe, expect, it } from "bun:test";

import { cleanDuplicateDispatchGroups } from "./dispatch-duplicate-cleanup";

function cleanupDb(pendingDispatchIds: number[] = []) {
	const pending = new Set(pendingDispatchIds);
	const calls: string[] = [];
	const transactions: unknown[] = [];
	let lockedDispatchId = 0;
	const db = {
		$transaction: async (
			callback: (tx: unknown) => Promise<unknown>,
			options: unknown,
		) => {
			transactions.push(options);
			return callback(db);
		},
		$queryRaw: async (_query: TemplateStringsArray, dispatchId: number) => {
			lockedDispatchId = dispatchId;
			calls.push(`lock:${dispatchId}`);
			return [{ id: dispatchId }];
		},
		salesPackingReport: {
			count: async () => {
				calls.push(`hold:${lockedDispatchId}`);
				return pending.has(lockedDispatchId) ? 1 : 0;
			},
		},
		orderDelivery: {
			updateMany: async ({ where }: { where: { id: { in: number[] } } }) => {
				calls.push(`delete:${where.id.in.join(",")}`);
				return { count: where.id.in.length };
			},
		},
	};

	return { db, calls, transactions };
}

describe("scheduled duplicate dispatch cleanup", () => {
	it("locks duplicate dispatches in stable order before the soft delete", async () => {
		const fixture = cleanupDb();
		const results = await cleanDuplicateDispatchGroups(fixture.db as never, [
			{
				salesId: 91,
				keepDispatchId: 44,
				deleteDispatchIds: [43, 41, 43, 42],
			},
		]);

		expect(fixture.calls).toEqual([
			"lock:41",
			"hold:41",
			"lock:42",
			"hold:42",
			"lock:43",
			"hold:43",
			"delete:41,42,43",
		]);
		expect(fixture.transactions).toEqual([{ isolationLevel: "Serializable" }]);
		expect(results[0]).toMatchObject({
			deletedCount: 3,
			blocked: false,
		});
	});

	it("rejects the whole group on a pending report and continues with later groups", async () => {
		const fixture = cleanupDb([42]);
		const results = await cleanDuplicateDispatchGroups(fixture.db as never, [
			{
				salesId: 91,
				keepDispatchId: 44,
				deleteDispatchIds: [41, 42],
			},
			{
				salesId: 92,
				keepDispatchId: 46,
				deleteDispatchIds: [45],
			},
		]);

		expect(fixture.calls).toEqual([
			"lock:41",
			"hold:41",
			"lock:42",
			"hold:42",
			"lock:45",
			"hold:45",
			"delete:45",
		]);
		expect(results).toEqual([
			expect.objectContaining({
				salesId: 91,
				deletedCount: 0,
				blocked: true,
			}),
			expect.objectContaining({
				salesId: 92,
				deletedCount: 1,
				blocked: false,
			}),
		]);
		expect(fixture.transactions).toHaveLength(2);
	});
});
