"use client";

import type { ReactNode } from "react";
import { useEffect, Suspense } from "react";
import { useQuery } from "@gnd/ui/tanstack";
import {
	AlertTriangle,
	ArrowRight,
	CalendarDays,
	Clock3,
	Package,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesProductionFilterParams } from "@/hooks/use-sales-production-filter-params";
import { SalesProductionSearchFilter } from "./sales-production-search-filter";
import { DataTable } from "./tables/sales-production/data-table";
import { TableSkeleton } from "./tables/skeleton";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
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
}

type DashboardResponse = {
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

export function ProductionWorkspace({ mode }: Props) {
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
					<div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur sm:min-w-[320px]">
						<SalesProductionSearchFilter workerMode={workerMode} />
					</div>
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
							icon={<Package className="h-4 w-4" />}
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
							icon={<AlertTriangle className="h-4 w-4" />}
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
							icon={<Clock3 className="h-4 w-4" />}
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
							icon={<CalendarDays className="h-4 w-4" />}
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
				<Card className="rounded-3xl border-orange-200/70 bg-orange-50/60">
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-lg">
							<AlertTriangle className="h-5 w-5 text-orange-600" />
							Due now
						</CardTitle>
						<CardDescription>
							Start here when you need the most urgent production work fast.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 md:grid-cols-2">
						<AlertList
							title="Due today"
							items={dashboard?.alerts.dueToday || []}
							emptyLabel="No productions due today."
							onOpen={(item) =>
								overviewQuery.open2(item.uuid, "production-tasks")
							}
							onFilter={() =>
								applyPreset({
									show: "due-today",
								})
							}
						/>
						<AlertList
							title="Due tomorrow"
							items={dashboard?.alerts.dueTomorrow || []}
							emptyLabel="No productions due tomorrow."
							onOpen={(item) =>
								overviewQuery.open2(item.uuid, "production-tasks")
							}
							onFilter={() =>
								applyPreset({
									show: "due-tomorrow",
								})
							}
						/>
					</CardContent>
				</Card>

				<Card className="rounded-3xl">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between gap-3">
							<div>
								<CardTitle className="flex items-center gap-2 text-lg">
									<CalendarDays className="h-5 w-5 text-sky-600" />
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
					<CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
						{(dashboard?.calendar || []).map((item) => {
							const isActive = filters.productionDueDate === item.date;
							return (
								<button
									key={item.date}
									type="button"
									onClick={() =>
										applyPreset({
											production: null,
											show: null,
											productionDueDate: item.date,
										})
									}
									className={cn(
										"flex min-h-28 flex-col justify-between rounded-2xl border p-3 text-left transition-colors",
										isActive
											? "border-sky-500 bg-sky-50"
											: "border-border bg-muted/30 hover:bg-muted/60",
									)}
								>
									<div className="space-y-1">
										<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
											{item.shortLabel}
										</p>
										<p className="text-sm font-semibold">{item.label}</p>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-2xl font-semibold">{item.count}</span>
										<Badge
											variant={
												item.isToday
													? "destructive"
													: item.isTomorrow
														? "secondary"
														: "outline"
											}
											className="rounded-full"
										>
											{item.isToday
												? "Today"
												: item.isTomorrow
													? "Tomorrow"
													: "Open"}
										</Badge>
									</div>
								</button>
							);
						})}
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
					<Suspense fallback={<TableSkeleton />}>
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
									<ArrowRight className="h-4 w-4 text-muted-foreground" />
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
							<ArrowRight className="h-4 w-4" />
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
								<ArrowRight className="h-4 w-4 text-muted-foreground" />
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
