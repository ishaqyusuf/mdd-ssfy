/**
 * Shared comparator for install-cost rows that carry builder-task-install sort metadata.
 *
 * Sort order:
 *  1. builderTaskInstallCost.orderIndex ascending (null → sorted last)
 *  2. builderTaskInstallCost.createdAt ascending  (null → sorted first)
 *  3. builderTaskInstallCost.id ascending         (stable tie-breaker)
 *  4. installCostModel.title ascending            (secondary display tie-breaker)
 *  5. installCostModel.id ascending               (final stable tie-breaker)
 */
export interface InstallCostSortKey {
	builderTaskInstallCost: {
		id: number;
		orderIndex: number | null;
		createdAt: Date | null;
	};
	installCostModel: {
		id: number;
		title: string;
	};
}

export function compareInstallCosts(
	a: InstallCostSortKey,
	b: InstallCostSortKey,
): number {
	const ta = a.builderTaskInstallCost;
	const tb = b.builderTaskInstallCost;

	// 1. orderIndex ascending — null values sort last
	const ia = ta.orderIndex ?? Infinity;
	const ib = tb.orderIndex ?? Infinity;
	if (ia !== ib) return ia - ib;

	// 2. createdAt ascending — null values sort first (treat as epoch 0)
	const ca = ta.createdAt?.getTime() ?? 0;
	const cb = tb.createdAt?.getTime() ?? 0;
	if (ca !== cb) return ca - cb;

	// 3. builderTaskInstallCost.id ascending
	if (ta.id !== tb.id) return ta.id - tb.id;

	// 4. installCostModel.title ascending
	const titleCmp = a.installCostModel.title.localeCompare(
		b.installCostModel.title,
	);
	if (titleCmp !== 0) return titleCmp;

	// 5. installCostModel.id ascending
	return a.installCostModel.id - b.installCostModel.id;
}

/**
 * Sort an array of install-cost items in place using the canonical comparator.
 * Returns a new sorted array (does not mutate the input).
 */
export function sortInstallCosts<T extends InstallCostSortKey>(
	items: T[],
): T[] {
	return [...items].sort(compareInstallCosts);
}

/**
 * Sort builder tasks by taskIndex → createdAt → id.
 * Returns a new sorted array (does not mutate the input).
 */
export function sortBuilderTasks<
	T extends { id: number; taskIndex?: number | null; createdAt?: Date | null },
>(tasks: T[]): T[] {
	return [...tasks].sort((a, b) => {
		const ia = a.taskIndex ?? Infinity;
		const ib = b.taskIndex ?? Infinity;
		if (ia !== ib) return ia - ib;

		const ca = a.createdAt?.getTime() ?? 0;
		const cb = b.createdAt?.getTime() ?? 0;
		if (ca !== cb) return ca - cb;

		return a.id - b.id;
	});
}
