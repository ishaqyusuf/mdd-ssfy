import { describe, expect, it } from "bun:test";
import {
	compareInstallCosts,
	sortInstallCosts,
	sortBuilderTasks,
	type InstallCostSortKey,
} from "./install-cost-sort";

function makeItem(
	opts: Partial<{
		btId: number;
		taskIndex: number | null;
		createdAt: Date | null;
		icmId: number;
		title: string;
	}> = {},
): InstallCostSortKey {
	return {
		builderTask: {
			id: opts.btId ?? 1,
			taskIndex: opts.taskIndex ?? null,
			createdAt: opts.createdAt ?? null,
		},
		installCostModel: {
			id: opts.icmId ?? 1,
			title: opts.title ?? "Item",
		},
	};
}

function d(iso: string) {
	return new Date(iso);
}

// ---------------------------------------------------------------------------
// compareInstallCosts
// ---------------------------------------------------------------------------
describe("compareInstallCosts", () => {
	it("sorts by taskIndex ascending when both present", () => {
		const a = makeItem({ taskIndex: 2 });
		const b = makeItem({ taskIndex: 1 });
		expect(compareInstallCosts(a, b)).toBeGreaterThan(0);
		expect(compareInstallCosts(b, a)).toBeLessThan(0);
	});

	it("puts null taskIndex items after items with a taskIndex", () => {
		const withIndex = makeItem({ taskIndex: 5 });
		const withNull = makeItem({ taskIndex: null });
		expect(compareInstallCosts(withIndex, withNull)).toBeLessThan(0);
		expect(compareInstallCosts(withNull, withIndex)).toBeGreaterThan(0);
	});

	it("falls back to createdAt when taskIndex values are equal", () => {
		const earlier = makeItem({
			taskIndex: 1,
			createdAt: d("2024-01-01T00:00:00Z"),
		});
		const later = makeItem({
			taskIndex: 1,
			createdAt: d("2024-06-01T00:00:00Z"),
		});
		expect(compareInstallCosts(earlier, later)).toBeLessThan(0);
		expect(compareInstallCosts(later, earlier)).toBeGreaterThan(0);
	});

	it("treats null createdAt as epoch 0 (sorts first)", () => {
		const withNull = makeItem({ taskIndex: 1, createdAt: null });
		const withDate = makeItem({
			taskIndex: 1,
			createdAt: d("2024-01-01T00:00:00Z"),
		});
		expect(compareInstallCosts(withNull, withDate)).toBeLessThan(0);
	});

	it("falls back to builderTask.id when taskIndex and createdAt are equal", () => {
		const a = makeItem({ btId: 2, taskIndex: 1, createdAt: null });
		const b = makeItem({ btId: 1, taskIndex: 1, createdAt: null });
		expect(compareInstallCosts(a, b)).toBeGreaterThan(0);
	});

	it("falls back to installCostModel.title when first 3 keys are identical", () => {
		const base = { btId: 1, taskIndex: 1, createdAt: null };
		const a = makeItem({ ...base, title: "Zinc", icmId: 1 });
		const b = makeItem({ ...base, title: "Alpha", icmId: 2 });
		expect(compareInstallCosts(a, b)).toBeGreaterThan(0);
		expect(compareInstallCosts(b, a)).toBeLessThan(0);
	});

	it("falls back to installCostModel.id when all other keys are identical", () => {
		const base = { btId: 1, taskIndex: 1, createdAt: null, title: "Flooring" };
		const a = makeItem({ ...base, icmId: 2 });
		const b = makeItem({ ...base, icmId: 1 });
		expect(compareInstallCosts(a, b)).toBeGreaterThan(0);
	});

	it("returns 0 for truly identical items", () => {
		const a = makeItem({ btId: 1, taskIndex: 1, createdAt: null, icmId: 1, title: "X" });
		const b = makeItem({ btId: 1, taskIndex: 1, createdAt: null, icmId: 1, title: "X" });
		expect(compareInstallCosts(a, b)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// sortInstallCosts
// ---------------------------------------------------------------------------
describe("sortInstallCosts", () => {
	it("returns a new array and does not mutate the original", () => {
		const items = [makeItem({ taskIndex: 2 }), makeItem({ taskIndex: 1 })];
		const original = [...items];
		const sorted = sortInstallCosts(items);
		expect(items).toEqual(original);
		expect(sorted).not.toBe(items);
	});

	it("all tasks have taskIndex — sorted ascending", () => {
		const items = [
			makeItem({ taskIndex: 3, icmId: 3 }),
			makeItem({ taskIndex: 1, icmId: 1 }),
			makeItem({ taskIndex: 2, icmId: 2 }),
		];
		const sorted = sortInstallCosts(items);
		expect(sorted.map((i) => i.builderTask.taskIndex)).toEqual([1, 2, 3]);
	});

	it("mixed taskIndex and null — nulls sorted last", () => {
		const items = [
			makeItem({ taskIndex: null, icmId: 99 }),
			makeItem({ taskIndex: 2, icmId: 2 }),
			makeItem({ taskIndex: 1, icmId: 1 }),
		];
		const sorted = sortInstallCosts(items);
		expect(sorted[0]!.builderTask.taskIndex).toBe(1);
		expect(sorted[1]!.builderTask.taskIndex).toBe(2);
		expect(sorted[2]!.builderTask.taskIndex).toBeNull();
	});

	it("all rows fall back to createdAt when taskIndex is null for all", () => {
		const items = [
			makeItem({ taskIndex: null, createdAt: d("2024-03-01T00:00:00Z"), icmId: 3 }),
			makeItem({ taskIndex: null, createdAt: d("2024-01-01T00:00:00Z"), icmId: 1 }),
			makeItem({ taskIndex: null, createdAt: d("2024-02-01T00:00:00Z"), icmId: 2 }),
		];
		const sorted = sortInstallCosts(items);
		expect(sorted.map((i) => i.installCostModel.id)).toEqual([1, 2, 3]);
	});

	it("stable output when same taskIndex and createdAt — resolves via title then id", () => {
		const common = {
			btId: 1,
			taskIndex: 0,
			createdAt: d("2024-01-01T00:00:00Z"),
		};
		const items = [
			makeItem({ ...common, title: "Zinc", icmId: 3 }),
			makeItem({ ...common, title: "Alpha", icmId: 1 }),
			makeItem({ ...common, title: "Alpha", icmId: 2 }),
		];
		const sorted = sortInstallCosts(items);
		expect(sorted[0]!.installCostModel.title).toBe("Alpha");
		expect(sorted[0]!.installCostModel.id).toBe(1);
		expect(sorted[1]!.installCostModel.title).toBe("Alpha");
		expect(sorted[1]!.installCostModel.id).toBe(2);
		expect(sorted[2]!.installCostModel.title).toBe("Zinc");
	});
});

// ---------------------------------------------------------------------------
// sortBuilderTasks
// ---------------------------------------------------------------------------
describe("sortBuilderTasks", () => {
	it("sorts by taskIndex ascending", () => {
		const tasks = [
			{ id: 1, taskIndex: 3, createdAt: null },
			{ id: 2, taskIndex: 1, createdAt: null },
			{ id: 3, taskIndex: 2, createdAt: null },
		];
		const sorted = sortBuilderTasks(tasks);
		expect(sorted.map((t) => t.taskIndex)).toEqual([1, 2, 3]);
	});

	it("puts null taskIndex tasks last", () => {
		const tasks = [
			{ id: 1, taskIndex: null, createdAt: null },
			{ id: 2, taskIndex: 1, createdAt: null },
		];
		const sorted = sortBuilderTasks(tasks);
		expect(sorted[0]!.id).toBe(2);
		expect(sorted[1]!.id).toBe(1);
	});

	it("falls back to createdAt then id", () => {
		const tasks = [
			{ id: 3, taskIndex: null, createdAt: d("2024-03-01T00:00:00Z") },
			{ id: 1, taskIndex: null, createdAt: d("2024-01-01T00:00:00Z") },
			{ id: 2, taskIndex: null, createdAt: d("2024-01-01T00:00:00Z") },
		];
		const sorted = sortBuilderTasks(tasks);
		expect(sorted.map((t) => t.id)).toEqual([1, 2, 3]);
	});

	it("does not mutate the original", () => {
		const tasks = [
			{ id: 2, taskIndex: 2, createdAt: null },
			{ id: 1, taskIndex: 1, createdAt: null },
		];
		const original = [...tasks];
		sortBuilderTasks(tasks);
		expect(tasks).toEqual(original);
	});
});
