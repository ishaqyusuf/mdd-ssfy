import { expect, it } from "bun:test";
import { composeActivityRows } from "./compose";

it("retains the final confirmed departing row then expires without animation events", () => {
	const row = { id: 1, uuid: "one" };
	const activity = {
		ownerId: "a",
		tableId: "orders",
		entityId: 1,
		operationId: "op",
		phase: "success" as const,
		label: "Reviewed",
		startedAt: 10,
		settledAt: 100,
	};
	const input = {
		serverRows: [] as (typeof row)[],
		snapshots: [{ row, index: 0, activity, presentedAt: 100 }],
		getEntityId: (r: typeof row) => r.id,
		now: 200,
		refresh: { completedAt: 150, entityIds: new Set<number>() },
	};
	expect(composeActivityRows(input).displayRows).toEqual([row]);
	expect(composeActivityRows({ ...input, now: 3200 }).displayRows).toEqual([]);
	expect(
		composeActivityRows({ ...input, refresh: undefined }).displayRows,
	).toEqual([]);
});

it("prefers refreshed data, preserves batch order and never retains a failed row", () => {
	const activity = {
		ownerId: "a",
		tableId: "orders",
		entityId: 1,
		operationId: "op",
		phase: "success" as const,
		label: "Reviewed",
		startedAt: 10,
		settledAt: 100,
	};
	const old = { id: 1, value: "old" };
	const fresh = { id: 1, value: "fresh" };
	const second = { id: 2, value: "second" };
	const snapshots = [
		{ row: old, index: 0, activity },
		{
			row: second,
			index: 1,
			activity: { ...activity, entityId: 2, operationId: "op2" },
		},
	];
	const input = {
		serverRows: [fresh],
		snapshots,
		getEntityId: (r: typeof old) => r.id,
		now: 200,
		refresh: { completedAt: 150, entityIds: new Set<number>() },
	};
	expect(composeActivityRows(input).displayRows).toEqual([fresh, second]);
	expect(composeActivityRows({ ...input, serverRows: [] }).displayRows).toEqual(
		[old, second],
	);
	expect(
		composeActivityRows({
			...input,
			serverRows: [],
			snapshots: [
				{ ...snapshots[0]!, activity: { ...activity, phase: "error" } },
			],
		}).displayRows,
	).toEqual([]);
});
