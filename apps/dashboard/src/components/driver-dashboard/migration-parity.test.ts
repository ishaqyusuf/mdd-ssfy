import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function source(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

const routeSource = source(
	"../../app/(sidebar)/(sales)/sales-book/dispatch-task/page.tsx",
);
const routeLoadingSource = source(
	"../../app/(sidebar)/(sales)/sales-book/dispatch-task/loading.tsx",
);
const layoutSource = source(
	"../../app/(sidebar)/(sales)/sales-book/dispatch-task/layout.tsx",
);
const modalRouteSource = source(
	"../../app/(sidebar)/(sales)/sales-book/dispatch-task/@modal/(.)[dispatchId]/page.tsx",
);
const modalLoadingSource = source(
	"../../app/(sidebar)/(sales)/sales-book/dispatch-task/@modal/(.)[dispatchId]/loading.tsx",
);
const detailRouteSource = source(
	"../../app/(sidebar)/(sales)/sales-book/dispatch-task/[dispatchId]/page.tsx",
);
const detailLoadingSource = source(
	"../../app/(sidebar)/(sales)/sales-book/dispatch-task/[dispatchId]/loading.tsx",
);
const workspaceSource = source("./workspace.tsx");
const commandHeaderSource = source("./header.tsx");
const summarySource = source("./summary.tsx");
const modalSource = source("./driver-stop-modal.tsx");
const stopRouteSource = source("./driver-stop-route.tsx");
const stopWorkspaceSource = source("./driver-stop-workspace.tsx");
const stopHeaderSource = source("./driver-stop-header.tsx");
const stopContentSource = source("./driver-stop-content.tsx");
const packingCommandSource = source("./driver-packing-command-dashboard.tsx");
const dashboardSkeletonSource = source("./skeleton.tsx");
const stopSkeletonSource = source("./driver-stop-skeleton.tsx");
const searchSource = source("./search-filter.tsx");
const packingOverviewSource = source("../dispatch-packing-overview/index.tsx");
const packingSideSheetSource = source(
	"../dispatch-packing-overview/packing-side-sheet.tsx",
);
const globalHeaderSource = source("../header.tsx");
const formContextSource = source("./driver-stop/form-context.tsx");
const proofSource = source("./driver-stop/proof-form.tsx");
const actionsSource = source("../../hooks/use-driver-dispatch-actions.ts");
const onlineStatusSource = source("../../hooks/use-online-status.ts");
const paramsSource = source("../../hooks/use-driver-dashboard-params.ts");

describe("driver dashboard Midday migration contract", () => {
	test("keeps the route server-composed and hydrates parallel driver queries", () => {
		expect(routeSource.includes("batchPrefetch")).toBe(true);
		expect(routeSource.includes("await batchPrefetch")).toBe(false);
		expect(routeSource.includes("driverManifest.infiniteQueryOptions")).toBe(
			true,
		);
		expect(routeSource.includes("driverWorkQueueSummary.queryOptions")).toBe(
			true,
		);
		expect(routeSource.includes("<HydrateClient>")).toBe(true);
		expect(routeSource.includes("<Suspense")).toBe(true);
		expect(routeSource.includes("DataTable")).toBe(false);
	});

	test("streams geometry-matched loading states for the dashboard and stop routes", () => {
		expect(routeLoadingSource.includes("<DriverDashboardSkeleton />")).toBe(
			true,
		);
		expect(
			routeLoadingSource.includes("<PageTitle>Dispatch Tasks</PageTitle>"),
		).toBe(true);
		expect(dashboardSkeletonSource.includes("Loading dispatch tasks")).toBe(
			true,
		);
		expect(dashboardSkeletonSource.includes("xl:grid-cols-5")).toBe(true);
		expect(dashboardSkeletonSource.includes("sm:grid-cols-3")).toBe(true);
		expect(dashboardSkeletonSource.includes("animate-pulse")).toBe(false);
		expect(stopRouteSource.includes("await batchPrefetch")).toBe(false);
		expect(detailLoadingSource.includes("showWorkspaceHeader={false}")).toBe(
			true,
		);
		expect(modalLoadingSource.includes("<DriverStopModal>")).toBe(true);
		expect(modalLoadingSource.includes("showWorkspaceHeader")).toBe(true);
		expect(stopSkeletonSource.includes("Loading dispatch stop")).toBe(true);
		expect(
			stopSkeletonSource.includes(
				"sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto]",
			),
		).toBe(true);
	});

	test("opens stops through a full-page intercepted route with a standalone fallback", () => {
		expect(layoutSource.includes("modal")).toBe(true);
		expect(modalRouteSource.includes("<DriverStopModal>")).toBe(true);
		expect(detailRouteSource.includes("<DriverStopRoute")).toBe(true);
		expect(modalSource.includes("h-[100dvh]")).toBe(true);
		expect(modalSource.includes("router.back()")).toBe(true);
		expect(stopRouteSource.includes("batchPrefetch")).toBe(true);
		expect(stopRouteSource.includes("dispatch.manifest.queryOptions")).toBe(
			true,
		);
		expect(stopRouteSource.includes("dispatchOverviewV2.queryOptions")).toBe(
			true,
		);
		expect(stopWorkspaceSource.includes("<DriverStopFormContext")).toBe(true);
		expect(stopWorkspaceSource.includes("<DriverStopContent")).toBe(true);
		expect(stopHeaderSource.includes("Today’s route")).toBe(true);
		expect(stopHeaderSource.includes("<Icons.Logo />")).toBe(true);
		expect(
			stopHeaderSource.includes("if (!modal && !isSubflow) return null"),
		).toBe(true);
		expect(stopRouteSource.includes("showWorkspaceHeader={modal}")).toBe(true);
		expect(stopContentSource.includes("canCaptureProof")).toBe(true);
		expect(stopContentSource.includes("canReportException")).toBe(true);
		expect(stopContentSource.includes("DriverPackingCommandDashboard")).toBe(
			true,
		);
		expect(packingCommandSource.includes("Stop packing dashboard")).toBe(true);
		expect(packingCommandSource.includes("Packing progress")).toBe(true);
		expect(packingCommandSource.includes("Available now")).toBe(true);
		expect(packingCommandSource.includes("Load status")).toBe(true);
		expect(packingCommandSource.includes("getDriverPrimaryAction")).toBe(true);
		expect(workspaceSource.includes("actions.onStartTrip")).toBe(false);
		expect(summarySource.includes("Packed stops")).toBe(true);
		expect(summarySource.includes("Ready to load")).toBe(false);
		expect(packingCommandSource.includes('surface="driver"')).toBe(true);
		expect(packingCommandSource.includes("PackingSideSheetSkeleton")).toBe(
			true,
		);
		expect(packingCommandSource.includes("DEFAULT_DISPATCH_TIME_ZONE")).toBe(
			true,
		);
		expect(packingCommandSource.includes("packingOpen && dispatch")).toBe(true);
		expect(packingOverviewSource.includes('layout="floating"')).toBe(true);
		expect(packingOverviewSource.includes('layout="inline"')).toBe(false);
		expect(packingSideSheetSource.includes('layout === "floating"')).toBe(true);
		expect(
			packingSideSheetSource.includes(
				'import CustomSheet from "@gnd/ui/custom/sheet-v2"',
			),
		).toBe(true);
		expect(packingSideSheetSource.includes('primarySize="2xl"')).toBe(true);
		expect(packingSideSheetSource.includes("dispatch-packing-drawer-")).toBe(
			true,
		);
		expect(packingSideSheetSource.includes("Loading packing form")).toBe(true);
		expect(packingOverviewSource.includes("<PackingSideSheetSkeleton />")).toBe(
			true,
		);
		expect(paramsSource.includes("DRIVER_STOP_URL_OPTIONS")).toBe(true);
		expect(paramsSource.includes("shallow: false")).toBe(true);
		expect(packingCommandSource.includes("DRIVER_STOP_URL_OPTIONS")).toBe(true);
		expect(stopHeaderSource.includes("DRIVER_STOP_URL_OPTIONS")).toBe(true);
		expect(stopContentSource.includes("DRIVER_STOP_URL_OPTIONS")).toBe(true);
	});

	test("uses the conventional search and sidebarless compact GND mark", () => {
		expect(searchSource.includes("SearchFilterProvider")).toBe(true);
		expect(searchSource.includes("SearchFilterTRPC")).toBe(true);
		expect(searchSource.includes("driverDashboardSearchParamsSchema")).toBe(
			true,
		);
		expect(searchSource.includes("fixedTabs={driverTabs}")).toBe(true);
		expect(
			searchSource.includes('maxVisible={{ base: 4, lg: 4, "2xl": 4 }}'),
		).toBe(true);
		expect(globalHeaderSource.includes("linkModules?.noSidebar")).toBe(true);
		expect(globalHeaderSource.includes("<Icons.Logo />")).toBe(true);
		expect(globalHeaderSource.includes("LogoLg")).toBe(false);
	});

	test("hydrates the connectivity indicator from a stable server snapshot", () => {
		expect(commandHeaderSource.includes("useOnlineStatus")).toBe(true);
		expect(proofSource.includes("useOnlineStatus")).toBe(true);
		expect(onlineStatusSource.includes("useSyncExternalStore")).toBe(true);
		expect(onlineStatusSource.includes("getServerOnlineSnapshot")).toBe(true);
		expect(
			proofSource.includes(
				'typeof navigator === "undefined" ? true : navigator.onLine',
			),
		).toBe(false);
	});

	test("persists versioned proof drafts and submits through the canonical proof mutation", () => {
		expect(formContextSource.includes("DRIVER_PROOF_DRAFT_VERSION = 1")).toBe(
			true,
		);
		expect(formContextSource.includes("window.localStorage")).toBe(true);
		expect(formContextSource.includes("requestId")).toBe(true);
		expect(proofSource.includes("draft.clearDraft()")).toBe(true);
		expect(proofSource.includes("completeWithProof.mutateAsync")).toBe(true);
		expect(actionsSource.includes("completeDispatchWithProof")).toBe(true);
		expect(actionsSource.includes("driverManifest.pathKey()")).toBe(true);
	});
});
