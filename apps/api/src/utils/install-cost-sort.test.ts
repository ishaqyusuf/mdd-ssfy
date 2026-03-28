import { describe, expect, it } from "bun:test";
import {
	compareInstallCosts,
	sortInstallCosts,
	sortBuilderTasks,
	type InstallCostSortKey,
} from "./install-cost-sort";

function makeItem(
	opts: Partial<{
		bticId: number;
		orderIndex: number | null;
		createdAt: Date | null;
		icmId: number;
		title: string;
	}> = {},
): InstallCostSortKey {
	return {
		builderTaskInstallCost: {
			id: opts.bticId ?? 1,
			orderIndex: opts.orderIndex ?? null,
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
	it("sorts by orderIndex ascending when both present", () => {
		const a = makeItem({ orderIndex: 2 });
		const b = makeItem({ orderIndex: 1 });
		expect(compareInstallCosts(a, b)).toBeGreaterThan(0);
		expect(compareInstallCosts(b, a)).toBeLessThan(0);
	});

	it("puts null orderIndex items after items with an orderIndex", () => {
		const withIndex = makeItem({ orderIndex: 5 });
		const withNull = makeItem({ orderIndex: null });
		expect(compareInstallCosts(withIndex, withNull)).toBeLessThan(0);
		expect(compareInstallCosts(withNull, withIndex)).toBeGreaterThan(0);
	});

	it("falls back to createdAt when orderIndex values are equal", () => {
		const earlier = makeItem({
			orderIndex: 1,
			createdAt: d("2024-01-01T00:00:00Z"),
		});
		const later = makeItem({
			orderIndex: 1,
			createdAt: d("2024-06-01T00:00:00Z"),
		});
		expect(compareInstallCosts(earlier, later)).toBeLessThan(0);
		expect(compareInstallCosts(later, earlier)).toBeGreaterThan(0);
	});

	it("treats null createdAt as epoch 0 (sorts first)", () => {
		const withNull = makeItem({ orderIndex: 1, createdAt: null });
		const withDate = makeItem({
			orderIndex: 1,
			createdAt: d("2024-01-01T00:00:00Z"),
		});
		expect(compareInstallCosts(withNull, withDate)).toBeLessThan(0);
	});

	it("falls back to builderTaskInstallCost.id when orderIndex and createdAt are equal", () => {
		const a = makeItem({ bticId: 2, orderIndex: 1, createdAt: null });
		const b = makeItem({ bticId: 1, orderIndex: 1, createdAt: null });
		expect(compareInstallCosts(a, b)).toBeGreaterThan(0);
	});

	it("falls back to installCostModel.title when first 3 keys are identical", () => {
		const base = { bticId: 1, orderIndex: 1, createdAt: null };
		const a = makeItem({ ...base, title: "Zinc", icmId: 1 });
		const b = makeItem({ ...base, title: "Alpha", icmId: 2 });
		expect(compareInstallCosts(a, b)).toBeGreaterThan(0);
		expect(compareInstallCosts(b, a)).toBeLessThan(0);
	});

	it("falls back to installCostModel.id when all other keys are identical", () => {
		const base = { bticId: 1, orderIndex: 1, createdAt: null, title: "Flooring" };
		const a = makeItem({ ...base, icmId: 2 });
		const b = makeItem({ ...base, icmId: 1 });
		expect(compareInstallCosts(a, b)).toBeGreaterThan(0);
	});

	it("returns 0 for truly identical items", () => {
		const a = makeItem({ bticId: 1, orderIndex: 1, createdAt: null, icmId: 1, title: "X" });
		const b = makeItem({ bticId: 1, orderIndex: 1, createdAt: null, icmId: 1, title: "X" });
		expect(compareInstallCosts(a, b)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// sortInstallCosts
// ---------------------------------------------------------------------------
describe("sortInstallCosts", () => {
	it("returns a new array and does not mutate the original", () => {
		const items = [makeItem({ orderIndex: 2 }), makeItem({ orderIndex: 1 })];
		const original = [...items];
		const sorted = sortInstallCosts(items);
		expect(items).toEqual(original);
		expect(sorted).not.toBe(items);
	});

	it("all tasks have orderIndex — sorted ascending", () => {
		const items = [
			makeItem({ orderIndex: 3, icmId: 3 }),
			makeItem({ orderIndex: 1, icmId: 1 }),
			makeItem({ orderIndex: 2, icmId: 2 }),
		];
		const sorted = sortInstallCosts(items);
		expect(sorted.map((i) => i.builderTaskInstallCost.orderIndex)).toEqual([1, 2, 3]);
	});

	it("mixed orderIndex and null — nulls sorted last", () => {
		const items = [
			makeItem({ orderIndex: null, icmId: 99 }),
			makeItem({ orderIndex: 2, icmId: 2 }),
			makeItem({ orderIndex: 1, icmId: 1 }),
		];
		const sorted = sortInstallCosts(items);
		expect(sorted[0]!.builderTaskInstallCost.orderIndex).toBe(1);
		expect(sorted[1]!.builderTaskInstallCost.orderIndex).toBe(2);
		expect(sorted[2]!.builderTaskInstallCost.orderIndex).toBeNull();
	});

	it("all rows fall back to createdAt when orderIndex is null for all", () => {
		const items = [
			makeItem({ orderIndex: null, createdAt: d("2024-03-01T00:00:00Z"), icmId: 3 }),
			makeItem({ orderIndex: null, createdAt: d("2024-01-01T00:00:00Z"), icmId: 1 }),
			makeItem({ orderIndex: null, createdAt: d("2024-02-01T00:00:00Z"), icmId: 2 }),
		];
		const sorted = sortInstallCosts(items);
		expect(sorted.map((i) => i.installCostModel.id)).toEqual([1, 2, 3]);
	});

	it("stable output when same orderIndex and createdAt — resolves via title then id", () => {
		const common = {
			bticId: 1,
			orderIndex: 0,
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
