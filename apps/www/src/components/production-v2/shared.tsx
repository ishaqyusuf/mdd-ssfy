"use client";

import { batchAssignProductionOrdersAction } from "@/actions/batch-assign-production-orders";
import Img from "@/components/(clean-code)/img";
import {
	ProductionItemNotes,
	ProductionOrderNotes,
} from "@/components/production-v2/production-notes";
import { useAuth } from "@/hooks/use-auth";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { printProduction } from "@/lib/quick-print";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { ButtonGroup } from "@gnd/ui/button-group";
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
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { AlertDialog } from "@gnd/ui/namespace";
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
import {
	activityAnd,
	activityOr,
	activityTag,
} from "@notifications/activity-tree";
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
import { parseAsString, useQueryStates } from "nuqs";
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
				submittedBy?: string | null;
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

const productionV2FilterParams = {
	q: parseAsString,
	label: parseAsString,
	date: parseAsString,
	order: parseAsString,
};

export function ProductionWorkerDashboardV2() {
	return (
		<ProductionV2Board
			scope="worker"
			title="Production Dashboard"
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
	const [filters, setFilters] = useQueryStates(productionV2FilterParams);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [batchAssignedToId, setBatchAssignedToId] = useState("");
	const [batchDueDate, setBatchDueDate] = useState("");
	const search = filters.q ?? "";
	const activeLabel = filters.label ?? "pending";
	const selectedDate = filters.date ?? null;
	const expandedOrderId = filters.order ?? null;
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
			production: activeLabel === "completed" ? "completed" : "pending",
			productionDueDate: selectedDate,
			q: deferredSearch || null,
		}),
	);
	const boardQuery = useInfiniteQuery(
		trpc.sales.productionsV2.infiniteQueryOptions(
			{
				scope,
				production: activeLabel === "completed" ? "completed" : "pending",
				show:
					activeLabel === "due-today" ||
					activeLabel === "due-tomorrow" ||
					activeLabel === "past-due"
						? (activeLabel as "due-today" | "due-tomorrow" | "past-due")
						: null,
				productionDueDate: selectedDate,
				q: deferredSearch || null,
				size: 20,
			},
			{
				getNextPageParam: (lastPage) =>
					(lastPage as { meta?: { cursor?: string | null } })?.meta?.cursor ||
					undefined,
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

	function setActiveLabel(nextLabel: string) {
		void setFilters({
			label: nextLabel === "pending" ? null : nextLabel,
			date: null,
		});
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
										onChange={(event) =>
											void setFilters({
												q: event.target.value || null,
											})
										}
										placeholder="Search production order or customer"
										className="h-11 rounded-2xl border-white/10 bg-white/10 pl-10 text-white placeholder:text-slate-300"
									/>
								</div>
								<Select value={activeLabel} onValueChange={setActiveLabel}>
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
							active={activeLabel === "pending" && !selectedDate}
							onClick={() => setActiveLabel("pending")}
						/>
						<SummaryCard
							label="Past Due"
							value={dashboard?.summary.pastDueCount}
							icon={<AlertTriangle className="h-4 w-4" />}
							active={activeLabel === "past-due" && !selectedDate}
							onClick={() => setActiveLabel("past-due")}
						/>
						<SummaryCard
							label="Due Today"
							value={dashboard?.summary.dueTodayCount}
							icon={<Clock3 className="h-4 w-4" />}
							active={activeLabel === "due-today" && !selectedDate}
							onClick={() => setActiveLabel("due-today")}
						/>
						<SummaryCard
							label="Due Tomorrow"
							value={dashboard?.summary.dueTomorrowCount}
							icon={<CalendarDays className="h-4 w-4" />}
							active={activeLabel === "due-tomorrow" && !selectedDate}
							onClick={() => setActiveLabel("due-tomorrow")}
						/>
						<SummaryCard
							label="Completed"
							value={dashboard?.summary.completedCount}
							icon={<CheckCircle2 className="h-4 w-4" />}
							active={activeLabel === "completed" && !selectedDate}
							onClick={() => setActiveLabel("completed")}
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
									void setFilters({
										date: date ? formatCalendarDate(date) : null,
									})
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
									onClick={() => void setFilters({ date: null })}
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
											void setFilters({
												order:
													expandedOrderId === item.orderId
														? null
														: item.orderId,
											})
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
	const workerStatus =
		scope === "worker" ? (
			<WorkerOrderStatus
				orderId={item.orderId}
				fallbackCompleted={!!item.completed}
			/>
		) : null;

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
							className="flex min-w-0 flex-1 flex-col gap-4 text-left md:flex-row md:items-start md:justify-between"
						>
							<div className="space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<p className="text-lg font-semibold tracking-tight">
										{item.orderId}
									</p>
									{scope === "admin" ? (
										<Badge
											variant="outline"
											className={cn(
												"rounded-full border font-medium",
												orderStatus.className,
											)}
										>
											{orderStatus.label}
										</Badge>
									) : (
										workerStatus
									)}
								</div>
								<p className="text-sm text-muted-foreground">
									{item.customer || "Customer unavailable"}
								</p>
								<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
									{item.salesRep
										? `Sales Rep: ${item.salesRep}`
										: "Sales rep unavailable"}
								</p>
							</div>
							<div className="flex items-start gap-3 self-end md:self-start">
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
										"mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
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

function WorkerOrderStatus({
	orderId,
	fallbackCompleted,
}: {
	orderId: string;
	fallbackCompleted: boolean;
}) {
	const trpc = useTRPC();
	const detailQuery = useQuery(
		trpc.sales.productionOrderDetailV2.queryOptions(
			{
				salesNo: orderId,
				scope: "worker",
			},
			{
				staleTime: 60_000,
			},
		),
	);
	const detail = detailQuery.data as ProductionDetail | undefined;

	if (!detail) {
		return (
			<Badge variant="outline" className="rounded-full border-dashed">
				{fallbackCompleted ? "Completed" : "Worker queue"}
			</Badge>
		);
	}

	const summary = getWorkerItemCompletionSummary(detail.items);
	return (
		<Badge
			variant="outline"
			className={cn(
				"rounded-full border font-medium",
				summary.completed === summary.total && summary.total > 0
					? "border-emerald-200 bg-emerald-50 text-emerald-700"
					: "border-slate-200 bg-slate-50 text-slate-700",
			)}
		>
			{summary.label}
		</Badge>
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
	const resolvedSalesId = detail?.salesId ?? null;
	const orderNotesFilter =
		scope === "worker"
			? activityOr([
					activityAnd([
						activityTag("channel", "sales_info"),
						activityOr([
							activityTag("salesId", resolvedSalesId),
							activityTag("salesNo", salesNo),
						]),
					]),
					activityAnd([
						activityTag("channel", "sales_item_info"),
						activityOr([
							activityTag("salesId", resolvedSalesId),
							activityTag("salesNo", salesNo),
						]),
					]),
				])
			: activityOr([
					activityTag("salesId", resolvedSalesId),
					activityTag("salesNo", salesNo),
				]);
	const orderNotesQuery = useQuery(
		trpc.notes.activityTree.queryOptions(
			{
				filter: orderNotesFilter,
				includeChildren: true,
				pageSize: 100,
				maxDepth: 4,
			},
			{
				enabled: !!resolvedSalesId,
			},
		),
	);
	const orderNotesCount = countActivityNodes(
		(orderNotesQuery.data?.data as ActivityCountNode[] | undefined) || [],
	);

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
							<TabsTrigger value="productions">
								Productions ({productionItems.length})
							</TabsTrigger>
							<TabsTrigger value="notes">Notes ({orderNotesCount})</TabsTrigger>
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
					{detail?.items?.length ? (
						<ProductionItemsGrid scope={scope} items={detail.items} />
					) : (
						<div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
							No production items available for this order.
						</div>
					)}
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

function ProductionItemsGrid({
	scope,
	items,
}: {
	scope: Scope;
	items: ProductionDetail["items"];
}) {
	const productionItems = items.filter((item) => item.isProduction);
	const defaultExpandedUid = productionItems[0]?.controlUid ?? null;
	const [expandedItemUid, setExpandedItemUid] = useState<string | null>(
		defaultExpandedUid,
	);
	const rows = chunkProductionItems(items, 2);

	useEffect(() => {
		if (
			!expandedItemUid ||
			items.some((item) => item.controlUid === expandedItemUid)
		) {
			return;
		}
		setExpandedItemUid(defaultExpandedUid);
	}, [defaultExpandedUid, expandedItemUid, items]);

	return (
		<div className="space-y-3">
			{rows.map((row, rowIndex) => {
				const expandedRowItem =
					row.find((item) => item.controlUid === expandedItemUid) ?? null;
				const expandedColumnIndex = expandedRowItem
					? row.findIndex(
							(item) => item.controlUid === expandedRowItem.controlUid,
						)
					: -1;

				return (
					<div
						key={`production-row-${rowIndex.toString()}`}
						className="space-y-0"
					>
						<div className="grid gap-3 lg:grid-cols-2">
							{row.map((productionItem) => (
								<ProductionItemCard
									key={productionItem.controlUid}
									scope={scope}
									item={productionItem}
									isExpanded={expandedItemUid === productionItem.controlUid}
									onToggle={() =>
										setExpandedItemUid((current) =>
											current === productionItem.controlUid
												? null
												: productionItem.controlUid,
										)
									}
								/>
							))}
						</div>
						{expandedRowItem?.isProduction ? (
							<ExpandedItemOverview
								scope={scope}
								productionItem={expandedRowItem}
								rowLength={row.length}
								expandedColumnIndex={expandedColumnIndex}
							/>
						) : null}
					</div>
				);
			})}
		</div>
	);
}

function ExpandedItemOverview({
	scope,
	productionItem,
	rowLength,
	expandedColumnIndex,
}: {
	scope: Scope;
	productionItem: ProductionDetail["items"][number];
	rowLength: number;
	expandedColumnIndex: number;
}) {
	const showSteppedJoin = rowLength > 1 && expandedColumnIndex > -1;

	return (
		<div
			className={cn(
				"overflow-hidden pt-0 transition-all duration-300 ease-out",
				showSteppedJoin ? "animate-in fade-in-0 slide-in-from-top-1" : "",
			)}
		>
			{showSteppedJoin ? (
				<div className="hidden lg:grid lg:grid-cols-2 lg:gap-3">
					<div
						className={cn(
							"-mt-px h-5 transition-all duration-300 ease-out",
							expandedColumnIndex === 0
								? "relative border-x border-border bg-muted/50 after:absolute after:-right-1.5 after:bottom-0 after:h-px after:w-1.5 after:bg-border"
								: "border-b border-border bg-transparent",
						)}
					/>
					<div
						className={cn(
							"-mt-px h-5 transition-all duration-300 ease-out",
							expandedColumnIndex === 1
								? "relative border-x border-border bg-muted/50 after:absolute after:-left-1.5 after:bottom-0 after:h-px after:w-1.5 after:bg-border"
								: "border-b border-border bg-transparent",
						)}
					/>
				</div>
			) : null}
			<div
				className={cn(
					"rounded-b-2xl border border-border bg-muted/50 px-4 pb-4 pt-4 shadow-none transition-all duration-300 ease-out",
					showSteppedJoin ? "mt-0 border-t-0" : "-mt-4 border-t-0 pt-6",
				)}
			>
				<ProductionItemDetailTabs
					scope={scope}
					productionItem={productionItem}
				/>
			</div>
		</div>
	);
}

function ProductionItemCard({
	scope,
	item,
	isExpanded,
	onToggle,
}: {
	scope: Scope;
	item: ProductionDetail["items"][number];
	isExpanded: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			onClick={item.isProduction ? onToggle : undefined}
			disabled={!item.isProduction}
			className={cn(
				"relative overflow-hidden rounded-2xl border border-border bg-background px-4 pb-4 pt-4 text-left transition-[background-color,border-color,border-radius,transform,box-shadow] duration-300 ease-out",
				isExpanded && "rounded-b-none border-b-0 bg-muted/50 shadow-sm",
				item.isProduction ? "hover:bg-muted/30" : "cursor-default bg-muted/10",
			)}
		>
			<div
				className={cn(
					"flex items-start gap-4 transition-transform duration-300 ease-out",
					isExpanded && "translate-y-[-1px]",
				)}
			>
				{item.img ? (
					<a
						href={buildCloudinaryDykeUrl(item.img)}
						target="_blank"
						rel="noreferrer"
						className="block w-20 shrink-0"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="overflow-hidden rounded-xl border bg-muted/30">
							<Img src={item.img} aspectRatio={1} alt={item.title} />
						</div>
					</a>
				) : null}
				<div className="min-w-0 flex-1 pr-10">
					<div className="flex min-w-0 items-start gap-2">
						<div className="min-w-0 flex-1">
							{scope === "worker"
								? (() => {
										const workerItemStatus = getWorkerAssignmentStatus(item);
										return (
											<Badge
												variant="outline"
												className={cn(
													"mb-2 rounded-full",
													workerItemStatus.isCompleted
														? "border-emerald-200 bg-emerald-50 text-emerald-700"
														: "border-slate-200 bg-slate-50 text-slate-700",
												)}
											>
												{workerItemStatus.label}
											</Badge>
										);
									})()
								: null}
							<div className="flex flex-wrap items-center gap-2">
								<p className="font-semibold uppercase tracking-[0.08em]">
									{item.title}
								</p>
								{!item.isProduction ? (
									<Badge
										variant="outline"
										className="rounded-full text-[10px] uppercase tracking-[0.16em]"
									>
										Not Production
									</Badge>
								) : null}
							</div>
							<p className="mt-1 text-sm uppercase tracking-[0.08em] text-muted-foreground">
								{item.subtitle || "NO SUBTITLE"}
							</p>
						</div>
					</div>
					{scope === "admin" ? (
						<div className="mt-4 grid gap-3 md:grid-cols-2">
							<ProductionStatProgress
								label="Assigned"
								completed={item.analytics?.stats?.prodAssigned?.qty}
								total={item.qty?.qty}
							/>
							<ProductionStatProgress
								label="Production"
								completed={item.analytics?.stats?.prodCompleted?.qty}
								total={item.qty?.qty}
							/>
						</div>
					) : null}
				</div>
				{item.isProduction ? (
					<ChevronDown
						className={cn(
							"absolute right-4 top-4 h-4 w-4 text-muted-foreground transition-transform duration-300 ease-out",
							isExpanded && "rotate-180",
						)}
					/>
				) : null}
			</div>
		</button>
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
	const queryClient = useQueryClient();
	const auth = useAuth();
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
	const workerId = auth.id ? Number(auth.id) : null;
	const assignmentProgress = (productionItem.assignments || []).map(
		(assignment) => buildAssignmentSubmissionProgress(assignment),
	);
	const totalAssignedQty = assignmentProgress.reduce(
		(total, assignment) => total + assignment.assignmentQty.qty,
		0,
	);
	const totalSubmittedQty = assignmentProgress.reduce(
		(total, assignment) => total + assignment.submittedQty.qty,
		0,
	);
	const completedAssignmentsCount = assignmentProgress.filter(
		(assignment) => assignment.isCompleted,
	).length;
	const allAssignmentsSubmitted =
		assignmentProgress.length > 0 &&
		assignmentProgress.every((assignment) => assignment.isCompleted);
	const deliveredSubmissionCount = assignmentProgress.reduce(
		(total, assignment) =>
			total +
			(assignment.assignment.submissions?.reduce(
				(submissionTotal, submission) =>
					submissionTotal + (submission.deliveredQty || 0),
				0,
			) || 0),
		0,
	);
	const canSubmitThisItem =
		scope === "worker" &&
		assignmentProgress.some((assignment) => assignment.canSubmitMore) &&
		!!workerId;
	const canDeleteThisItem =
		productionItem.assignments?.some(
			(assignment) =>
				(assignment.submissions?.length || 0) > 0 &&
				(assignment.submissions || []).every(
					(submission) => (submission.deliveredQty || 0) === 0,
				),
		) && deliveredSubmissionCount === 0;
	const submissionsTabLabel =
		scope === "worker"
			? `My Progress ${totalSubmittedQty}/${totalAssignedQty}`
			: assignmentProgress.length === 1 &&
					assignmentProgress[0]?.submissionLimit
				? `Submissions ${assignmentProgress[0].submissionCount}/${assignmentProgress[0].submissionLimit}`
				: `Submissions (${completedAssignmentsCount}/${assignmentsCount})`;

	return (
		<Tabs defaultValue="information" className="space-y-4">
			<TabsList
				className={cn(
					"grid w-full rounded-xl",
					scope === "worker"
						? "grid-cols-3 md:w-[420px]"
						: "grid-cols-4 md:w-[560px]",
				)}
			>
				<TabsTrigger value="information">Overview</TabsTrigger>
				{scope === "admin" ? (
					<TabsTrigger value="assignments">
						Assignments ({assignmentsCount})
					</TabsTrigger>
				) : null}
				<TabsTrigger value="submissions">{submissionsTabLabel}</TabsTrigger>
				<TabsTrigger value="notes">Notes ({notesCount})</TabsTrigger>
			</TabsList>

			<TabsContent value="information" className="mt-0">
				<ProductionItemOverviewTab
					scope={scope}
					productionItem={productionItem}
					assignmentsCount={assignmentsCount}
					totalAssignedQty={totalAssignedQty}
					totalSubmittedQty={totalSubmittedQty}
				/>
			</TabsContent>

			{scope === "admin" ? (
				<TabsContent value="assignments" className="mt-0">
					<div className="space-y-4">
						<div className="flex items-center justify-between gap-3">
							<p className="text-sm font-semibold uppercase tracking-[0.16em]">
								Assignments
							</p>
							<Badge variant="outline" className="rounded-full px-3 py-1">
								{completedAssignmentsCount}/{assignmentsCount} ready
							</Badge>
						</div>

						{productionItem.assignments?.length ? (
							<div className="space-y-3">
								{assignmentProgress.map(
									({
										assignment,
										assignmentLabel,
										submittedLabel,
										pendingLabel,
										isCompleted,
									}) => (
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
												<div className="flex flex-wrap items-center gap-2">
													<Badge variant="outline" className="rounded-full">
														{assignmentLabel}
													</Badge>
													<Badge
														variant="outline"
														className={cn(
															"rounded-full",
															isCompleted &&
																"border-emerald-200 bg-emerald-50 text-emerald-700",
														)}
													>
														{submittedLabel}
													</Badge>
													{!isCompleted ? (
														<Badge variant="secondary" className="rounded-full">
															Pending {pendingLabel}
														</Badge>
													) : null}
												</div>
											</div>
											<p className="text-xs text-muted-foreground">
												{submittedLabel}
												{isCompleted ? " | All submissions completed" : ""}
											</p>
										</div>
									),
								)}
							</div>
						) : (
							<div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
								No assignments available for this item.
							</div>
						)}
					</div>
				</TabsContent>
			) : null}

			<TabsContent value="submissions" className="mt-0">
				<div className="space-y-4">
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm font-semibold uppercase tracking-[0.16em]">
							Submissions
						</p>
						<div className="flex items-center gap-2">
							{allAssignmentsSubmitted ? (
								<Badge className="rounded-full bg-emerald-600 text-white hover:bg-emerald-600">
									All submissions completed
								</Badge>
							) : null}
							{scope === "worker" && !canSubmitThisItem ? (
								<Badge variant="outline" className="rounded-full">
									No pending submissions
								</Badge>
							) : null}
							{canDeleteThisItem ? (
								<Badge variant="outline" className="rounded-full">
									Delete enabled
								</Badge>
							) : null}
						</div>
					</div>

					{productionItem.assignments?.length ? (
						<div className="space-y-3">
							{assignmentProgress.map((assignmentProgressItem) => (
								<AssignmentSubmissionCard
									key={assignmentProgressItem.assignment.id}
									scope={scope}
									workerId={workerId}
									authorId={workerId}
									authorName={auth.name || "System"}
									salesId={productionItem.salesId}
									progress={assignmentProgressItem}
									onSubmit={(payload) =>
										actionTrigger.triggerWithAuth(
											"update-sales-control",
											payload,
										)
									}
									onDeleteSubmission={(submissionId) =>
										actionTrigger.triggerWithAuth("update-sales-control", {
											meta: {
												salesId: productionItem.salesId,
												authorId: Number(auth.id || 0),
												authorName: auth.name || "System",
											},
											deleteSubmissions: {
												submissionIds: [submissionId],
											},
										} as UpdateSalesControl)
									}
									onUpdateSubmission={(submissionId, qty) =>
										actionTrigger.triggerWithAuth("update-sales-control", {
											meta: {
												salesId: productionItem.salesId,
												authorId: Number(auth.id || 0),
												authorName: auth.name || "System",
											},
											updateSubmissions: {
												submissions: [
													{
														submissionId,
														qty,
													},
												],
											},
										} as UpdateSalesControl)
									}
								/>
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

function ProductionItemOverviewTab({
	scope,
	productionItem,
	assignmentsCount,
	totalAssignedQty,
	totalSubmittedQty,
}: {
	scope: Scope;
	productionItem: ProductionDetail["items"][number];
	assignmentsCount: number;
	totalAssignedQty: number;
	totalSubmittedQty: number;
}) {
	const configRows = (productionItem.configs || []).filter(
		(config) => config.label || config.value,
	);
	const workerStatus = getWorkerAssignmentStatus(productionItem);

	return (
		<div className="space-y-3">
			<div className="rounded-xl border bg-background/80 p-4">
				<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
					<div className="space-y-1">
						<p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
							Item overview
						</p>
						<h4 className="text-sm font-semibold uppercase tracking-[0.08em]">
							{productionItem.title}
						</h4>
						<p className="text-sm text-muted-foreground">
							{productionItem.subtitle || "No extra description"}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<OverviewChip
							label="Item Qty"
							value={formatQtyLabel({
								qty: productionItem.qty?.qty || 0,
							})}
						/>
						<OverviewChip
							label={scope === "worker" ? "My progress" : "Submitted"}
							value={
								scope === "worker"
									? workerStatus.label
									: `${totalSubmittedQty}/${Math.max(totalAssignedQty, 0)}`
							}
						/>
						<OverviewChip
							label="Assignments"
							value={String(assignmentsCount)}
						/>
					</div>
				</div>
			</div>

			<div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
				<div className="rounded-xl border bg-background/80">
					<div className="border-b px-4 py-3">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
							Configuration
						</p>
					</div>
					{configRows.length ? (
						<div className="grid sm:grid-cols-2">
							{configRows.map((config, index) => (
								<div
									key={`${productionItem.controlUid}-${index}`}
									className="border-b px-4 py-3 even:sm:border-l last:border-b-0 [&:nth-last-child(2):nth-child(odd)]:sm:border-b-0"
								>
									<p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
										{config.label || "Detail"}
									</p>
									<p className="mt-1 text-sm font-medium">
										{config.value || "-"}
									</p>
								</div>
							))}
						</div>
					) : (
						<div className="px-4 py-5 text-sm text-muted-foreground">
							No configuration details available for this item.
						</div>
					)}
				</div>

				<div className="rounded-xl border bg-background/80 p-4">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
						Quick summary
					</p>
					<div className="mt-3 space-y-3">
						<OverviewRow
							label="Production item"
							value={productionItem.isProduction ? "Yes" : "No"}
						/>
						<OverviewRow label="Assignments" value={String(assignmentsCount)} />
						<OverviewRow
							label="Assigned qty"
							value={String(totalAssignedQty)}
						/>
						<OverviewRow
							label="Completed qty"
							value={String(totalSubmittedQty)}
						/>
						{scope === "worker" ? (
							<OverviewRow label="My status" value={workerStatus.label} />
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}

function OverviewChip({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-full border bg-muted/40 px-3 py-1.5">
			<p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
				{label}
			</p>
			<p className="text-sm font-medium">{value}</p>
		</div>
	);
}

function OverviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="text-right text-sm font-medium">{value}</p>
		</div>
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
	const auth = useAuth();
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<"main" | "worker" | "due-date">("main");
	const [assignedToId, setAssignedToId] = useState("");
	const [dueDate, setDueDate] = useState<Date | null>(new Date());

	if (!salesId) return null;

	function closeMenu() {
		setOpen(false);
		setStep("main");
	}
	const taskMeta = {
		salesId,
		authorId: Number(auth.id || 0),
		authorName: auth.name || "System",
	};

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
								meta: taskMeta,
								submitAll: {
									assignedToId:
										scope === "worker" && auth.id ? Number(auth.id) : null,
									itemUids: submittableItemUids,
								},
							} as UpdateSalesControl);
							closeMenu();
						}}
					>
						Submit All
					</Menu.Item>
					{scope === "admin" ? (
						<>
							<Menu.Item
								Icon={Icons.Delete}
								shortCut={`${submittedItemIds.length} items`}
								disabled={!canDeleteSubmissions}
								onClick={(event) => {
									event.preventDefault();
									onAction({
										meta: taskMeta,
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
										meta: taskMeta,
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
									meta: taskMeta,
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

type AssignmentProgress = {
	assignment: NonNullable<
		ProductionDetail["items"][number]["assignments"]
	>[number];
	assignmentQty: { qty: number; lh: number; rh: number };
	submittedQty: { qty: number; lh: number; rh: number };
	pendingQty: { qty: number; lh: number; rh: number };
	assignmentLabel: string;
	submittedLabel: string;
	pendingLabel: string;
	isHandled: boolean;
	isCompleted: boolean;
	canSubmitMore: boolean;
	submissionLimit: number | null;
	submissionCount: number;
};

function AssignmentSubmissionCard({
	scope,
	workerId,
	authorId,
	authorName,
	salesId,
	progress,
	onSubmit,
	onDeleteSubmission,
	onUpdateSubmission,
}: {
	scope: Scope;
	workerId: number | null;
	authorId: number | null;
	authorName: string;
	salesId: number;
	progress: AssignmentProgress;
	onSubmit: (payload: UpdateSalesControl) => void;
	onDeleteSubmission: (submissionId: number) => void;
	onUpdateSubmission: (
		submissionId: number,
		qty: { qty?: number; lh?: number; rh?: number },
	) => void;
}) {
	const [selectedQty, setSelectedQty] = useState("1");
	const [selectedHandle, setSelectedHandle] = useState<"lh" | "rh">("lh");
	const [deleteSubmissionId, setDeleteSubmissionId] = useState<number | null>(
		null,
	);
	const [editingSubmissionId, setEditingSubmissionId] = useState<number | null>(
		null,
	);
	const canSubmitLh = progress.pendingQty.lh > 0;
	const canSubmitRh = progress.pendingQty.rh > 0;
	const canDeleteSubmission = (progress.assignment.submissions || []).some(
		(submission) => (submission.deliveredQty || 0) === 0,
	);
	function resetForm() {
		setSelectedQty("1");
		setSelectedHandle(canSubmitLh ? "lh" : "rh");
	}

	function submitSelection(selection: {
		qty?: number;
		lh?: number;
		rh?: number;
	}) {
		if (!workerId) return;
		const normalized = normalizeQtyMatrix(selection);
		const hasQty = normalized.qty > 0 || normalized.lh > 0 || normalized.rh > 0;
		const exceedsPending = progress.isHandled
			? normalized.lh > progress.pendingQty.lh ||
				normalized.rh > progress.pendingQty.rh
			: normalized.qty > progress.pendingQty.qty;
		if (!hasQty || exceedsPending) return;
		onSubmit({
			meta: {
				salesId,
				authorId: Number(authorId || 0),
				authorName,
			},
			submitAll: {
				assignedToId: workerId,
				selections: [
					{
						assignmentId: progress.assignment.id,
						qty: normalized,
					},
				],
			},
		} as UpdateSalesControl);
		resetForm();
	}

	const pickedQty = toPositiveNumber(selectedQty);
	const activeHandle = selectedHandleValue(progress, selectedHandle);
	const pickedLh = activeHandle === "lh" ? pickedQty : 0;
	const pickedRh = activeHandle === "rh" ? pickedQty : 0;
	const pickedSingleQty = {
		qty: pickedQty,
	};
	const canSubmitSingleQty =
		scope === "worker" &&
		!!workerId &&
		progress.canSubmitMore &&
		pickedQty > 0 &&
		pickedQty <= progress.pendingQty.qty;
	const canSubmitSelectedLh =
		scope === "worker" &&
		!!workerId &&
		progress.canSubmitMore &&
		pickedLh > 0 &&
		pickedLh <= progress.pendingQty.lh;
	const canSubmitSelectedRh =
		scope === "worker" &&
		!!workerId &&
		progress.canSubmitMore &&
		pickedRh > 0 &&
		pickedRh <= progress.pendingQty.rh;

	return (
		<>
			<div className="space-y-3 border-b pb-3 last:border-b-0 last:pb-0">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-sm font-medium">
							{scope === "worker"
								? "My submission"
								: progress.assignment.assignedTo || "Unassigned"}
						</p>
						<p className="text-xs text-muted-foreground">
							Due:{" "}
							{progress.assignment.dueDate
								? formatDateValue(progress.assignment.dueDate)
								: "No due date"}
						</p>
					</div>
					<div className="flex flex-wrap items-center justify-end gap-4">
						<Badge variant="outline" className="rounded-full">
							{progress.assignmentLabel}
						</Badge>
						<Badge variant="outline" className="rounded-full">
							{progress.submittedLabel}
						</Badge>
						{!progress.isCompleted ? (
							<Badge variant="secondary" className="rounded-full">
								Pending {progress.pendingLabel}
							</Badge>
						) : null}
					</div>
				</div>

				{progress.assignment.submissions?.length ? (
					<div className="space-y-2">
						{progress.assignment.submissions.map((submission) => {
							const submissionIsDelivered = (submission.deliveredQty || 0) > 0;
							const isEditing = editingSubmissionId === submission.id;
							return (
								<div
									key={submission.id}
									className="rounded-lg border bg-muted/20 p-3"
								>
									<div className="flex flex-wrap items-start justify-between gap-2">
										<div>
											<p className="text-xs font-medium uppercase tracking-[0.16em]">
												Submission #{submission.id}
											</p>
											<div className="mt-1 space-y-1 text-xs text-muted-foreground">
												<p>
													Date submitted:{" "}
													{submission.createdAt
														? formatDateValue(submission.createdAt)
														: "No date"}
												</p>
												{scope === "admin" ? (
													<p>
														Submitted by: {submission.submittedBy || "Unknown"}
													</p>
												) : null}
											</div>
										</div>
										{canDeleteSubmission && !submissionIsDelivered ? (
											<div className="flex items-center gap-2">
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() =>
														setEditingSubmissionId(
															isEditing ? null : submission.id,
														)
													}
												>
													{isEditing ? "Close" : "Edit"}
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => setDeleteSubmissionId(submission.id)}
												>
													Delete
												</Button>
											</div>
										) : null}
									</div>
									<p className="mt-2 text-xs text-muted-foreground">
										{formatQtyLabel({
											qty: submission.qty?.qty || 0,
											lh: submission.qty?.lh || 0,
											rh: submission.qty?.rh || 0,
										})}
										{submission.deliveredQty
											? ` | Delivered ${submission.deliveredQty}`
											: ""}
									</p>
									{submission.note ? (
										<p className="mt-2 text-sm">{submission.note}</p>
									) : null}
									{isEditing ? (
										<SubmissionEditForm
											progress={progress}
											submission={submission}
											onCancel={() => setEditingSubmissionId(null)}
											onSave={(qty) => {
												onUpdateSubmission(submission.id, qty);
												setEditingSubmissionId(null);
											}}
										/>
									) : null}
								</div>
							);
						})}
					</div>
				) : (
					<div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
						No submissions yet.
					</div>
				)}

				{progress.isCompleted ? (
					<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
						All submissions completed
					</div>
				) : scope === "worker" ? (
					<div className="space-y-2 rounded-lg border border-dashed bg-muted/10 p-3">
						<SimpleSubmissionForm
							progress={progress}
							selectedQty={selectedQty}
							selectedHandle={
								canSubmitLh && canSubmitRh
									? selectedHandle
									: canSubmitLh
										? "lh"
										: "rh"
							}
							onQtyChange={setSelectedQty}
							onHandleChange={setSelectedHandle}
							onSubmit={() => {
								if (progress.isHandled) {
									const quantity = toPositiveNumber(selectedQty);
									submitSelection({
										qty: quantity,
										lh: activeHandle === "lh" ? quantity : 0,
										rh: activeHandle === "rh" ? quantity : 0,
									});
									return;
								}
								submitSelection(pickedSingleQty);
							}}
							onSubmitAll={() => {
								if (progress.isHandled) {
									submitSelection({
										qty: progress.pendingQty.qty,
										lh: progress.pendingQty.lh,
										rh: progress.pendingQty.rh,
									});
									return;
								}
								submitSelection({
									qty: progress.pendingQty.qty,
								});
							}}
							onSubmitAllLh={() =>
								submitSelection({
									qty: progress.pendingQty.lh,
									lh: progress.pendingQty.lh,
									rh: 0,
								})
							}
							onSubmitAllRh={() =>
								submitSelection({
									qty: progress.pendingQty.rh,
									lh: 0,
									rh: progress.pendingQty.rh,
								})
							}
							canSubmit={
								progress.isHandled
									? (canSubmitLh || canSubmitRh) &&
										(canSubmitLh && canSubmitRh
											? selectedHandle === "lh"
												? canSubmitSelectedLh
												: canSubmitSelectedRh
											: canSubmitLh
												? canSubmitSelectedLh
												: canSubmitSelectedRh)
									: canSubmitSingleQty
							}
							canSubmitAll={progress.canSubmitMore}
						/>
					</div>
				) : (
					<div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
						Submission entry is available in worker mode.
					</div>
				)}
			</div>

			<AlertDialog
				open={deleteSubmissionId !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteSubmissionId(null);
				}}
			>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Delete submission</AlertDialog.Title>
						<AlertDialog.Description>
							This will remove the selected submission from the production log.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							onClick={() => {
								if (!deleteSubmissionId) return;
								onDeleteSubmission(deleteSubmissionId);
								setDeleteSubmissionId(null);
							}}
						>
							Delete submission
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog>
		</>
	);
}

function SimpleSubmissionForm({
	progress,
	selectedQty,
	selectedHandle,
	onQtyChange,
	onHandleChange,
	onSubmit,
	onSubmitAll,
	onSubmitAllLh,
	onSubmitAllRh,
	canSubmit,
	canSubmitAll,
}: {
	progress: AssignmentProgress;
	selectedQty: string;
	selectedHandle: "lh" | "rh" | string;
	onQtyChange: (value: string) => void;
	onHandleChange: (value: "lh" | "rh") => void;
	onSubmit: () => void;
	onSubmitAll: () => void;
	onSubmitAllLh: () => void;
	onSubmitAllRh: () => void;
	canSubmit: boolean;
	canSubmitAll: boolean;
}) {
	const availableQty = progress.isHandled
		? selectedHandle === "rh"
			? progress.pendingQty.rh
			: progress.pendingQty.lh
		: progress.pendingQty.qty;
	const maxPresetQty = progress.isHandled
		? Math.max(progress.pendingQty.lh, progress.pendingQty.rh)
		: progress.pendingQty.qty;
	const quantityItems = buildQuantityComboboxItems(availableQty);
	const selectedItem = quantityItems.find((item) => item.id === selectedQty);
	const shouldShowCombobox = availableQty > 10;
	const presetValues = Array.from(
		{ length: Math.min(maxPresetQty, 10) },
		(_, index) => String(index + 1),
	);
	const canSelectLh = progress.pendingQty.lh > 0;
	const canSelectRh = progress.pendingQty.rh > 0;
	const hasHandleToggle = progress.isHandled;

	return (
		<div className="space-y-3 rounded-xl bg-muted/20 p-3">
			{availableQty <= 0 ? (
				<div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
					No quantity available
				</div>
			) : (
				<>
					<div className="flex flex-wrap items-end justify-end gap-4">
						{hasHandleToggle ? (
							<div className="space-y-1">
								<div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
									Select Handle
								</div>
								<ButtonGroup className="w-full sm:w-auto">
									<Button
										type="button"
										size="sm"
										variant={selectedHandle === "lh" ? "default" : "outline"}
										disabled={!canSelectLh}
										className="min-w-[64px]"
										onClick={() => onHandleChange("lh")}
									>
										{`LH (${progress.pendingQty.lh})`}
									</Button>
									<Button
										type="button"
										size="sm"
										variant={selectedHandle === "rh" ? "default" : "outline"}
										disabled={!canSelectRh}
										className="min-w-[64px]"
										onClick={() => onHandleChange("rh")}
									>
										{`RH (${progress.pendingQty.rh})`}
									</Button>
								</ButtonGroup>
							</div>
						) : null}
						<div className="space-y-1">
							<div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
								Select Qty
							</div>
							<ButtonGroup className="flex-wrap">
								{presetValues.map((qtyValue) => (
									<Button
										key={`qty-${qtyValue}`}
										type="button"
										size="sm"
										variant={
											Number(qtyValue) <=
											Math.min(Number(selectedQty), availableQty)
												? "default"
												: "outline"
										}
										className="min-w-9"
										disabled={Number(qtyValue) > availableQty}
										onClick={() => onQtyChange(qtyValue)}
									>
										{qtyValue}
									</Button>
								))}
							</ButtonGroup>
						</div>
						<ButtonGroup>
							<Button
								type="button"
								size="sm"
								disabled={!canSubmit}
								onClick={onSubmit}
								className="px-4"
							>
								Submit
							</Button>
							<Menu
								noSize
								Trigger={
									<Button
										type="button"
										size="icon"
										variant="outline"
										disabled={!canSubmitAll}
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
								}
							>
								<Menu.Item
									Icon={CheckCircle2}
									shortCut={formatSubmitAllLabel(progress.pendingQty)}
									onClick={(event) => {
										event.preventDefault();
										onSubmitAll();
									}}
								>
									Submit All
								</Menu.Item>
								{progress.isHandled &&
								progress.pendingQty.lh > 0 &&
								progress.pendingQty.rh > 0 ? (
									<Menu.Item
										Icon={CheckCircle2}
										shortCut={`${progress.pendingQty.rh}`}
										onClick={(event) => {
											event.preventDefault();
											onSubmitAllRh();
										}}
									>
										Submit All RH
									</Menu.Item>
								) : null}
								{progress.isHandled &&
								progress.pendingQty.lh > 0 &&
								progress.pendingQty.rh > 0 ? (
									<Menu.Item
										Icon={CheckCircle2}
										shortCut={`${progress.pendingQty.lh}`}
										onClick={(event) => {
											event.preventDefault();
											onSubmitAllLh();
										}}
									>
										Submit All LH
									</Menu.Item>
								) : null}
							</Menu>
						</ButtonGroup>
					</div>
					{shouldShowCombobox ? (
						<ComboboxDropdown
							items={quantityItems}
							selectedItem={selectedItem}
							onSelect={(item) => onQtyChange(item.id)}
							onCreate={(inputValue) => {
								const sanitized = inputValue.replace(/\D/g, "");
								const numeric = Number(sanitized);
								if (
									!sanitized ||
									!Number.isFinite(numeric) ||
									numeric < 1 ||
									numeric > availableQty
								) {
									return;
								}
								onQtyChange(String(numeric));
							}}
							renderOnCreate={(inputValue) => {
								const sanitized = inputValue.replace(/\D/g, "");
								if (!sanitized) return <span>Enter number only</span>;
								const numeric = Number(sanitized);
								if (numeric < 1 || numeric > availableQty) {
									return <span>{`Enter 1-${availableQty}`}</span>;
								}
								return <span>{`Use ${numeric}`}</span>;
							}}
							placeholder="Select quantity"
							searchPlaceholder="Type quantity"
							emptyResults="No quantity found"
							className="rounded-lg"
						/>
					) : null}
				</>
			)}
		</div>
	);
}

function SubmissionEditForm({
	progress,
	submission,
	onCancel,
	onSave,
}: {
	progress: AssignmentProgress;
	submission: NonNullable<
		NonNullable<AssignmentProgress["assignment"]["submissions"]>[number]
	>;
	onCancel: () => void;
	onSave: (qty: { qty?: number; lh?: number; rh?: number }) => void;
}) {
	const [qty, setQty] = useState(String(submission.qty?.qty || 0));
	const [lh, setLh] = useState(String(submission.qty?.lh || 0));
	const [rh, setRh] = useState(String(submission.qty?.rh || 0));
	const currentQty = normalizeQtyMatrix(submission.qty);
	const isHandled = progress.isHandled;
	const maxQty = currentQty.qty + progress.pendingQty.qty;
	const maxLh = currentQty.lh + progress.pendingQty.lh;
	const maxRh = currentQty.rh + progress.pendingQty.rh;

	return (
		<div className="mt-3 rounded-lg bg-background/80 p-3">
			<div className="grid gap-3 sm:grid-cols-2">
				{isHandled ? (
					<>
						<div className="space-y-2">
							<Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
								LH
							</Label>
							<Input
								type="number"
								min={0}
								max={maxLh}
								value={lh}
								onChange={(event) => setLh(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
								RH
							</Label>
							<Input
								type="number"
								min={0}
								max={maxRh}
								value={rh}
								onChange={(event) => setRh(event.target.value)}
							/>
						</div>
					</>
				) : (
					<div className="space-y-2 sm:col-span-2">
						<Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
							Qty
						</Label>
						<Input
							type="number"
							min={0}
							max={maxQty}
							value={qty}
							onChange={(event) => setQty(event.target.value)}
						/>
					</div>
				)}
			</div>
			<div className="mt-3 flex justify-end gap-2">
				<Button type="button" size="sm" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button
					type="button"
					size="sm"
					onClick={() =>
						onSave(
							isHandled
								? {
										qty: toPositiveNumber(lh) + toPositiveNumber(rh),
										lh: toPositiveNumber(lh),
										rh: toPositiveNumber(rh),
									}
								: {
										qty: toPositiveNumber(qty),
									},
						)
					}
				>
					Save
				</Button>
			</div>
		</div>
	);
}

function selectedHandleValue(
	progress: AssignmentProgress,
	selectedHandle: string,
) {
	if (!progress.isHandled) return "qty";
	if (selectedHandle === "lh" && progress.pendingQty.lh > 0) return "lh";
	if (selectedHandle === "rh" && progress.pendingQty.rh > 0) return "rh";
	if (progress.pendingQty.lh > 0) return "lh";
	if (progress.pendingQty.rh > 0) return "rh";
	return "qty";
}

function formatSubmitAllLabel(qty: { qty?: number; lh?: number; rh?: number }) {
	const normalized = normalizeQtyMatrix(qty);
	if (normalized.lh > 0 || normalized.rh > 0) {
		return [
			normalized.lh ? `${normalized.lh} LH` : null,
			normalized.rh ? `${normalized.rh} RH` : null,
		]
			.filter(Boolean)
			.join(" & ");
	}
	return `${normalized.qty}`;
}

function getWorkerItemCompletionSummary(items: ProductionDetail["items"]) {
	const productionItems = items.filter((item) => item.isProduction);
	const total = productionItems.length;
	const completed = productionItems.filter((item) => {
		const assignmentProgress = (item.assignments || []).map((assignment) =>
			buildAssignmentSubmissionProgress(assignment),
		);
		return (
			assignmentProgress.length > 0 &&
			assignmentProgress.every((entry) => entry.isCompleted)
		);
	}).length;

	return {
		completed,
		total,
		label: total ? `${completed}/${total} completed` : "No assigned items",
	};
}

function getWorkerAssignmentStatus(item: ProductionDetail["items"][number]) {
	const assignmentProgress = (item.assignments || []).map((assignment) =>
		buildAssignmentSubmissionProgress(assignment),
	);
	const assignedTotal = assignmentProgress.reduce(
		(total, assignment) => total + assignment.assignmentQty.qty,
		0,
	);
	const completedTotal = assignmentProgress.reduce(
		(total, assignment) => total + assignment.submittedQty.qty,
		0,
	);
	const normalizedCompleted = Math.min(completedTotal, assignedTotal);

	return {
		isCompleted: assignedTotal > 0 && normalizedCompleted >= assignedTotal,
		label:
			assignedTotal > 0
				? `${normalizedCompleted}/${assignedTotal} completed`
				: "No assigned qty",
	};
}

function chunkProductionItems<T>(items: T[], size: number) {
	const chunkSize = Math.max(size, 1);
	const rows: T[][] = [];
	for (let index = 0; index < items.length; index += chunkSize) {
		rows.push(items.slice(index, index + chunkSize));
	}
	return rows;
}

function buildAssignmentSubmissionProgress(
	assignment: NonNullable<
		ProductionDetail["items"][number]["assignments"]
	>[number],
): AssignmentProgress {
	const assignmentQty = normalizeQtyMatrix(assignment.qty);
	const submittedQty = normalizeQtyMatrix(
		(assignment.submissions || []).reduce(
			(total, submission) => ({
				qty: total.qty + Number(submission.qty?.qty || 0),
				lh: total.lh + Number(submission.qty?.lh || 0),
				rh: total.rh + Number(submission.qty?.rh || 0),
			}),
			{ qty: 0, lh: 0, rh: 0 },
		),
	);
	const isHandled = assignmentQty.lh > 0 || assignmentQty.rh > 0;
	const pendingQty = isHandled
		? {
				lh: Math.max(assignmentQty.lh - submittedQty.lh, 0),
				rh: Math.max(assignmentQty.rh - submittedQty.rh, 0),
				qty:
					Math.max(assignmentQty.lh - submittedQty.lh, 0) +
					Math.max(assignmentQty.rh - submittedQty.rh, 0),
			}
		: {
				qty: Math.max(assignmentQty.qty - submittedQty.qty, 0),
				lh: 0,
				rh: 0,
			};
	const submissionLimit = isHandled
		? [assignmentQty.lh, assignmentQty.rh].filter((value) => value > 0).length
		: assignmentQty.qty > 0 && assignmentQty.qty <= 1
			? assignmentQty.qty
			: null;
	const submissionCount = isHandled
		? [
				pendingQty.lh === 0 && assignmentQty.lh > 0,
				pendingQty.rh === 0 && assignmentQty.rh > 0,
			].filter(Boolean).length
		: submissionLimit
			? Math.min(submittedQty.qty, submissionLimit)
			: assignment.submissions?.length || 0;

	return {
		assignment,
		assignmentQty,
		submittedQty,
		pendingQty,
		assignmentLabel: formatQtyLabel(assignmentQty),
		submittedLabel: `Submitted ${formatQtyLabel(submittedQty)}`,
		pendingLabel: formatQtyLabel(pendingQty),
		isHandled,
		isCompleted: pendingQty.qty === 0,
		canSubmitMore: pendingQty.qty > 0,
		submissionLimit,
		submissionCount,
	};
}

function normalizeQtyMatrix(
	qty?: {
		qty?: number | null;
		lh?: number | null;
		rh?: number | null;
	} | null,
) {
	return {
		qty: Number(qty?.qty || 0),
		lh: Number(qty?.lh || 0),
		rh: Number(qty?.rh || 0),
	};
}

function formatQtyLabel(qty?: {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
}) {
	const normalized = normalizeQtyMatrix(qty);
	if (normalized.lh > 0 || normalized.rh > 0) {
		return [
			normalized.lh ? `${normalized.lh} LH` : null,
			normalized.rh ? `${normalized.rh} RH` : null,
		]
			.filter(Boolean)
			.join(" / ");
	}
	return `QTY ${normalized.qty}`;
}

function buildQuantityComboboxItems(maxQty: number) {
	return Array.from({ length: Math.max(maxQty, 0) }, (_, index) => {
		const value = String(index + 1);
		return {
			id: value,
			label: value,
		};
	});
}

function toPositiveNumber(value: string) {
	const number = Number(value);
	if (!Number.isFinite(number) || number <= 0) return 0;
	return number;
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
