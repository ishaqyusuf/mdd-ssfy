import {
	normalizeTabQuery,
	pageTabQueriesMatch,
	queryContainsTabQuery,
} from "./query-utils";

type PageTabQueryItem = {
	query?: string;
};

export function getPageTabViewState({
	currentQuery,
	isReady,
	tabs,
}: {
	currentQuery?: string;
	isReady: boolean;
	tabs: PageTabQueryItem[];
}) {
	const normalizedCurrentQuery = normalizeTabQuery(currentQuery ?? "");
	const matchingTabIndex =
		isReady && normalizedCurrentQuery
			? tabs.findIndex(
					(tab) =>
						tab.query !== undefined &&
						pageTabQueriesMatch(normalizedCurrentQuery, tab.query),
				)
			: -1;
	const hasExactMatch = matchingTabIndex >= 0;

	return {
		hasExactMatch,
		hasUnsavedView: Boolean(
			isReady && normalizedCurrentQuery && !hasExactMatch,
		),
		matchingTabIndex,
	};
}

export function shouldRenderPageTabsShell({
	tabCount,
	hasAction,
	hasActionNode = hasAction,
}: {
	tabCount: number;
	hasAction?: boolean;
	hasActionNode?: boolean;
}) {
	return tabCount > 0 || Boolean(hasAction && hasActionNode);
}

export function isResolvedPageTabActive({
	hasSavedQuery,
	index,
	selectedIndex,
	fallbackActive,
}: {
	hasSavedQuery: boolean;
	index: number;
	selectedIndex: number;
	fallbackActive: boolean;
}) {
	return hasSavedQuery
		? selectedIndex >= 0 && index === selectedIndex
		: fallbackActive;
}

export function splitPageTabs<T>(
	tabs: T[],
	maxVisible = 3,
	selectedIndex = -1,
) {
	if (
		maxVisible > 0 &&
		selectedIndex >= maxVisible &&
		selectedIndex < tabs.length
	) {
		const visibleIndexes = new Set([
			...tabs.slice(0, Math.max(0, maxVisible - 1)).map((_, index) => index),
			selectedIndex,
		]);

		return {
			visibleTabs: tabs.filter((_, index) => visibleIndexes.has(index)),
			overflowTabs: tabs.filter((_, index) => !visibleIndexes.has(index)),
		};
	}

	return {
		visibleTabs: tabs.slice(0, maxVisible),
		overflowTabs: tabs.slice(maxVisible),
	};
}

export function getPageTabSelection({
	tabName,
	currentQuery,
	tabs,
}: {
	tabName?: string | null;
	currentQuery: string | URLSearchParams;
	tabs: Array<{ title: string; query?: string }>;
}) {
	if (!tabName) return { matchingTabIndex: -1, lockedKeys: [] as string[] };

	const candidates = tabs
		.map((tab, index) => ({
			index,
			normalizedQuery:
				tab.query === undefined ? "" : normalizeTabQuery(tab.query),
			querySize:
				tab.query === undefined
					? -1
					: Array.from(
							new URLSearchParams(normalizeTabQuery(tab.query)).entries(),
						).length,
			tab,
		}))
		.filter(
			({ tab }) =>
				tab.title === tabName &&
				tab.query !== undefined &&
				queryContainsTabQuery(currentQuery, tab.query),
		)
		.sort((left, right) => right.querySize - left.querySize);
	const bestCandidate = candidates[0];
	const hasAmbiguousBestMatch = candidates.some(
		(candidate) =>
			candidate !== bestCandidate &&
			candidate.querySize === bestCandidate?.querySize &&
			candidate.normalizedQuery !== bestCandidate?.normalizedQuery,
	);
	const matchingTabIndex = hasAmbiguousBestMatch
		? -1
		: (bestCandidate?.index ?? -1);
	if (matchingTabIndex < 0) {
		return { matchingTabIndex: -1, lockedKeys: [] as string[] };
	}

	const tab = tabs[matchingTabIndex];
	const lockedKeys = Array.from(
		new Set(new URLSearchParams(normalizeTabQuery(tab?.query ?? "")).keys()),
	).sort();

	return { matchingTabIndex, lockedKeys };
}
