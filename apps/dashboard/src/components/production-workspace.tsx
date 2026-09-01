"use client";

import { Icons } from "@gnd/ui/icons";
import dynamic from "next/dynamic";

import { useQuery } from "@gnd/ui/tanstack";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";

import { PageTabs } from "@/components/page-tabs";
import {
	SalesProductionAnalyticsCard,
	SalesProductionAnalyticsCardSkeleton,
} from "@/components/sales-production/analytics-card";
import { createWorkerProductionPageTabs } from "@/components/sales-production/worker-tabs";
import { SalesProductionColumnVisibility } from "@/components/tables-2/sales-production/column-visibility";
import { DataTable } from "@/components/tables-2/sales-production/data-table";
import { SalesProductionSkeleton } from "@/components/tables-2/sales-production/skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";

type WorkspaceMode = "admin" | "worker";
type SalesProductionInput = RouterInputs["sales"]["productions"];

interface Props {
	mode: WorkspaceMode;
	initialTableSettings?: Partial<TableSettings>;
	defaultTableFilters?: SalesProductionInput;
}

export type DashboardResponse = {
	summary: {
		queueCount: number;
		dueTodayCount: number;
		dueTomorrowCount: number;
		pastDueCount: number;
		futureCount: number;
		unscheduledCount: number;
		completedCount: number;
	};
	alerts: {
		dueToday: DashboardItem[];
		dueTomorrow: DashboardItem[];
		pastDue: DashboardItem[];
	};
	calendar: CalendarItem[];
	spotlight: DashboardItem[];
};

type DashboardItem = {
	id: number;
	uuid: string;
	orderId: string;
	customer?: string | null;
	dueDateLabel?: string | null;
	alert?: {
		text?: string | null;
	};
};

type CalendarItem = {
	date: string;
	label: string;
	shortLabel: string;
	count: number;
	isToday: boolean;
	isTomorrow: boolean;
};

const SalesProductionSearchFilter = dynamic(
	() =>
		import("./sales-production-search-filter").then(
			(mod) => mod.SalesProductionSearchFilter,
		),
	{
		loading: () => <FilterCardSkeleton />,
	},
);

const ProductionMaterialReviewPanel = dynamic(
	() =>
		import("./production-v2/shared").then(
			(mod) => mod.ProductionMaterialReviewPanel,
		),
	{
		loading: () => <Skeleton className="h-56 rounded-3xl" />,
	},
);

const SalesProductionCalendar = dynamic(() =>
	import("./sales-production/calendar").then(
		(mod) => mod.SalesProductionCalendar,
	),
);

function FilterCardSkeleton() {
	return (
		<div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur sm:min-w-[320px]">
			<Skeleton className="h-10 w-full rounded-xl" />
		</div>
	);
}

function ProductionTableSkeleton({
	initialSettings,
	workerMode,
}: {
	initialSettings?: Partial<TableSettings>;
	workerMode: boolean;
}) {
	return (
		<SalesProductionSkeleton
			initialSettings={initialSettings}
			rowCount={8}
			workerMode={workerMode}
		/>
	);
}

function WorkerCalendarSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
				<Skeleton className="h-9 w-64 rounded-md" />
				<Skeleton className="h-9 w-36 rounded-md" />
			</div>
			<Card>
				<CardContent className="grid min-w-[980px] grid-cols-7 gap-2 p-4">
					{Array.from({ length: 7 }).map((_, index) => (
						<Skeleton
							key={`worker-calendar-${index + 1}`}
							className="h-64 w-full"
						/>
					))}
				</CardContent>
			</Card>
		</div>
	);
}

