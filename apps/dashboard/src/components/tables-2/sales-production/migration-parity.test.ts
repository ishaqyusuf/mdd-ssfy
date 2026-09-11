import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSource(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("Sales Production Sales Orders table migration parity", () => {
	it("keeps worker production routes on the restarted Sales Orders-style shell", () => {
		const routes = [
			"app/(sidebar)/(sales-production-worker)/production/dashboard/page.tsx",
			"app/(clean-code)/(sales)/sales-book/(pages)/production-tasks/page.tsx",
		];

		for (const route of routes) {
			const source = readSource(route);

			expect(source.includes("ScrollableContent")).toBe(true);
			expect(source.includes("HydrateClient")).toBe(true);
			expect(source.includes("batchPrefetch([")).toBe(true);
			expect(
				source.includes('getInitialTableSettings("sales-production")'),
			).toBe(true);
			expect(source.includes("ProductionWorkspace")).toBe(true);
			expect(source.includes("resolveSalesProductionWorkspaceQuery")).toBe(
				true,
			);
			expect(
				source.includes("initialTableSettings={initialTableSettings}"),
			).toBe(true);
			expect(source.includes("ScrollableContent")).toBe(true);
			expect(source.includes("batchPrefetch([")).toBe(true);
			expect(source.includes("getQueryClient")).toBe(false);
			expect(source.includes("fetchInfiniteQuery")).toBe(false);
			expect(source.includes("productionsV2")).toBe(false);
			expect(source.includes("LazyProduction")).toBe(false);
			expect(source.includes("PageStickyHeader")).toBe(false);
			expect(source.includes("@gnd/ui/data-table")).toBe(false);
		}
	});

	it("promotes the base worker dashboard and leaves v2 as a local redirect", () => {
		const canonical = readSource(
			"app/(sidebar)/(sales-production-worker)/production/dashboard/page.tsx",
		);
		const legacy = readSource(
			"app/(sidebar)/(sales-production-worker)/production/dashboard/v2/page.tsx",
		);
		const redirectEngine = readSource("lib/routing/redirect-engine.ts");
		const sidebar = readSource("components/sidebar-links.ts");

		expect(canonical.includes("ProductionWorkspace")).toBe(true);
		expect(canonical.includes("productionCalendarTasks")).toBe(true);
		expect(canonical.includes("defaultTableFilters={tableQueryInput}")).toBe(
			true,
		);
		expect(legacy.includes("redirect(`/production/dashboard${suffix}`)")).toBe(
			true,
		);
		expect(legacy.includes("ProductionWorkspace")).toBe(false);
		expect(
			redirectEngine.includes(
				'"/production/dashboard/v2": "/production/dashboard"',
			),
		).toBe(true);
		expect(
			redirectEngine.includes(
				'"/production/dashboard": "/production/dashboard/v2"',
			),
		).toBe(false);
		expect(sidebar.includes('"/production/dashboard/v2"')).toBe(false);
	});

	it("promotes the canonical admin route and leaves v2 as a local redirect", () => {
		const canonical = readSource(
			"app/(sidebar)/(sales)/sales-book/productions/page.tsx",
		);
		const legacy = readSource(
			"app/(sidebar)/(sales)/sales-book/productions/v2/page.tsx",
		);
		const redirectEngine = readSource("lib/routing/redirect-engine.ts");
		const sidebar = readSource("components/sidebar-links.ts");

		expect(canonical.includes("SalesProductionWorkspace")).toBe(true);
		expect(canonical.includes("import { ProductionWorkspace }")).toBe(false);
		expect(
			legacy.includes("redirect(`/sales-book/productions${suffix}`)"),
		).toBe(true);
		expect(legacy.includes("ProductionWorkspace")).toBe(false);
		expect(
			redirectEngine.includes(
				'"/sales-book/productions": "/sales-book/productions/v2"',
			),
		).toBe(false);
		expect(sidebar.includes('"/sales-book/productions"')).toBe(true);
	});

	it("uses Finance-style work tabs and preserves Sales Overview production opens", () => {
		const workspace = readSource("components/sales-production/workspace.tsx");
		const header = readSource("components/sales-production/header.tsx");
		const tabs = readSource("components/sales-production/tabs.ts");
		const reviews = readSource("components/sales-production/reviews.tsx");
		const table = readSource(
			"components/tables-2/sales-production/data-table.tsx",
		);
		const columns = readSource(
			"components/tables-2/sales-production/columns.tsx",
		);
		const pageTabs = readSource("components/page-tabs/page-tabs.tsx");
		const savePageTabButton = readSource(
			"components/page-tabs/save-page-tab-button.tsx",
		);

		expect(workspace.includes("SalesProductionHeader")).toBe(true);
		expect(workspace.includes("SalesProductionSummary")).toBe(false);
		expect(header.includes("<PageTabs")).toBe(true);
		expect(header.includes("showAll={false}")).toBe(true);
		expect(header.includes("tabs={pageTabs}")).toBe(true);
		expect(
			header.includes("createSalesProductionPageTabs(dashboard.summary)"),
		).toBe(true);
		expect(header.includes("SalesProductionDisplayToggle")).toBe(false);
		expect(header.includes("hiddenFilterKeys")).toBe(true);
		expect(
			header.includes(
				'searchClassName={isCalendar ? "max-xl:hidden" : undefined}',
			),
		).toBe(true);
		expect(tabs.includes('title: "Due Today"')).toBe(true);
		expect(tabs.includes('title: "Past Due"')).toBe(true);
		expect(tabs.includes('title: "Review"')).toBe(true);
		expect(tabs.includes('title: "Completed"')).toBe(true);
		expect(tabs.includes('title: "Calendar"')).toBe(true);
		expect(tabs.includes('title: "Active"')).toBe(true);
		expect(tabs.includes("count: dueTodayCount")).toBe(true);
		expect(tabs.includes("count: pastDueCount")).toBe(true);
		expect(tabs.includes("count: awaitingReviewCount")).toBe(true);
		expect(tabs.includes("count: completedCount")).toBe(true);
		expect(workspace.includes('view === "calendar"')).toBe(true);
		expect(reviews.includes("standalone")).toBe(true);
		expect(reviews.includes("search={filters.q}")).toBe(true);
		expect(
			table.includes('workerMode ? "production-tasks" : "sales-production"'),
		).toBe(true);
		expect(table.includes('className="md:hidden"')).toBe(true);
		expect(columns.includes("getProductionDueDatePresentation(dueDate)")).toBe(
			true,
		);
		expect(columns.includes('item.alert?.text || "Open"')).toBe(false);
		expect(columns.includes("function AssignedToBadge")).toBe(true);
		expect(pageTabs.includes("touch-pan-x")).toBe(true);
		expect(pageTabs.includes("overflow-x-auto scrollbar-hide")).toBe(true);
		expect(pageTabs.includes('aria-label="Scroll tabs left"')).toBe(true);
		expect(pageTabs.includes('aria-label="Scroll tabs right"')).toBe(true);
		expect(pageTabs.includes("new ResizeObserver(updateScrollState)")).toBe(true);
		expect(pageTabs.includes("rail.scrollBy({")).toBe(true);
		expect(pageTabs.includes("const isXl = useMediaQuery(screens.xl)")).toBe(true);
		expect(
			pageTabs.includes(
				"responsiveReady && !isXl ? resolvedTabs.length : visibleTabLimit",
			),
		).toBe(true);
		expect(pageTabs.includes("max-xl:hidden")).toBe(true);
		expect(savePageTabButton.includes("max-xl:hidden")).toBe(true);
		expect(
			columns.includes('variant={assignedTo ? "secondary" : "outline"}'),
		).toBe(true);
	});

	it("keeps the calendar as a responsive week and month production board", () => {
		const calendar = readSource("components/sales-production/calendar.tsx");
		const calendarLayout = readSource(
			"components/sales-production/calendar-layout.ts",
		);
		const planningCalendar = readSource(
			"components/sales-production/planning-calendar.tsx",
		);

		expect(calendar.includes("getOperationsCalendarPeriod")).toBe(true);
		expect(calendar.includes("OperationsCalendarPeriodPicker")).toBe(true);
		expect(calendar.includes("Previous ${calendarView}")).toBe(true);
		expect(calendar.includes("Next ${calendarView}")).toBe(true);
		expect(calendarLayout.includes("min-w-[980px]")).toBe(true);
		expect(
			calendarLayout.includes(
				"lg:max-[1400px]:landscape:min-w-[1470px]",
			),
		).toBe(true);
		expect(calendarLayout.includes("(max-width: 1279px)")).toBe(true);
		expect(calendar.includes("PRODUCTION_CALENDAR_GRID_WIDTH")).toBe(true);
		expect(calendar.includes("compactCalendar ? \"week\"")).toBe(true);
		expect(calendar.includes('className="max-xl:hidden"')).toBe(true);
		expect(
			planningCalendar.includes("PRODUCTION_CALENDAR_GRID_WIDTH"),
		).toBe(true);
		expect(calendar.includes("grid-cols-7")).toBe(true);
		expect(calendar.includes('value="week"')).toBe(true);
		expect(calendar.includes('value="month"')).toBe(true);
		expect(calendar.includes('item.status !== "completed"')).toBe(true);
		expect(calendar.includes('scope: "all"')).toBe(true);
		expect(calendar.includes("productionCalendarCardClasses")).toBe(true);
		expect(readSource("components/sales-production/calendar-colors.ts").includes("bg-emerald-100")).toBe(true);
		expect(calendar.includes("<Card")).toBe(true);
		expect(calendar.includes('<Card className="overflow-auto">')).toBe(true);
		expect(calendar.includes("<CardContent")).toBe(true);
		expect(calendar.includes('"sales-production"')).toBe(true);
		expect(calendar.includes("period.days.map((day)")).toBe(true);
	});

	it("supports a persistent expanded Sales Overview for production workers", () => {
		const overview = readSource(
			"components/sheets/sales-overview-sheet/index.tsx",
		);
		const overviewHeader = readSource(
			"components/sheets/sales-overview-sheet/layout.tsx",
		);
		const itemDetail = readSource(
			"components/sheets/sales-overview-sheet/production-item-detail.tsx",
		);
		const overviewStore = readSource("store/sales-overview-ui.ts");
		const priority = readSource("components/sales-priority-control.tsx");

		expect(overviewStore.includes('name: "sales-overview-ui"')).toBe(true);
		expect(overview.includes("fullscreen={expanded}")).toBe(true);
		expect(overviewHeader.includes('aria-label={')).toBe(true);
		expect(overviewHeader.includes('"Expand sales overview"')).toBe(true);
		expect(overviewHeader.includes('"Collapse sales overview"')).toBe(true);
		expect(
			itemDetail.includes('queryCtx.params.mode === "production-tasks"'),
		).toBe(true);
		expect(itemDetail.includes("workerMode && overviewExpanded")).toBe(true);
		expect(itemDetail.includes("lg:grid-cols-2")).toBe(true);
		expect(itemDetail.includes("Notes and activities")).toBe(true);
		const productionTab = readSource(
			"components/sheets/sales-overview-sheet/production-tab.tsx",
		);
		const productionTabV2 = readSource(
			"components/sheets/sales-overview-sheet/production/v2/production-tab-v2.tsx",
		);
		const productionDocumentV2 = readSource(
			"components/sheets/sales-overview-sheet/production/v2/production-item-document.tsx",
		);
		expect(productionTab.includes("itemNumber={i + 1}")).toBe(true);
		expect(productionTabV2.includes("itemNumber={index + 1}")).toBe(true);
		expect(productionTabV2.includes("Production item ${itemNumber}")).toBe(true);
		expect(productionTabV2.includes("divide-y divide-border")).toBe(true);
		expect(productionDocumentV2.includes("lg:grid-cols-2")).toBe(true);
		expect(productionDocumentV2.includes("lg:divide-x")).toBe(true);
		expect(priority.includes("<SelectLabel>Priority</SelectLabel>")).toBe(
			true,
		);
	});

	it("keeps the production workspace on the new tables-2 surface with compact table padding", () => {
		const source = readSource("components/production-workspace.tsx");

		expect(
			source.includes("components/tables-2/sales-production/data-table"),
		).toBe(true);
		expect(source.includes("SalesProductionColumnVisibility")).toBe(true);
		expect(source.includes("SalesProductionSkeleton")).toBe(true);
		expect(source.includes('className="flex flex-col gap-3"')).toBe(true);
		expect(
			source.includes(
				'workerView === "calendar" ? "max-xl:hidden" : undefined',
			),
		).toBe(true);
		expect(source.includes("initialTableSettings")).toBe(true);
		expect(source.includes('aria-label="My production analytics"')).toBe(true);
		expect(source.includes("const SHOW_PRODUCTION_ANALYTICS_CARDS = false")).toBe(
			true,
		);
		expect(
			source.includes("components/tables/sales-production/data-table"),
		).toBe(false);
		expect(source.includes("@gnd/ui/data-table")).toBe(false);
		expect(source.includes("fetchInfiniteQuery")).toBe(false);
	});

	it("keeps table-owned scroll, DnD, resize state, and worker/admin query support", () => {
		const source = readSource(
			"components/tables-2/sales-production/data-table.tsx",
		);

		expect(source.includes("VirtualRow")).toBe(true);
		expect(source.includes("useScrollHeader(parentRef)")).toBe(true);
		expect(source.includes("useTableDnd(table)")).toBe(true);
		expect(source.includes("<DndContext")).toBe(true);
		expect(source.includes('id="sales-production-table-dnd"')).toBe(true);
		expect(source.includes("collisionDetection={closestCenter}")).toBe(true);
		expect(source.includes("useTableScroll")).toBe(true);
		expect(source.includes("startFromColumn: workerMode ? 1 : 2")).toBe(true);
		expect(source.includes("trpc.sales.productionTasks")).toBe(true);
		expect(source.includes("trpc.sales.productions")).toBe(true);
		expect(source.includes("rowHeight={tableConfig.rowHeight}")).toBe(true);
		expect(source.includes("onRowSelectionChange: setRowSelection")).toBe(true);
		expect(source.includes("<BottomBar data={tableData} />")).toBe(true);
		expect(source.includes("!workerMode && showBottomBar")).toBe(true);
		expect(source.includes("estimateSize: () => tableConfig.rowHeight")).toBe(
			true,
		);
		expect(source.includes('height: "var(--header-offset, 0px)"')).toBe(true);
		expect(
			source.includes(
				'height: "calc(100vh - 350px + var(--header-offset, 0px))"',
			),
		).toBe(true);
	});

	it("reuses Sales Orders status actions for admin production batches only", () => {
		const columnsSource = readSource(
			"components/tables-2/sales-production/columns.tsx",
		);
		const bottomBarSource = readSource(
			"components/tables-2/sales-production/bottom-bar.tsx",
		);
		const storeSource = readSource(
			"components/tables-2/sales-production/store.ts",
		);

		expect(columnsSource.includes('id: "select"')).toBe(true);
		expect(columnsSource.includes('header: "Mark all"')).toBe(true);
		expect(columnsSource.includes("<SalesMenu.MarkAs")).toBe(true);
		expect(columnsSource.includes("showUnavailableFulfilled")).toBe(true);
		expect(bottomBarSource.includes("<SalesMenu.MarkAs")).toBe(true);
		expect(bottomBarSource.includes("showUnavailableFulfilled")).toBe(true);
		expect(bottomBarSource.includes('className="whitespace-nowrap"')).toBe(
			true,
		);
		expect(
			bottomBarSource.includes("statusCandidates={statusCandidates}"),
		).toBe(true);
		expect(storeSource.includes("rowSelection: RowSelectionState")).toBe(true);
	});

	it("keeps compact draggable headers, horizontal pagination, and resize handles", () => {
		const source = readSource(
			"components/tables-2/sales-production/table-header.tsx",
		);

		expect(source.includes("SortableContext")).toBe(true);
		expect(source.includes("horizontalListSortingStrategy")).toBe(true);
		expect(source.includes("DraggableHeader")).toBe(true);
		expect(source.includes("HorizontalPagination")).toBe(true);
		expect(source.includes("Mark all loaded production orders")).toBe(true);
		expect(source.includes("table.toggleAllRowsSelected")).toBe(true);
		expect(source.includes("getTableCellPaddingClass(tableConfig.style)")).toBe(
			true,
		);
		expect(source.includes("ResizeHandle")).toBe(true);
	});

	it("keeps Sales Production registered for compact settings and tailored column widths", () => {
		const settingsSource = readSource("utils/table-settings.ts");
		const configSource = readSource("utils/table-configs.ts");
		const columnsSource = readSource(
			"components/tables-2/sales-production/columns.tsx",
		);

		expect(settingsSource.includes('| "sales-production"')).toBe(true);
		expect(configSource.includes('"sales-production": {')).toBe(true);
		expect(configSource.includes('tableId: "sales-production"')).toBe(true);
		expect(configSource.includes('id: "dueDate"')).toBe(true);
		expect(configSource.includes("rowHeight: 40")).toBe(true);
		expect(configSource.includes('style: "compact"')).toBe(true);
		expect(columnsSource.includes("sizes.custom(140, 200, 160)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(120, 190, 140)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(190, 340, 240)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(180, 320, 220)")).toBe(true);
		expect(columnsSource.includes("sizes.custom(72, 96, 80)")).toBe(true);
		expect(
			columnsSource.includes("min-w-0 flex-1 truncate font-medium uppercase"),
		).toBe(true);
		expect(columnsSource.includes("md:sticky md:right-0")).toBe(true);
	});
});
