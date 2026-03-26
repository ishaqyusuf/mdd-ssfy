"use client";

import { batchAssignProductionOrdersAction } from "@/actions/batch-assign-production-orders";
import Img from "@/components/(clean-code)/img";
import {
	ProductionItemNotes,
	ProductionOrderNotes,
} from "@/components/production-v2/production-notes";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { printProduction } from "@/lib/quick-print";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { CalendarDayButton } from "@gnd/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Progress } from "@gnd/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Separator } from "@gnd/ui/separator";
import { Skeleton } from "@gnd/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { activityAnd, activityTag } from "@notifications/activity-tree";
import type { UpdateSalesControl } from "@sales/schema";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
	AlertTriangle,
	CalendarDays,
	CheckCircle2,
	ChevronDown,
	Clock3,
	MoreVertical,
	Package,
	Printer,
	Search,
	SquareCheckBig,
	UserRoundPlus,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import type { ReactNode } from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";

type Scope = "worker" | "admin";

type ProductionDashboardV2 = {
	summary: {
		queueCount: number;
		dueTodayCount: number;
		dueTomorrowCount: number;
		pastDueCount: number;
		completedCount: number;
	};
	alerts: {
		pastDue: ProductionListItem[];
		dueToday: ProductionListItem[];
		dueTomorrow: ProductionListItem[];
	};
	calendar: CalendarItem[];
	labels: { key: string; label: string; count: number }[];
};

type ProductionListItem = {
	id: number;
	uuid: string;
	orderId: string;
	customer?: string | null;
	salesRep?: string | null;
	assignedTo?: string | null;
	dueDate?: string | null;
	dueDateLabel?: string | null;
	completed?: boolean;
	alert?: {
		text?: string | null;
		dateString?: string | null;
	};
	status?: {
		production?: {
			status?: string | null;
			scoreStatus?: string | null;
		};
	};
};

type CalendarItem = {
	date: string;
	label: string;
	count: number;
	isToday: boolean;
	isTomorrow: boolean;
};

type ActivityCountNode = {
	children?: ActivityCountNode[];
};

type ProductionDetail = {
	orderId: string;
	salesId: number;
	customer?: string | null;
	salesRep?: string | null;
	items: {
		controlUid: string;
		salesId: number;
		itemId: number;
		isProduction: boolean;
		noteContext: {
			salesId: number;
			salesNo: string;
			itemId: number;
			itemControlId: number;
		};
		img?: string | null;
		title: string;
		subtitle?: string | null;
		qty?: {
			qty?: number | null;
		} | null;
		configs: {
			label?: string | null;
			value?: string | null;
			color?: string | null;
		}[];
		analytics?: {
			stats?: {
				prodAssigned?: {
					qty?: number | null;
				};
				prodCompleted?: {
					qty?: number | null;
				};
				dispatchCompleted?: {
					qty?: number | null;
				};
			};
		} | null;
		assignments?: {
			id: number;
			assignedTo?: string | null;
			assignedToId?: number | null;
			dueDate?: string | Date | null;
			createdAt?: string | Date | null;
			qty?: {
				qty?: number | null;
				lh?: number | null;
				rh?: number | null;
			} | null;
			submissions?: {
				id: number;
				createdAt?: string | Date | null;
				note?: string | null;
				deliveredQty?: number | null;
				qty?: {
					qty?: number | null;
					lh?: number | null;
					rh?: number | null;
				} | null;
			}[];
		}[];
	}[];
	actions: {
		canQuickAssign: boolean;
		canSubmitProduction: boolean;
		canDeleteSubmission: boolean;
	};
};

export function ProductionWorkerDashboardV2() {
	return (
		<ProductionV2Board
			scope="worker"
			title="Production Dashboard v2"
			description="A worker-first production screen with inline order detail, activity, and action zones."
		/>
	);
}

export function ProductionAdminBoardV2() {
	return (
		<ProductionV2Board
			scope="admin"
			title="Production Board v2"
			description="Admin production oversight with quick assign, completed labels, and inline order expansion."
		/>
	);
}