export function ProductionWorkspace({
	mode,
	initialTableSettings,
	defaultTableFilters,
}: Props) {
	const workerMode = mode === "worker";
	const trpc = useTRPC();
	const overviewQuery = useSalesOverviewQuery();
	const { filters, setFilters } = useSalesProductionFilterParams();

	const dashboardQuery = useQuery(
		workerMode
			? trpc.sales.productionDashboardTasks.queryOptions({
					priority: filters.priority || undefined,
				})
			: trpc.sales.productionDashboard.queryOptions({
					priority: filters.priority || undefined,
				}),
	);

	useEffect(() => {
		if (workerMode) {
			const hasWorkerView =
				!!filters.show ||
				!!filters.productionDueDate ||
				filters.tab === "calendar" ||
				filters.production === "completed";
			if (!hasWorkerView) {
				setFilters({
					tab: "queue",
					view: "table",
					production: "pending",
					show: "due-today",
				});
			}
			return;
		}

		const hasDefaultView =
			!!filters.show ||
			!!filters.production ||
			!!filters.productionDueDate ||
			!!filters.priority ||
			!!filters.q ||
			!!filters.salesNo ||
			!!filters.assignedToId;
		if (!hasDefaultView) {
			setFilters({
				production: "pending",
			});
		}
	}, [
		filters.assignedToId,
		filters.production,
		filters.productionDueDate,
		filters.priority,
		filters.q,
		filters.salesNo,
		filters.show,
		filters.tab,
		setFilters,
		workerMode,
	]);

	const pageCopy = workerMode
		? {
				title: "Production Dashboard",
				description:
					"See what is due today, what is coming tomorrow, and jump straight into your queue.",
				queueLabel: "My queue",
				helper: "Focused on assigned production work and due-date triage.",
			}
		: {
				title: "Production Board",
				description:
					"Monitor due dates, spot risk early, and keep the production line easy to operate.",
				queueLabel: "Active queue",
				helper:
					"Built for fast daily scanning, filtering, and order follow-up.",
			};

	const dashboard = dashboardQuery.data as DashboardResponse | undefined;

	const applyPreset = (preset: {
		production?: "pending" | "in progress" | "completed" | null;
		productionDueDate?: string | null;
		show?:
			| "due-today"
			| "due-tomorrow"
			| "past-due"
			| "future"
			| "unscheduled"
			| null;
	}) => {
		setFilters({
			production: preset.production ?? null,
			productionDueDate: preset.productionDueDate ?? null,
			show: preset.show ?? null,
		});
	};

	const activePreset = filters.productionDueDate
		? filters.productionDueDate
		: filters.show || filters.production || "pending";
	const selectedDueDate = filters.productionDueDate
		? new Date(`${filters.productionDueDate}T00:00:00`)
		: undefined;
	const calendarItems = dashboard?.calendar || [];
	const dueDatesWithLoad = calendarItems
		.filter((item) => item.count > 0)
		.map((item) => new Date(`${item.date}T00:00:00`));
	const selectedCalendarItem = calendarItems.find(
		(item) => item.date === filters.productionDueDate,
	);
	const workerView =
		filters.tab === "calendar"
			? "calendar"
			: filters.production === "completed" || filters.tab === "completed"
				? "completed"
				: filters.show || "due-today";
	const workerTabs = createWorkerProductionPageTabs({
		dueTodayCount: dashboard?.summary.dueTodayCount || 0,
		unscheduledCount: dashboard?.summary.unscheduledCount || 0,
		pastDueCount: dashboard?.summary.pastDueCount || 0,
		futureCount: dashboard?.summary.futureCount || 0,
		completedCount: dashboard?.summary.completedCount || 0,
	});
	const applyWorkerView = (
		view: "due-today" | "past-due" | "future" | "completed",
	) => {
		if (view === "completed") {
			setFilters({
				tab: "completed",
				view: "table",
				production: "completed",
				productionDueDate: null,
				show: null,
			});
			return;
		}

		setFilters({
			tab: "queue",
			view: "table",
			production: "pending",
			productionDueDate: null,
			show: view,
		});
	};

	return (
		<div className="flex flex-col gap-6">
			{workerMode ? null : (
				<section className="rounded-3xl border bg-gradient-to-br from-background via-background to-amber-50/60 p-5 sm:p-6">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-3xl space-y-3">
							<Badge
								variant="outline"
								className="w-fit rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-800"
							>
								{workerMode ? "Worker view" : "Operations view"}
							</Badge>
							<div className="space-y-2">
								<h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
									{pageCopy.title}
								</h2>
								<p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
									{pageCopy.description}
								</p>
							</div>
							<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
								{pageCopy.helper}
							</p>
						</div>
						<SalesProductionSearchFilter workerMode={workerMode} />
					</div>
				</section>
			)}

			{workerMode ? null : <ProductionMaterialReviewPanel />}

			{workerMode ? (
				<>
					<section
						aria-label="My production analytics"
						className="grid grid-cols-2 gap-3 xl:grid-cols-4"
					>
						{dashboardQuery.isPending || !dashboard ? (
							Array.from({ length: 4 }).map((_, index) => (
								<SalesProductionAnalyticsCardSkeleton key={index.toString()} />
							))
						) : (
							<>
								<SalesProductionAnalyticsCard
									active={workerView === "due-today"}
									title="Due today"
									value={dashboard.summary.dueTodayCount}
									description="Assigned to your account and due today."
									icon={<Icons.Clock3 className="h-4 w-4" />}
									color="#cdeb60d9"
									onClick={() => applyWorkerView("due-today")}
								/>
								<SalesProductionAnalyticsCard
									active={workerView === "past-due"}
									title="Past due"
									value={dashboard.summary.pastDueCount}
									description="Your overdue assignments needing attention."
									icon={<Icons.AlertTriangle className="h-4 w-4" />}
									color="#fb923cd9"
									onClick={() => applyWorkerView("past-due")}
								/>
								<SalesProductionAnalyticsCard
									active={workerView === "future"}
									title="Future"
									value={dashboard.summary.futureCount}
									description="Your assignments scheduled after today."
									icon={<Icons.CalendarDays className="h-4 w-4" />}
									color="#60a5fad9"
									onClick={() => applyWorkerView("future")}
								/>
								<SalesProductionAnalyticsCard
									active={workerView === "completed"}
									title="Completed"
									value={dashboard.summary.completedCount}
									description="Production assignments you have completed."
									icon={<Icons.CheckCircle2 className="h-4 w-4" />}
									color="#34d399d9"
									onClick={() => applyWorkerView("completed")}
								/>
							</>
						)}
					</section>
					<section className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<PageTabs
							portal={false}
							showAll={false}
							showManage={false}
							tabs={workerTabs}
							activeParams={
								workerView === "calendar"
									? {
											tab: "calendar",
											view: "calendar",
											production: "pending",
											productionDueDate: null,
											show: null,
										}
									: undefined
							}
							maxVisible={{ base: 6, lg: 6, "2xl": 6 }}
							className="lg:flex-1"
						/>
						<div className="min-w-0 lg:ml-auto lg:w-auto">
							<SalesProductionSearchFilter workerMode showSavedViews={false} />
						</div>
					</section>
				</>
			) : (
				<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{dashboardQuery.isPending || !dashboard ? (
						Array.from({ length: 4 }).map((_, index) => (
							<Card key={index.toString()} className="rounded-3xl">
								<CardHeader className="pb-3">
									<Skeleton className="h-4 w-28 rounded-full" />
								</CardHeader>
								<CardContent className="space-y-2">
									<Skeleton className="h-8 w-16 rounded-md" />
									<Skeleton className="h-4 w-36 rounded-md" />
								</CardContent>
							</Card>
						))
					) : (
						<>
							<SalesProductionAnalyticsCard
								active={activePreset === "pending"}
								title={pageCopy.queueLabel}
								value={dashboard.summary.queueCount}
								description="All open production records in the active queue."
								icon={<Icons.Package className="h-4 w-4" />}
								color="#66c8bfd9"
								onClick={() =>
									applyPreset({
										production: "pending",
									})
								}
							/>
							<SalesProductionAnalyticsCard
								active={activePreset === "past-due"}
								title="Past due"
								value={dashboard.summary.pastDueCount}
								description="Needs attention first before more work slips."
								icon={<Icons.AlertTriangle className="h-4 w-4" />}
								color="#fb923cd9"
								onClick={() =>
									applyPreset({
										show: "past-due",
									})
								}
							/>
							<SalesProductionAnalyticsCard
								active={activePreset === "due-today"}
								title="Due today"
								value={dashboard.summary.dueTodayCount}
								description="What must move now before the day closes."
								icon={<Icons.Clock3 className="h-4 w-4" />}
								color="#cdeb60d9"
								onClick={() =>
									applyPreset({
										show: "due-today",
									})
								}
							/>
							<SalesProductionAnalyticsCard
								active={activePreset === "due-tomorrow"}
								title="Due tomorrow"
								value={dashboard.summary.dueTomorrowCount}
								description="Tomorrow's pressure points you can prepare today."
								icon={<Icons.CalendarDays className="h-4 w-4" />}
								color="#60a5fad9"
								onClick={() =>
									applyPreset({
										show: "due-tomorrow",
									})
								}
							/>
						</>
					)}
				</section>
			)}

			{workerMode && workerView === "calendar" ? (
				<section aria-label="My production calendar">
					<Suspense fallback={<WorkerCalendarSkeleton />}>
						<SalesProductionCalendar workerMode />
					</Suspense>
				</section>
			) : null}

			{!workerMode ? (
				<section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
					<Card className="rounded-3xl">
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between gap-3">
								<div>
									<CardTitle className="flex items-center gap-2 text-lg">
										<Icons.CalendarDays className="h-5 w-5 text-sky-600" />
										Due-date calendar
									</CardTitle>
									<CardDescription>
										Compact date view for the next few working days.
									</CardDescription>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() =>
										applyPreset({
											production: "pending",
										})
									}
								>
									Reset
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="overflow-hidden rounded-2xl border bg-muted/20">
								<Calendar
									mode="single"
									selected={selectedDueDate}
									defaultMonth={selectedDueDate}
									onSelect={(date) => {
										if (!date) {
											applyPreset({
												production: "pending",
											});
											return;
										}
										applyPreset({
											production: null,
											show: null,
											productionDueDate: formatCalendarDate(date),
										});
									}}
									modifiers={{
										hasDue: dueDatesWithLoad,
									}}
									modifiersClassNames={{
										hasDue:
											"rounded-full border border-sky-200 bg-sky-50 font-semibold text-sky-900",
									}}
									className="w-full"
								/>
							</div>
							<div className="rounded-2xl border bg-background p-4">
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant="outline" className="rounded-full">
										Click a date to filter the queue
									</Badge>
									<Badge
										variant="outline"
										className="rounded-full border-sky-200 bg-sky-50 text-sky-800"
									>
										Blue dates have due work
									</Badge>
								</div>
								<div className="mt-4 flex items-start justify-between gap-4">
									<div className="space-y-1">
										<p className="text-sm font-medium">
											{selectedCalendarItem
												? selectedCalendarItem.label
												: "No date selected"}
										</p>
										<p className="text-sm text-muted-foreground">
											{selectedCalendarItem
												? `${selectedCalendarItem.count} production item(s) due`
												: "Select a date on the calendar to focus the queue."}
										</p>
									</div>
									{selectedCalendarItem ? (
										<Badge
											variant={
												selectedCalendarItem.isToday
													? "destructive"
													: selectedCalendarItem.isTomorrow
														? "secondary"
														: "outline"
											}
											className="rounded-full"
										>
											{selectedCalendarItem.isToday
												? "Today"
												: selectedCalendarItem.isTomorrow
													? "Tomorrow"
													: "Selected"}
										</Badge>
									) : null}
								</div>
							</div>
						</CardContent>
					</Card>
				</section>
			) : null}

			{!workerMode || workerView !== "calendar" || filters.productionDueDate ? (
				<section className="flex flex-col gap-3">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						{workerMode ? null : (
							<div>
								<h2 className="text-lg font-semibold tracking-tight">
									{pageCopy.queueLabel}
								</h2>
								<p className="text-sm text-muted-foreground">
									Current filter:{" "}
									<span className="font-medium text-foreground">
										{humanizeActiveFilter(activePreset)}
									</span>
								</p>
							</div>
						)}
						<div className="flex flex-wrap items-center gap-2">
							{workerMode ? null : (
								<>
									<SalesProductionColumnVisibility />
									<QuickFilterButton
										active={activePreset === "pending"}
										onClick={() =>
											applyPreset({
												production: "pending",
											})
										}
									>
										Active queue
									</QuickFilterButton>
									<QuickFilterButton
										active={activePreset === "past-due"}
										onClick={() =>
											applyPreset({
												show: "past-due",
											})
										}
									>
										Past due
									</QuickFilterButton>
									<QuickFilterButton
										active={activePreset === "due-today"}
										onClick={() =>
											applyPreset({
												show: "due-today",
											})
										}
									>
										Due today
									</QuickFilterButton>
									<QuickFilterButton
										active={activePreset === "due-tomorrow"}
										onClick={() =>
											applyPreset({
												show: "due-tomorrow",
											})
										}
									>
										Due tomorrow
									</QuickFilterButton>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											setFilters({
												production: null,
												productionDueDate: null,
												show: null,
												q: null,
												salesNo: null,
												assignedToId: null,
											})
										}
									>
										Clear filters
									</Button>
								</>
							)}
						</div>
					</div>
					<Suspense
						fallback={
							<ProductionTableSkeleton
								initialSettings={initialTableSettings}
								workerMode={workerMode}
							/>
						}
					>
						<DataTable
							initialSettings={initialTableSettings}
							defaultFilters={defaultTableFilters}
							workerMode={workerMode}
						/>
					</Suspense>
				</section>
			) : null}

			{!workerMode && dashboard?.alerts.pastDue?.length ? (
				<Card className="rounded-3xl border-red-200/80 bg-red-50/60">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg text-red-800">
							Past due follow-up
						</CardTitle>
						<CardDescription>
							Orders that already slipped and should be recovered first.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-2">
						{dashboard.alerts.pastDue.slice(0, 6).map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() =>
									overviewQuery.open2(item.uuid, "production-tasks")
								}
								className="flex items-center justify-between rounded-2xl border border-red-200 bg-background px-4 py-3 text-left hover:bg-red-50"
							>
								<div>
									<p className="font-medium">{item.orderId}</p>
									<p className="text-sm text-muted-foreground">
										{item.customer || "Customer unavailable"}
									</p>
								</div>
								<div className="flex items-center gap-3">
									<Badge variant="destructive" className="rounded-full">
										{item.alert?.text || "Past due"}
									</Badge>
									<Icons.ArrowRight className="h-4 w-4 text-muted-foreground" />
								</div>
							</button>
						))}
					</CardContent>
				</Card>
			) : null}

			{!workerMode ? (
				<div className="flex justify-end">
					<Button asChild variant="link" className="px-0">
						<Link href="/production/dashboard">
							Open worker dashboard view
							<Icons.ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
				</div>
			) : null}
		</div>
	);
}

