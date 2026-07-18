import { normalizeTabQuery, pageTabQueriesMatch } from "./query-utils";

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