function ProductionV2Board({
	scope,
	title,
	description,
}: {
	scope: Scope;
	title: string;
	description: string;
}) {
	const trpc = useTRPC();
	const [search, setSearch] = useState("");
	const [label, setLabel] = useState("pending");
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [batchAssignedToId, setBatchAssignedToId] = useState("");
	const [batchDueDate, setBatchDueDate] = useState("");
	const deferredSearch = useDeferredValue(search);
	const { ref: loadMoreRef, inView } = useInView({
		rootMargin: "320px 0px",
	});
	const batchSales = useBatchSales();
	const loadingToast = useLoadingToast();
	const queryClient = useQueryClient();

	const dashboardQuery = useQuery(
		trpc.sales.productionDashboardV2.queryOptions({
			scope,
			production: label === "completed" ? "completed" : "pending",
		}),
	);
	const boardQuery = useInfiniteQuery(
		trpc.sales.productionsV2.infiniteQueryOptions(
			{
				scope,
				production: label === "completed" ? "completed" : "pending",
				show:
					label === "due-today" ||
					label === "due-tomorrow" ||
					label === "past-due"
						? (label as "due-today" | "due-tomorrow" | "past-due")
						: null,
				productionDueDate: selectedDate,
				q: deferredSearch || null,
				size: 20,
			},
			{
				getNextPageParam: (lastPage) => lastPage.meta?.cursor || undefined,
			},
		),
	);
	const employeeFiltersQuery = useQuery(
		trpc.filters.salesProductions.queryOptions(undefined, {
			enabled: scope === "admin",
		}),
	);

	const dashboard = dashboardQuery.data as ProductionDashboardV2 | undefined;
	const items = useMemo(
		() =>
			(boardQuery.data?.pages || []).flatMap(
				(page) => (page as { data?: ProductionListItem[] })?.data || [],
			) as ProductionListItem[],
		[boardQuery.data?.pages],
	);
	const dueDatesWithLoad = (dashboard?.calendar || [])
		.filter((item) => item.count > 0)
		.map((item) => new Date(`${item.date}T00:00:00`));
	const dueDateCalendarMap = useMemo(
		() =>
			new Map(
				(dashboard?.calendar || []).map((item) => [item.date, item] as const),
			),
		[dashboard?.calendar],
	);
	const pastDueDates = useMemo(
		() =>
			(dashboard?.calendar || [])
				.filter((item) => item.count > 0 && !item.isToday && !item.isTomorrow)
				.filter((item) => {
					const date = new Date(`${item.date}T00:00:00`);
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					return date < today;
				})
				.map((item) => new Date(`${item.date}T00:00:00`)),
		[dashboard?.calendar],
	);
	const dueTodayDates = useMemo(
		() =>
			(dashboard?.calendar || [])
				.filter((item) => item.count > 0 && item.isToday)
				.map((item) => new Date(`${item.date}T00:00:00`)),
		[dashboard?.calendar],
	);
	const dueTomorrowDates = useMemo(
		() =>
			(dashboard?.calendar || [])
				.filter((item) => item.count > 0 && item.isTomorrow)
				.map((item) => new Date(`${item.date}T00:00:00`)),
		[dashboard?.calendar],
	);
	const upcomingDueDates = useMemo(
		() =>
			(dashboard?.calendar || [])
				.filter((item) => item.count > 0 && !item.isToday && !item.isTomorrow)
				.filter((item) => {
					const date = new Date(`${item.date}T00:00:00`);
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					return date > today;
				})
				.map((item) => new Date(`${item.date}T00:00:00`)),
		[dashboard?.calendar],
	);

	const assignOptions = useMemo(() => {
		if (scope !== "admin") return [];
		const assignedFilter = employeeFiltersQuery.data?.find(
			(filter) => filter.value === "assignedToId",
		);
		return assignedFilter?.options || [];
	}, [employeeFiltersQuery.data, scope]);
	const allVisibleSelected =
		!!items.length && items.every((item) => selectedIds.includes(item.id));
	const selectedItems = useMemo(
		() => items.filter((item) => selectedIds.includes(item.id)),
		[items, selectedIds],
	);
	const batchAssign = useAction(batchAssignProductionOrdersAction, {
		onExecute: () => {
			loadingToast.loading("Assigning selected production orders...");
		},
		onSuccess: async ({ data }) => {
			loadingToast.success("Selected production orders assigned");
			setSelectedIds([]);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionsV2.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionDashboardV2.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionOrderDetailV2.pathKey(),
				}),
			]);
		},
		onError: ({ error }) => {
			loadingToast.error(
				error.serverError || "Unable to assign selected orders",
			);
		},
	});

	useEffect(() => {
		if (!inView || !boardQuery.hasNextPage || boardQuery.isFetchingNextPage) {
			return;
		}
		void boardQuery.fetchNextPage();
	}, [
		boardQuery.fetchNextPage,
		boardQuery.hasNextPage,
		boardQuery.isFetchingNextPage,
		inView,
	]);

	useEffect(() => {
		setSelectedIds((current) =>
			current.filter((id) => items.some((item) => item.id === id)),
		);
	}, [items]);

	async function runBatchAction(action: (ids: number[]) => Promise<void>) {
		const ids = selectedItems.map((item) => item.id);
		if (!ids.length) return;
		await action(ids);
		setSelectedIds([]);
	}

	return (
		<div className="grid gap-6">
			<section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
				<div className="grid gap-4">
					<section className="rounded-[28px] border bg-[linear-gradient(135deg,#0f172a_0%,#1f2937_55%,#0f766e_100%)] px-6 py-7 text-white shadow-xl shadow-slate-300/30">
						<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
							<div className="space-y-3">
								<Badge className="w-fit rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white hover:bg-white/10">
									{scope === "worker" ? "Worker v2" : "Admin v2"}
								</Badge>
								<div className="space-y-2">
									<h1 className="text-3xl font-semibold tracking-tight">
										{title}
									</h1>
									<p className="max-w-2xl text-sm leading-6 text-slate-200">
										{description}
									</p>
								</div>
							</div>
							<div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
								<div className="relative">
									<Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
									<Input
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder="Search production order or customer"
										className="h-11 rounded-2xl border-white/10 bg-white/10 pl-10 text-white placeholder:text-slate-300"
									/>
								</div>
								<Select value={label} onValueChange={setLabel}>
									<SelectTrigger className="h-11 rounded-2xl border-white/10 bg-white/10 text-white">
										<SelectValue placeholder="Choose label" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pending">Pending</SelectItem>
										<SelectItem value="due-today">Due Today</SelectItem>
										<SelectItem value="due-tomorrow">Due Tomorrow</SelectItem>
										<SelectItem value="past-due">Past Due</SelectItem>
										<SelectItem value="completed">Completed</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</section>

					<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
						<SummaryCard
							label={scope === "worker" ? "Assigned Queue" : "Open Queue"}
							value={dashboard?.summary.queueCount}
							icon={<Package className="h-4 w-4" />}
							active={label === "pending" && !selectedDate}
							onClick={() => {
								setLabel("pending");
								setSelectedDate(null);
							}}
						/>
						<SummaryCard
							label="Past Due"
							value={dashboard?.summary.pastDueCount}
							icon={<AlertTriangle className="h-4 w-4" />}
							active={label === "past-due" && !selectedDate}
							onClick={() => {
								setLabel("past-due");
								setSelectedDate(null);
							}}
						/>
						<SummaryCard
							label="Due Today"
							value={dashboard?.summary.dueTodayCount}
							icon={<Clock3 className="h-4 w-4" />}
							active={label === "due-today" && !selectedDate}
							onClick={() => {
								setLabel("due-today");
								setSelectedDate(null);
							}}
						/>
						<SummaryCard
							label="Due Tomorrow"
							value={dashboard?.summary.dueTomorrowCount}
							icon={<CalendarDays className="h-4 w-4" />}
							active={label === "due-tomorrow" && !selectedDate}
							onClick={() => {
								setLabel("due-tomorrow");
								setSelectedDate(null);
							}}
						/>
						<SummaryCard
							label="Completed"
							value={dashboard?.summary.completedCount}
							icon={<CheckCircle2 className="h-4 w-4" />}
							active={label === "completed" && !selectedDate}
							onClick={() => {
								setLabel("completed");
								setSelectedDate(null);
							}}
						/>
					</section>
				</div>

				<Card className="overflow-hidden rounded-[28px] xl:sticky xl:top-4">
					<CardHeader className="px-5 pb-3 pt-5">
						<CardTitle className="mb-1 flex items-center gap-2 text-lg">
							<CalendarDays className="h-5 w-5 text-sky-600" />
							Due Calendar
						</CardTitle>
						<CardDescription className="leading-6">
							Tap a date to filter production orders inline.
						</CardDescription>
					</CardHeader>
					<CardContent className="px-5 pb-5 pt-0">
						<div className="overflow-hidden rounded-[24px] border bg-slate-50/80 p-2">
							<Calendar
								mode="single"
								selected={
									selectedDate
										? new Date(`${selectedDate}T00:00:00`)
										: undefined
								}
								onSelect={(date) =>
									setSelectedDate(date ? formatCalendarDate(date) : null)
								}
								modifiers={{
									hasDue: dueDatesWithLoad,
									pastDue: pastDueDates,
									dueToday: dueTodayDates,
									dueTomorrow: dueTomorrowDates,
									upcomingDue: upcomingDueDates,
								}}
								modifiersClassNames={{
									hasDue:
										"rounded-full border border-sky-200 bg-sky-50 font-semibold text-sky-900",
								}}
								components={{
									DayButton: (props) => {
										const dateKey = formatCalendarDate(props.day.date);
										const entry = dueDateCalendarMap.get(dateKey);
										return (
											<CalendarDayButton {...props}>
												<span>{props.day.date.getDate()}</span>
												{entry?.count ? (
													<span className="mt-0.5 flex items-center justify-center">
														<span
															className={cn(
																"h-1.5 w-1.5 rounded-full",
																entry.isToday
																	? "bg-amber-500"
																	: entry.isTomorrow
																		? "bg-sky-500"
																		: isPastDueCalendarItem(entry)
																			? "bg-rose-500"
																			: "bg-emerald-500",
															)}
														/>
													</span>
												) : null}
											</CalendarDayButton>
										);
									},
								}}
								className="w-full bg-transparent p-1 [--cell-size:2.7rem]"
								classNames={{
									root: "w-full",
									month: "w-full gap-3",
									table: "w-full table-fixed border-collapse",
									month_caption:
										"mb-2 flex h-10 w-full items-center justify-center px-10",
									caption_label:
										"text-sm font-semibold uppercase tracking-[0.16em] text-slate-700",
									nav: "absolute inset-x-0 top-1 flex w-full items-center justify-between gap-1 px-1",
									button_previous:
										"h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-600 shadow-none",
									button_next:
										"h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-600 shadow-none",
									weekdays: "grid w-full grid-cols-7 gap-1.5 px-1",
									weekday:
										"flex h-8 items-center justify-center text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500",
									week: "mt-1.5 grid w-full grid-cols-7 gap-1.5 px-1",
									day: "flex items-center justify-center p-0",
								}}
							/>
						</div>
					</CardContent>
				</Card>
			</section>

			<section>
				<Card className="w-full rounded-[28px]">
					<CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<CardTitle className="text-lg">
								{scope === "worker"
									? "Assigned Productions"
									: "Production Orders"}
							</CardTitle>
							<CardDescription>
								Inline expansion replaces the old production modal in v2.
							</CardDescription>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{items.length ? (
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										setSelectedIds(
											allVisibleSelected ? [] : items.map((item) => item.id),
										)
									}
								>
									<SquareCheckBig className="h-4 w-4" />
									{allVisibleSelected ? "Clear visible" : "Select visible"}
								</Button>
							) : null}
							{selectedDate ? (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setSelectedDate(null)}
								>
									Clear date
								</Button>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						{selectedItems.length ? (
							<div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
								{selectedItems.length} production order
								{selectedItems.length > 1 ? "s" : ""} selected
							</div>
						) : null}
						{boardQuery.isPending
							? Array.from({ length: 4 }).map((_, index) => (
									<Skeleton
										key={index.toString()}
										className="h-24 rounded-2xl"
									/>
								))
							: items.map((item) => (
									<ProductionOrderCard
										key={item.id}
										scope={scope}
										item={item}
										isExpanded={expandedOrderId === item.orderId}
										onToggle={() =>
											setExpandedOrderId((current) =>
												current === item.orderId ? null : item.orderId,
											)
										}
										isSelected={selectedIds.includes(item.id)}
										onSelectionChange={(checked) =>
											setSelectedIds((current) =>
												checked
													? Array.from(new Set([...current, item.id]))
													: current.filter((id) => id !== item.id),
											)
										}
										assignOptions={assignOptions}
									/>
								))}
						{!boardQuery.isPending && !items.length ? (
							<div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
								No production orders match the current filters.
							</div>
						) : null}
						{items.length ? (
							<div className="space-y-3 pt-1">
								<div
									ref={loadMoreRef}
									className="flex min-h-12 items-center justify-center"
								>
									{boardQuery.isFetchingNextPage ? (
										<div className="grid w-full gap-3">
											<Skeleton className="h-20 rounded-2xl" />
											<Skeleton className="h-20 rounded-2xl" />
										</div>
									) : boardQuery.hasNextPage ? (
										<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
											Loading more orders as you scroll
										</p>
									) : (
										<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
											End of production orders
										</p>
									)}
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>
			</section>

			{selectedItems.length ? (
				<div className="fixed bottom-6 left-1/2 z-40 w-[min(92vw,720px)] -translate-x-1/2">
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/95 px-4 py-3 shadow-2xl backdrop-blur">
						<p className="text-sm font-medium">
							{selectedItems.length} selected
						</p>
						<div className="flex flex-wrap items-center gap-2">
							{scope === "admin" ? (
								<>
									<Select
										value={batchAssignedToId}
										onValueChange={setBatchAssignedToId}
									>
										<SelectTrigger className="h-9 w-[190px] rounded-xl bg-background">
											<SelectValue placeholder="Assign worker (optional)" />
										</SelectTrigger>
										<SelectContent>
											{assignOptions.map((option) => (
												<SelectItem
													key={String(option.value)}
													value={String(option.value)}
												>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Input
										type="date"
										value={batchDueDate}
										onChange={(event) => setBatchDueDate(event.target.value)}
										className="h-9 w-[160px] rounded-xl bg-background"
									/>
									<Button
										size="sm"
										variant="secondary"
										disabled={batchAssign.isExecuting}
										onClick={() =>
											batchAssign.execute({
												salesIds: selectedItems.map((item) => item.id),
												assignedToId: batchAssignedToId
													? Number(batchAssignedToId)
													: null,
												dueDate: batchDueDate
													? new Date(`${batchDueDate}T00:00:00`)
													: null,
											})
										}
									>
										Assign Selected
									</Button>
								</>
							) : null}
							<Button
								size="sm"
								onClick={() =>
									runBatchAction((ids) =>
										batchSales.markAsProductionCompleted(...ids),
									)
								}
							>
								Mark Production Complete
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() =>
									runBatchAction((ids) => batchSales.markAsFulfilled(...ids))
								}
							>
								Mark Fulfillment Complete
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setSelectedIds([])}
							>
								Clear
							</Button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

function ProductionOrderCard({
	scope,
	item,
	isExpanded,
	onToggle,
	isSelected,
	onSelectionChange,
	assignOptions,
}: {
	scope: Scope;
	item: ProductionListItem;
	isExpanded: boolean;
	onToggle: () => void;
	isSelected: boolean;
	onSelectionChange: (checked: boolean) => void;
	assignOptions: { label?: string; value?: string }[];
}) {
	const orderStatus = getOrderStatusPresentation(item);

	return (
		<Collapsible open={isExpanded} onOpenChange={() => onToggle()}>
			<Card className="overflow-hidden rounded-2xl border border-slate-200/80">
				<div className="flex items-start gap-3 px-5 py-4">
					<Checkbox
						checked={isSelected}
						onCheckedChange={(checked) => onSelectionChange(checked === true)}
						className="mt-1"
						aria-label={`Select ${item.orderId}`}
					/>
					<CollapsibleTrigger asChild>
						<button
							type="button"
							className="flex min-w-0 flex-1 flex-col gap-4 text-left md:flex-row md:items-center md:justify-between"
						>
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<p className="text-lg font-semibold tracking-tight">
										{item.orderId}
									</p>
									<Badge
										variant="outline"
										className={cn(
											"rounded-full border font-medium",
											orderStatus.className,
										)}
									>
										{orderStatus.label}
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground">
									{item.customer || "Customer unavailable"}
								</p>
								<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
									{item.salesRep
										? `Sales Rep: ${item.salesRep}`
										: "Sales rep unavailable"}
									{scope === "admin" && item.assignedTo
										? ` | Assigned: ${item.assignedTo}`
										: ""}
								</p>
							</div>
							<div className="flex items-center gap-3 self-end md:self-center">
								<div className="text-right">
									<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
										Due
									</p>
									<p className="text-sm font-medium">
										{item.dueDateLabel || item.alert?.dateString || "N/A"}
									</p>
								</div>
								<ChevronDown
									className={cn(
										"h-4 w-4 text-muted-foreground transition-transform",
										isExpanded && "rotate-180",
									)}
								/>
							</div>
						</button>
					</CollapsibleTrigger>
					<Button
						size="sm"
						variant="outline"
						className="rounded-xl"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							void printProduction({
								salesIds: [item.id],
							});
						}}
					>
						<Printer className="h-4 w-4" />
						Print
					</Button>
				</div>
				<CollapsibleContent className="border-t bg-muted/20">
					<ProductionOrderDetailInline
						scope={scope}
						salesNo={item.orderId}
						assignOptions={assignOptions}
					/>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}

function ProductionOrderDetailInline({
	scope,
	salesNo,
	assignOptions,
}: {
	scope: Scope;
	salesNo: string;
	assignOptions: { label?: string; value?: string }[];
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const detailQuery = useQuery(
		trpc.sales.productionOrderDetailV2.queryOptions({
			salesNo,
			scope,
		}),
	);
	const detail = detailQuery.data as ProductionDetail | undefined;
	const actionTrigger = useTaskTrigger({
		successToast: "Production action completed",
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionsV2.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionDashboardV2.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.productionOrderDetailV2.pathKey(),
				}),
			]);
		},
	});

	if (detailQuery.isPending) {
		return (
			<div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
				<Skeleton className="h-56 rounded-2xl" />
				<Skeleton className="h-56 rounded-2xl" />
			</div>
		);
	}

	const productionItems =
		detail?.items?.filter((item) => item.isProduction) || [];
	const assignableSelections = productionItems
		.map((item) => {
			const totalQty = item.qty?.qty || 0;
			const assignedQty =
				item.assignments?.reduce(
					(total, assignment) => total + (assignment.qty?.qty || 0),
					0,
				) || 0;
			const pendingQty = Math.max(totalQty - assignedQty, 0);
			if (!pendingQty) return null;
			return {
				uid: item.controlUid,
				qty: { qty: pendingQty },
			};
		})
		.filter(Boolean) as { uid: string; qty: { qty: number } }[];
	const submittableItemUids = productionItems
		.filter((item) => (item.assignments?.length || 0) > 0)
		.map((item) => item.controlUid);
	const submittedItems = productionItems.filter((item) =>
		item.assignments?.some(
			(assignment) => (assignment.submissions?.length || 0) > 0,
		),
	);
	const deliveredSubmissionCount = productionItems.reduce(
		(total, item) =>
			total +
			(item.assignments?.reduce(
				(assignmentTotal, assignment) =>
					assignmentTotal +
					(assignment.submissions?.filter(
						(submission) => (submission.deliveredQty || 0) > 0,
					).length || 0),
				0,
			) || 0),
		0,
	);
	const canDeleteAssignments =
		productionItems.some((item) => (item.assignments?.length || 0) > 0) &&
		submittedItems.length === 0 &&
		deliveredSubmissionCount === 0;
	const canDeleteSubmissions =
		submittedItems.length > 0 && deliveredSubmissionCount === 0;

	return (
		<Tabs defaultValue="productions" className="p-5">
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
							Order Overview
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Inline detail view for {detail?.orderId}.
						</p>
					</div>
					<div className="flex w-full items-center justify-end gap-2 md:w-auto">
						<TabsList className="grid w-full grid-cols-2 rounded-xl md:w-[260px]">
							<TabsTrigger value="productions">Productions</TabsTrigger>
							<TabsTrigger value="notes">Notes</TabsTrigger>
						</TabsList>
						<ProductionOrderActionsMenu
							scope={scope}
							assignOptions={assignOptions}
							assignableSelections={assignableSelections}
							submittableItemUids={submittableItemUids}
							canDeleteAssignments={canDeleteAssignments}
							canDeleteSubmissions={canDeleteSubmissions}
							productionItemIds={productionItems.map((item) => item.itemId)}
							submittedItemIds={submittedItems.map((item) => item.itemId)}
							onAction={(payload) =>
								actionTrigger.triggerWithAuth("update-sales-control", payload)
							}
							salesId={detail?.salesId}
						/>
					</div>
				</div>

				<TabsContent value="productions" className="mt-0 space-y-4">
					<Card className="rounded-2xl">
						<CardHeader>
							<CardTitle className="text-base">
								Production Information
							</CardTitle>
							<CardDescription>
								Expandable production items for this order.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{detail?.items?.length ? (
								<Accordion
									type="single"
									collapsible
									defaultValue={
										detail.items.find((item) => item.isProduction)?.controlUid
									}
									className="space-y-3"
								>
									{detail.items.map((productionItem) => (
										<AccordionItem
											key={productionItem.controlUid}
											value={productionItem.controlUid}
											className={cn(
												"overflow-hidden rounded-2xl border bg-background transition-colors",
												productionItem.isProduction
													? "hover:bg-muted/30"
													: "bg-muted/10",
											)}
										>
											<div className="px-4 pb-3 pt-4">
												<div className="flex items-start gap-4">
													{productionItem.img ? (
														<a
															href={buildCloudinaryDykeUrl(productionItem.img)}
															target="_blank"
															rel="noreferrer"
															className="block w-20 shrink-0"
															onClick={(event) => event.stopPropagation()}
														>
															<div className="overflow-hidden rounded-xl border bg-muted/30">
																<Img
																	src={productionItem.img}
																	aspectRatio={1}
																	alt={productionItem.title}
																/>
															</div>
														</a>
													) : null}
													{productionItem.isProduction ? (
														<AccordionTrigger className="group flex flex-1 cursor-pointer flex-col items-stretch px-2 py-2 text-left transition-colors hover:no-underline">
															<div className="flex items-start gap-3">
																<div className="min-w-0 flex-1">
																	<p className="font-semibold uppercase tracking-[0.08em] transition-colors group-hover:text-foreground">
																		{productionItem.title}
																	</p>
																	<p className="mt-1 text-sm uppercase tracking-[0.08em] text-muted-foreground transition-colors group-hover:text-foreground/80">
																		{productionItem.subtitle || "NO SUBTITLE"}
																	</p>
																</div>
															</div>
															<div className="mt-4 grid gap-3 md:grid-cols-3">
																<ProductionStatProgress
																	label="Assigned"
																	completed={
																		productionItem.analytics?.stats
																			?.prodAssigned?.qty
																	}
																	total={productionItem.qty?.qty}
																/>
																<ProductionStatProgress
																	label="Production"
																	completed={
																		productionItem.analytics?.stats
																			?.prodCompleted?.qty
																	}
																	total={productionItem.qty?.qty}
																/>
																<ProductionStatProgress
																	label="Fulfilled"
																	completed={
																		productionItem.analytics?.stats
																			?.dispatchCompleted?.qty
																	}
																	total={productionItem.qty?.qty}
																/>
															</div>
														</AccordionTrigger>
													) : (
														<div className="flex flex-1 flex-col items-stretch px-2 py-2 text-left opacity-70">
															<div className="flex items-start gap-3">
																<div className="min-w-0 flex-1">
																	<div className="flex flex-wrap items-center gap-2">
																		<p className="font-semibold uppercase tracking-[0.08em]">
																			{productionItem.title}
																		</p>
																		<Badge
																			variant="outline"
																			className="rounded-full text-[10px] uppercase tracking-[0.16em]"
																		>
																			Not Production
																		</Badge>
																	</div>
																	<p className="mt-1 text-sm uppercase tracking-[0.08em] text-muted-foreground">
																		{productionItem.subtitle || "NO SUBTITLE"}
																	</p>
																</div>
															</div>
															<div className="mt-4 grid gap-3 md:grid-cols-3">
																<ProductionStatProgress
																	label="Assigned"
																	completed={
																		productionItem.analytics?.stats
																			?.prodAssigned?.qty
																	}
																	total={productionItem.qty?.qty}
																/>
																<ProductionStatProgress
																	label="Production"
																	completed={
																		productionItem.analytics?.stats
																			?.prodCompleted?.qty
																	}
																	total={productionItem.qty?.qty}
																/>
																<ProductionStatProgress
																	label="Fulfilled"
																	completed={
																		productionItem.analytics?.stats
																			?.dispatchCompleted?.qty
																	}
																	total={productionItem.qty?.qty}
																/>
															</div>
														</div>
													)}
												</div>
											</div>
											{productionItem.isProduction ? (
												<AccordionContent className="border-t bg-muted/20 px-4 py-4">
													<ProductionItemDetailTabs
														scope={scope}
														productionItem={productionItem}
													/>
												</AccordionContent>
											) : null}
										</AccordionItem>
									))}
								</Accordion>
							) : (
								<div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
									No production items available for this order.
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="notes" className="mt-0">
					<Card className="rounded-2xl">
						<CardHeader>
							<CardTitle className="text-base">Order Notes</CardTitle>
							<CardDescription>
								Notes and activity for the full production order.
							</CardDescription>
						</CardHeader>
							<CardContent>
								<ProductionOrderNotes
									salesId={detail.salesId}
									salesNo={salesNo}
									scope={scope}
								/>
							</CardContent>
						</Card>
				</TabsContent>
			</div>
		</Tabs>
	);
}

function SummaryCard({
	label,
	value,
	icon,
	active = false,
	onClick,
}: {
	label: string;
	value?: number;
	icon: ReactNode;
	active?: boolean;
	onClick?: () => void;
}) {
	return (
		<Card
			className={cn(
				"rounded-2xl transition-all",
				onClick && "cursor-pointer hover:border-slate-300 hover:shadow-sm",
				active && "border-sky-300 bg-sky-50/60 shadow-sm",
			)}
			onClick={onClick}
		>
			<CardContent className="flex items-center justify-between gap-4 p-5">
				<div>
					<p
						className={cn(
							"text-sm text-muted-foreground",
							active && "text-sky-700",
						)}
					>
						{label}
					</p>
					<p className="mt-1 text-3xl font-semibold tracking-tight">
						{value ?? 0}
					</p>
				</div>
				<div
					className={cn(
						"rounded-full border bg-muted/40 p-3",
						active && "border-sky-200 bg-sky-100 text-sky-700",
					)}
				>
					{icon}
				</div>
			</CardContent>
		</Card>
	);
}

function ProductionItemDetailTabs({
	scope,
	productionItem,
}: {
	scope: Scope;
	productionItem: ProductionDetail["items"][number];
}) {
	const trpc = useTRPC();
	const notesQuery = useQuery(
		trpc.notes.activityTree.queryOptions({
			filter: activityAnd([
				activityTag("channel", "sales_item_info"),
				activityTag("salesId", productionItem.noteContext.salesId),
				activityTag("salesNo", productionItem.noteContext.salesNo),
				activityTag("itemId", productionItem.noteContext.itemId),
				activityTag("itemControlId", productionItem.noteContext.itemControlId),
			]),
			includeChildren: true,
			pageSize: 100,
			maxDepth: 4,
		}),
	);
	const notesCount = countActivityNodes(
		(notesQuery.data?.data as ActivityCountNode[] | undefined) || [],
	);
	const assignmentsCount = productionItem.assignments?.length || 0;

	return (
		<Tabs defaultValue="information" className="space-y-4">
			<TabsList className="grid w-full grid-cols-3 rounded-xl md:w-[420px]">
				<TabsTrigger value="information">Information</TabsTrigger>
				<TabsTrigger value="assignments">
					Assignments ({assignmentsCount})
				</TabsTrigger>
				<TabsTrigger value="notes">Notes ({notesCount})</TabsTrigger>
			</TabsList>

			<TabsContent value="information" className="mt-0">
				<div className="grid gap-3 sm:grid-cols-2">
					{productionItem.configs?.map((config, index) => (
						<div
							key={`${productionItem.controlUid}-${index}`}
							className="space-y-1 rounded-xl border bg-background p-3"
						>
							<p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
								{config.label}
							</p>
							<p className="text-sm font-medium uppercase tracking-[0.08em]">
								{config.value}
							</p>
						</div>
					))}
				</div>
			</TabsContent>

			<TabsContent value="assignments" className="mt-0">
				<div className="space-y-4">
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm font-semibold uppercase tracking-[0.16em]">
							Assignments
						</p>
						<div className="flex flex-wrap gap-2">
							{scope === "admin" ? (
								<>
									<Button size="sm" disabled>
										Assign
									</Button>
									<Button size="sm" variant="outline" disabled>
										Delete Assignment
									</Button>
								</>
							) : (
								<>
									<Button size="sm" disabled>
										Submit Assignment
									</Button>
									<Button size="sm" variant="outline" disabled>
										Delete Submission
									</Button>
								</>
							)}
						</div>
					</div>

					{productionItem.assignments?.length ? (
						<div className="space-y-3">
							{productionItem.assignments.map((assignment) => (
								<div
									key={assignment.id}
									className="space-y-3 rounded-xl border bg-background p-3"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div>
											<p className="text-sm font-medium">
												{assignment.assignedTo || "Unassigned"}
											</p>
											<p className="text-xs text-muted-foreground">
												Due:{" "}
												{assignment.dueDate
													? formatDateValue(assignment.dueDate)
													: "No due date"}
											</p>
										</div>
										<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
											QTY {assignment.qty?.qty || 0}
										</p>
									</div>

									{assignment.submissions?.length ? (
										<div className="space-y-2">
											{assignment.submissions.map((submission) => (
												<div
													key={submission.id}
													className="rounded-lg border bg-muted/20 p-3"
												>
													<div className="flex flex-wrap items-center justify-between gap-2">
														<p className="text-xs font-medium uppercase tracking-[0.16em]">
															Submission #{submission.id}
														</p>
														<p className="text-xs text-muted-foreground">
															{submission.createdAt
																? formatDateValue(submission.createdAt)
																: "No date"}
														</p>
													</div>
													<p className="mt-2 text-xs text-muted-foreground">
														QTY {submission.qty?.qty || 0}
														{submission.deliveredQty
															? ` | Delivered ${submission.deliveredQty}`
															: ""}
													</p>
													{submission.note ? (
														<p className="mt-2 text-sm">{submission.note}</p>
													) : null}
												</div>
											))}
										</div>
									) : (
										<div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
											No submissions yet.
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
							No assignments available for this item.
						</div>
					)}
				</div>
			</TabsContent>

			<TabsContent value="notes" className="mt-0">
				<div className="rounded-xl border bg-background p-3">
					<ProductionItemNotes
						context={productionItem.noteContext}
						title={productionItem.title}
						description={productionItem.subtitle}
					/>
				</div>
			</TabsContent>
		</Tabs>
	);
}

function ProductionOrderActionsMenu({
	scope,
	salesId,
	assignOptions,
	assignableSelections,
	submittableItemUids,
	productionItemIds,
	submittedItemIds,
	canDeleteAssignments,
	canDeleteSubmissions,
	onAction,
}: {
	scope: Scope;
	salesId?: number;
	assignOptions: { label?: string; value?: string }[];
	assignableSelections: { uid: string; qty: { qty: number } }[];
	submittableItemUids: string[];
	productionItemIds: number[];
	submittedItemIds: number[];
	canDeleteAssignments: boolean;
	canDeleteSubmissions: boolean;
	onAction: (payload: UpdateSalesControl) => void;
}) {
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<"main" | "worker" | "due-date">("main");
	const [assignedToId, setAssignedToId] = useState("");
	const [dueDate, setDueDate] = useState<Date | null>(new Date());

	if (!salesId) return null;

	function closeMenu() {
		setOpen(false);
		setStep("main");
	}

	return (
		<Menu
			open={open}
			onOpenChanged={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setStep("main");
			}}
			noSize
			Trigger={
				<Button variant="outline" size="icon" className="rounded-xl">
					<MoreVertical className="h-4 w-4" />
				</Button>
			}
			className="min-w-[240px]"
		>
			{step === "main" ? (
				<>
					<Menu.Item
						Icon={SquareCheckBig}
						shortCut={`${productionItemIds.length} items`}
						disabled
					>
						Mark All
					</Menu.Item>
					{scope === "admin" ? (
						<Menu.Item
							Icon={UserRoundPlus}
							shortCut={`QTY: ${assignableSelections.reduce(
								(total, item) => total + (item.qty.qty || 0),
								0,
							)}`}
							disabled={!assignableSelections.length}
							onClick={(event) => {
								event.preventDefault();
								setStep("worker");
							}}
						>
							Assign All
						</Menu.Item>
					) : null}
					<Menu.Item
						Icon={CheckCircle2}
						shortCut={`${submittableItemUids.length} items`}
						disabled={!submittableItemUids.length}
						onClick={(event) => {
							event.preventDefault();
							onAction({
								meta: {
									salesId,
								},
								submitAll: {
									itemUids: submittableItemUids,
								},
							} as UpdateSalesControl);
							closeMenu();
						}}
					>
						Submit All
					</Menu.Item>
					<Menu.Item
						Icon={Icons.Delete}
						shortCut={`${submittedItemIds.length} items`}
						disabled={!canDeleteSubmissions}
						onClick={(event) => {
							event.preventDefault();
							onAction({
								meta: {
									salesId,
								},
								deleteSubmissions: {
									itemIds: submittedItemIds,
								},
							} as UpdateSalesControl);
							closeMenu();
						}}
					>
						Delete Submissions
					</Menu.Item>
					<Menu.Item
						Icon={Icons.Delete}
						shortCut={`${productionItemIds.length} items`}
						disabled={!canDeleteAssignments}
						onClick={(event) => {
							event.preventDefault();
							onAction({
								meta: {
									salesId,
								},
								deleteAssignments: {
									itemIds: productionItemIds,
								},
							} as UpdateSalesControl);
							closeMenu();
						}}
					>
						Delete Assignments
					</Menu.Item>
				</>
			) : null}

			{step === "worker" ? (
				<div className="w-[260px] p-2">
					<div className="flex items-center gap-2 px-1 pb-2">
						<Button
							size="sm"
							variant="ghost"
							className="h-7 w-7 rounded-full p-0"
							onClick={() => setStep("main")}
						>
							<Icons.ChevronLeft className="size-3" />
						</Button>
						<Label>Select Production Worker</Label>
					</div>
					<Separator className="mb-2" />
					<div className="grid gap-1">
						{assignOptions.map((option) => (
							<Button
								key={String(option.value)}
								variant="ghost"
								className="justify-between rounded-lg"
								onClick={() => {
									setAssignedToId(String(option.value || ""));
									setStep("due-date");
								}}
							>
								<span>{option.label}</span>
							</Button>
						))}
					</div>
				</div>
			) : null}

			{step === "due-date" ? (
				<div className="w-[280px] p-2">
					<div className="flex items-center gap-2 px-1 pb-2">
						<Button
							size="sm"
							variant="ghost"
							className="h-7 w-7 rounded-full p-0"
							onClick={() => setStep("worker")}
						>
							<Icons.ChevronLeft className="size-3" />
						</Button>
						<Label>Due Date</Label>
					</div>
					<Separator className="mb-2" />
					<Calendar
						mode="single"
						selected={dueDate || undefined}
						onSelect={(value) => setDueDate(value || null)}
						className="bg-transparent p-0"
					/>
					<div className="mt-3 grid gap-2">
						<Button
							variant="outline"
							onClick={() => setDueDate(null)}
							className="w-full rounded-xl"
						>
							No Due Date
						</Button>
						<Button
							disabled={!assignedToId || !assignableSelections.length}
							onClick={() => {
								onAction({
									meta: {
										salesId,
									},
									createAssignments: {
										retries: 0,
										assignedToId: assignedToId ? Number(assignedToId) : null,
										dueDate,
										selections: assignableSelections,
									},
								} as UpdateSalesControl);
								closeMenu();
							}}
							className="w-full rounded-xl"
						>
							Proceed
						</Button>
					</div>
				</div>
			) : null}
		</Menu>
	);
}

function getOrderStatusPresentation(item: ProductionListItem) {
	if (item.completed) {
		return {
			label: "Completed",
			className: "border-emerald-200 bg-emerald-50 text-emerald-700",
		};
	}

	const status = String(
		item.status?.production?.scoreStatus ||
			item.status?.production?.status ||
			item.alert?.text ||
			"Open",
	).toLowerCase();

	if (status.includes("past due") || status.includes("overdue")) {
		return {
			label:
				item.status?.production?.scoreStatus || item.alert?.text || "Past Due",
			className: "border-rose-200 bg-rose-50 text-rose-700",
		};
	}

	if (status.includes("due today")) {
		return {
			label:
				item.status?.production?.scoreStatus || item.alert?.text || "Due Today",
			className: "border-amber-200 bg-amber-50 text-amber-700",
		};
	}

	if (status.includes("due tomorrow")) {
		return {
			label:
				item.status?.production?.scoreStatus ||
				item.alert?.text ||
				"Due Tomorrow",
			className: "border-sky-200 bg-sky-50 text-sky-700",
		};
	}

	if (status.includes("progress")) {
		return {
			label: item.status?.production?.scoreStatus || "In Progress",
			className: "border-blue-200 bg-blue-50 text-blue-700",
		};
	}

	return {
		label:
			item.status?.production?.scoreStatus ||
			item.status?.production?.status ||
			item.alert?.text ||
			"Open",
		className: "border-slate-200 bg-slate-50 text-slate-700",
	};
}

function ProductionStatProgress({
	label,
	completed,
	total,
}: {
	label: string;
	completed?: number | null;
	total?: number | null;
}) {
	const resolvedCompleted = completed || 0;
	const resolvedTotal = total || 0;
	const percentage =
		resolvedTotal > 0
			? Math.min((resolvedCompleted / resolvedTotal) * 100, 100)
			: 0;
	const tone =
		percentage >= 100
			? {
					text: "text-emerald-700",
					muted: "text-emerald-700/80",
					bar: "bg-emerald-500",
				}
			: percentage > 0
				? label === "Production"
					? {
							text: "text-amber-700",
							muted: "text-amber-700/80",
							bar: "bg-amber-500",
						}
					: label === "Fulfilled"
						? {
								text: "text-sky-700",
								muted: "text-sky-700/80",
								bar: "bg-sky-500",
							}
						: {
								text: "text-blue-700",
								muted: "text-blue-700/80",
								bar: "bg-blue-500",
							}
				: {
						text: "text-slate-600",
						muted: "text-slate-500",
						bar: "bg-slate-300",
					};

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between gap-3">
				<span
					className={cn(
						"text-[11px] font-medium uppercase tracking-[0.16em]",
						tone.text,
					)}
				>
					{label}
				</span>
				<span className={cn("text-xs", tone.muted)}>
					{resolvedCompleted}/{resolvedTotal} ({percentage.toFixed(0)}
					%)
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-muted">
				<div
					className={cn("h-full rounded-full transition-all", tone.bar)}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}

function buildCloudinaryDykeUrl(src: string) {
	const base = String(
		process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL || "",
	).replace(/\/$/, "");
	return `${base}/dyke/${src}`;
}

function formatDateValue(value: string | Date) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "Invalid date";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatCalendarDate(date: Date) {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function countActivityNodes(nodes: ActivityCountNode[]) {
	return nodes.reduce(
		(total, node) => total + 1 + countActivityNodes(node.children || []),
		0,
	);
}

function isPastDueCalendarItem(item: CalendarItem) {
	if (item.isToday || item.isTomorrow) return false;
	const date = new Date(`${item.date}T00:00:00`);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return date < today;
}