function AlertList({
	title,
	items,
	emptyLabel,
	onOpen,
	onFilter,
}: {
	title: string;
	items: DashboardItem[];
	emptyLabel: string;
	onOpen: (item: DashboardItem) => void;
	onFilter: () => void;
}) {
	return (
		<div className="space-y-3 rounded-2xl border bg-background p-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="font-medium">{title}</h3>
					<p className="text-xs text-muted-foreground">
						{items.length
							? `${items.length} items ready for review.`
							: emptyLabel}
					</p>
				</div>
				<Button variant="ghost" size="sm" onClick={onFilter}>
					View list
				</Button>
			</div>
			<div className="space-y-2">
				{items.length ? (
					items.map((item) => (
						<button
							key={item.id}
							type="button"
							onClick={() => onOpen(item)}
							className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left hover:bg-muted/40"
						>
							<div>
								<p className="font-medium">{item.orderId}</p>
								<p className="text-sm text-muted-foreground">
									{item.customer || "Customer unavailable"}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<Badge variant="outline" className="rounded-full">
									{item.dueDateLabel || item.alert?.text || "Due date"}
								</Badge>
								<Icons.ArrowRight className="h-4 w-4 text-muted-foreground" />
							</div>
						</button>
					))
				) : (
					<div className="rounded-2xl border border-dashed px-3 py-6 text-sm text-muted-foreground">
						{emptyLabel}
					</div>
				)}
			</div>
		</div>
	);
}

function QuickFilterButton({
	children,
	active,
	onClick,
}: {
	children: ReactNode;
	active?: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			variant={active ? "secondary" : "outline"}
			size="sm"
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

function humanizeActiveFilter(activePreset: string) {
	if (!activePreset) return "All";
	if (activePreset === "pending") return "Active queue";
	if (activePreset === "past-due") return "Past due";
	if (activePreset === "due-today") return "Due today";
	if (activePreset === "due-tomorrow") return "Due tomorrow";
	if (activePreset === "future") return "Future assignments";
	if (activePreset === "unscheduled") return "Unscheduled assignments";
	if (activePreset === "completed") return "Completed assignments";
	if (/^\d{4}-\d{2}-\d{2}$/.test(activePreset)) return `Due on ${activePreset}`;
	return activePreset;
}

function formatCalendarDate(date: Date) {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}
