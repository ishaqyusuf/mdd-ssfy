"use client";

import { Icons } from "@gnd/ui/icons";
import dynamic from "next/dynamic";

import { useQuery } from "@gnd/ui/tanstack";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
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

interface Props {
	mode: WorkspaceMode;
	initialDashboardData?: DashboardResponse;
	initialFilterList?: PageFilterData[];
}

export type DashboardResponse = {
	summary: {
		queueCount: number;
		dueTodayCount: number;
		dueTomorrowCount: number;
		pastDueCount: number;
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

const DataTable = dynamic(
	() =>
		import("./tables/sales-production/data-table").then((mod) => mod.DataTable),
	{
		loading: () => <ProductionTableSkeleton />,
	},
);

function FilterCardSkeleton() {
	return (
		<div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur sm:min-w-[320px]">
			<Skeleton className="h-10 w-full rounded-xl" />
		</div>
	);
}

function ProductionTableSkeleton() {
	return (
		<div className="space-y-3">
			<Skeleton className="h-10 w-full rounded-xl" />
			<Skeleton className="h-24 w-full rounded-xl" />
			<Skeleton className="h-24 w-full rounded-xl" />
			<Skeleton className="h-24 w-full rounded-xl" />
		</div>
	);
}

export function ProductionWorkspace({
	mode,
	initialDashboardData,
	initialFilterList,
}: Props) {
	const workerMode = mode === "worker";
	const auth = useAuth();
	const trpc = useTRPC();
	const overviewQuery = useSalesOverviewQuery();
	const { filters, setFilters } = useSalesProductionFilterParams();
	const workerId = auth.id ? Number(auth.id) : undefined;

	const dashboardQuery = useQuery(
		trpc.sales.productionDashboard.queryOptions(
			workerMode && workerId ? { workerId } : undefined,
			{
				enabled: workerMode ? !!workerId : true,
				initialData: initialDashboardData,
			},
		),
	);

	useEffect(() => {
		const hasDefaultView =
			!!filters.show ||
			!!filters.production ||
			!!filters.productionDueDate ||
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
		filters.q,
		filters.salesNo,
		filters.show,
		setFilters,
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
		production?: string | null;
		productionDueDate?: string | null;
		show?: string | null;
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

	return (
		<div className="flex flex-col gap-6">
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
					<SalesProductionSearchFilter
						workerMode={workerMode}
						initialFilterList={initialFilterList}
					/>
				</div>
			</section>

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
						<SummaryCard
							active={activePreset === "pending"}
							title={pageCopy.queueLabel}
							value={dashboard.summary.queueCount}
							description="All open production records in the active queue."
							icon={<Icons.Package className="h-4 w-4" />}
							onClick={() =>
								applyPreset({
									production: "pending",
								})
							}
						/>
						<SummaryCard
							active={activePreset === "past-due"}
							title="Past due"
							value={dashboard.summary.pastDueCount}
							description="Needs attention first before more work slips."
							icon={<Icons.AlertTriangle className="h-4 w-4" />}
							onClick={() =>
								applyPreset({
									show: "past-due",
								})
							}
						/>
						<SummaryCard
							active={activePreset === "due-today"}
							title="Due today"
							value={dashboard.summary.dueTodayCount}
							description="What must move now before the day closes."
							icon={<Icons.Clock3 className="h-4 w-4" />}
							onClick={() =>
								applyPreset({
									show: "due-today",
								})
							}
						/>
						<SummaryCard
							active={activePreset === "due-tomorrow"}
							title="Due tomorrow"
							value={dashboard.summary.dueTomorrowCount}
							description="Tomorrow's pressure points you can prepare today."
							icon={<Icons.CalendarDays className="h-4 w-4" />}
							onClick={() =>
								applyPreset({
									show: "due-tomorrow",
								})
							}
						/>
					</>
				)}
			</section>

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

			<Card className="rounded-3xl">
				<CardHeader className="gap-4 pb-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<CardTitle className="text-lg">{pageCopy.queueLabel}</CardTitle>
						<CardDescription>
							Current filter:{" "}
							<span className="font-medium text-foreground">
								{humanizeActiveFilter(activePreset)}
							</span>
						</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
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
					</div>
				</CardHeader>
				<CardContent>
					<Suspense fallback={<ProductionTableSkeleton />}>
						<DataTable workerMode={workerMode} />
					</Suspense>
				</CardContent>
			</Card>

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

function SummaryCard({
	title,
	value,
	description,
	icon,
	active,
	onClick,
}: {
	title: string;
	value: number;
	description: string;
	icon: ReactNode;
	active?: boolean;
	onClick: () => void;
}) {
	return (
		<button type="button" onClick={onClick} className="text-left">
			<Card
				className={cn(
					"h-full rounded-3xl transition-colors",
					active ? "border-sky-500 bg-sky-50" : "hover:bg-muted/40",
				)}
			>
				<CardHeader className="pb-2">
					<div className="flex items-center justify-between gap-3">
						<CardDescription>{title}</CardDescription>
						<div className="rounded-full border bg-background p-2">{icon}</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-1">
					<p className="text-3xl font-semibold tracking-tight">{value}</p>
					<p className="text-sm text-muted-foreground">{description}</p>
				</CardContent>
			</Card>
		</button>
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
	if (/^\d{4}-\d{2}-\d{2}$/.test(activePreset)) return `Due on ${activePreset}`;
	return activePreset;
}

function formatCalendarDate(date: Date) {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}
