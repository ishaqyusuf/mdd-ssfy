import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const dataTableSource = readFileSync(
	new URL("./data-table.tsx", import.meta.url),
	"utf8",
);
const emptyStatesSource = readFileSync(
	new URL("./empty-states.tsx", import.meta.url),
	"utf8",
);
const tableHeaderSource = readFileSync(
	new URL("./table-header.tsx", import.meta.url),
	"utf8",
);
const salesHeaderSource = readFileSync(
	new URL("../../sales-orders-v2-header.tsx", import.meta.url),
	"utf8",
);
const pageTabsSource = readFileSync(
	new URL("../../page-tabs/page-tabs.tsx", import.meta.url),
	"utf8",
);
const serverPageSource = readFileSync(
	new URL(
		"../../../app/(sidebar)/(sales)/sales-book/orders/page.tsx",
		import.meta.url,
	),
	"utf8",
);

function expectBefore(source: string, first: string, second: string) {
	const firstIndex = source.indexOf(first);
	const secondIndex = source.indexOf(second, firstIndex);

	expect(firstIndex).toBeGreaterThanOrEqual(0);
	expect(secondIndex).toBeGreaterThan(firstIndex);
}

describe("Sales Orders request-control wiring", () => {
	it("shares one normalized list input builder between server and client", () => {
		expect(serverPageSource).toContain("createSalesOrdersListQueryInput({");
		expect(dataTableSource).toContain("createSalesOrdersListQueryInput({");
	});

	it("cancels list and summary work for search, tab, and history transitions", () => {
		expect(salesHeaderSource).toContain(
			"onBeforeFilterChange: cancelSupersededOrdersRequests",
		);
		expect(salesHeaderSource).toContain(
			"onBeforePageTabChange={cancelSupersededOrdersRequests}",
		);
		expect(salesHeaderSource).toContain(
			'window.addEventListener("popstate", cancelSupersededOrdersRequests)',
		);
		expect(pageTabsSource).toContain(
			"onNavigate={tab.active ? undefined : onBeforeNavigate}",
		);
	});

	it("cancels before sort and clear-result query changes", () => {
		expectBefore(
			tableHeaderSource,
			"onBeforeSortChange?.();",
			"setSortQuery(field, defaultDirection);",
		);
		expectBefore(emptyStatesSource, "onBeforeClear?.();", "setFilters(");
	});

	it("keeps a stable accessible fallback on the guarded cursor request", () => {
		expect(dataTableSource).toContain("useGuardedInfiniteScroll");
		expect(dataTableSource).toContain("ref={loadMoreRef}");
		expect(dataTableSource).toContain("onClick={requestNextPage}");
		expect(dataTableSource).toContain('"Load more orders"');
	});
});
