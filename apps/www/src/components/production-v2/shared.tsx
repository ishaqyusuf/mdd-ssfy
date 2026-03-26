"use client";

import Img from "@/components/(clean-code)/img";
import { useBatchSales } from "@/hooks/use-batch-sales";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
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
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Checkbox } from "@gnd/ui/checkbox";
import { Input } from "@gnd/ui/input";
import { Progress } from "@gnd/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Skeleton } from "@gnd/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { cn } from "@/lib/utils";
import {
	AlertTriangle,
	CalendarDays,
	CheckCircle2,
	ChevronDown,
	Clock3,
	Package,
	PanelTop,
	Search,
	SquareCheckBig,
	UserRoundPlus,
} from "lucide-react";
import type { ReactNode } from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery } from "@tanstack/react-query";

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

type ProductionDetail = {
	orderId: string;
	salesId: number;
	customer?: string | null;
	salesRep?: string | null;
	items: {
		controlUid: string;
		salesId: number;
		itemId: number;
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
	const deferredSearch = useDeferredValue(search);
	const { ref: loadMoreRef, inView } = useInView({
		rootMargin: "320px 0px",
	});
	const batchSales = useBatchSales();

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
			<section className="rounded-[28px] border bg-[linear-gradient(135deg,#0f172a_0%,#1f2937_55%,#0f766e_100%)] px-6 py-7 text-white shadow-xl shadow-slate-300/30">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="space-y-3">
						<Badge className="w-fit rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white hover:bg-white/10">
							{scope === "worker" ? "Worker v2" : "Admin v2"}
						</Badge>
						<div className="space-y-2">
							<h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
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
				/>
				<SummaryCard
					label="Past Due"
					value={dashboard?.summary.pastDueCount}
					icon={<AlertTriangle className="h-4 w-4" />}
				/>
				<SummaryCard
					label="Due Today"
					value={dashboard?.summary.dueTodayCount}
					icon={<Clock3 className="h-4 w-4" />}
				/>
				<SummaryCard
					label="Due Tomorrow"
					value={dashboard?.summary.dueTomorrowCount}
					icon={<CalendarDays className="h-4 w-4" />}
				/>
				<SummaryCard
					label="Completed"
					value={dashboard?.summary.completedCount}
					icon={<CheckCircle2 className="h-4 w-4" />}
				/>
			</section>

			<section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
				<Card className="rounded-[28px]">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg">
							<CalendarDays className="h-5 w-5 text-sky-600" />
							Due Calendar
						</CardTitle>
						<CardDescription>
							Tap a date to filter production orders inline.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="overflow-hidden rounded-2xl border bg-muted/30">
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
								}}
								modifiersClassNames={{
									hasDue:
										"rounded-full border border-sky-200 bg-sky-50 font-semibold text-sky-900",
								}}
								className="w-full [--cell-size:2.65rem]"
								classNames={{
									root: "w-full",
									month: "w-full",
									table: "w-full table-fixed border-collapse",
									weekdays: "grid w-full grid-cols-7 gap-1",
									weekday:
										"flex h-10 items-center justify-center text-center text-xs font-medium uppercase tracking-[0.14em]",
									week: "mt-1 grid w-full grid-cols-7 gap-1",
									day: "flex items-center justify-center p-0",
								}}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							{(dashboard?.labels || []).map((entry) => (
								<Button
									key={entry.key}
									size="sm"
									variant={label === entry.key ? "secondary" : "outline"}
									onClick={() => {
										setLabel(entry.key);
										setSelectedDate(null);
									}}
								>
									{entry.label} ({entry.count})
								</Button>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-[28px]">
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
	return (
		<Collapsible open={isExpanded} onOpenChange={() => onToggle()}>
			<Card className="overflow-hidden rounded-2xl border border-slate-200/80">
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className="flex w-full flex-col gap-4 px-5 py-4 text-left md:flex-row md:items-center md:justify-between"
					>
						<div className="flex items-start gap-3">
							<Checkbox
								checked={isSelected}
								onCheckedChange={(checked) =>
									onSelectionChange(checked === true)
								}
								onClick={(event) => event.stopPropagation()}
								className="mt-1"
								aria-label={`Select ${item.orderId}`}
							/>
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<p className="text-lg font-semibold tracking-tight">
										{item.orderId}
									</p>
									<Badge
										variant={item.completed ? "secondary" : "outline"}
										className="rounded-full"
									>
										{item.completed ? "Completed" : item.alert?.text || "Open"}
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
	const [assignee, setAssignee] = useState("");
	const detailQuery = useQuery(
		trpc.sales.productionOrderDetailV2.queryOptions({
			salesNo,
			scope,
		}),
	);
	const detail = detailQuery.data as ProductionDetail | undefined;

	if (detailQuery.isPending) {
		return (
			<div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
				<Skeleton className="h-56 rounded-2xl" />
				<Skeleton className="h-56 rounded-2xl" />
			</div>
		);
	}

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
					<TabsList className="grid w-full grid-cols-2 rounded-xl md:w-[260px]">
						<TabsTrigger value="productions">Productions</TabsTrigger>
						<TabsTrigger value="notes">Notes</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="productions" className="mt-0 space-y-4">
					{scope === "admin" ? (
						<Card className="rounded-2xl">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<PanelTop className="h-4 w-4" />
									Quick Actions
								</CardTitle>
								<CardDescription>
									Admin-only order-level production actions.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
									<Select value={assignee} onValueChange={setAssignee}>
										<SelectTrigger className="rounded-xl">
											<SelectValue placeholder="Quick assign production worker" />
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
									<Button className="rounded-xl" disabled>
										<UserRoundPlus className="h-4 w-4" />
										Quick Assign
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									Quick-assign wiring is the next admin slice.
								</p>
							</CardContent>
						</Card>
					) : null}

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
									defaultValue={detail.items[0]?.controlUid}
									className="space-y-3"
								>
									{detail.items.map((productionItem) => (
										<AccordionItem
											key={productionItem.controlUid}
											value={productionItem.controlUid}
											className="overflow-hidden rounded-2xl border bg-background"
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
													<div className="min-w-0 flex-1">
														<p className="font-semibold uppercase tracking-[0.08em]">
															{productionItem.title}
														</p>
														<p className="mt-1 text-sm uppercase tracking-[0.08em] text-muted-foreground">
															{productionItem.subtitle || "NO SUBTITLE"}
														</p>
													</div>
													<div className="shrink-0">
														<AccordionTrigger className="w-auto p-0 hover:no-underline" />
													</div>
												</div>
												<div className="mt-4 grid gap-3 md:grid-cols-3">
													<ProductionStatProgress
														label="Assigned"
														completed={
															productionItem.analytics?.stats?.prodAssigned?.qty
														}
														total={productionItem.qty?.qty}
													/>
													<ProductionStatProgress
														label="Production"
														completed={
															productionItem.analytics?.stats?.prodCompleted
																?.qty
														}
														total={productionItem.qty?.qty}
													/>
													<ProductionStatProgress
														label="Fulfilled"
														completed={
															productionItem.analytics?.stats?.dispatchCompleted
																?.qty
														}
														total={productionItem.qty?.qty}
													/>
												</div>
											</div>
											<AccordionContent className="border-t bg-muted/20 px-4 py-4">
												<div className="space-y-4">
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

													<div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
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
																			<Button
																				size="sm"
																				variant="outline"
																				disabled
																			>
																				Delete Assignment
																			</Button>
																		</>
																	) : (
																		<>
																			<Button size="sm" disabled>
																				Submit Assignment
																			</Button>
																			<Button
																				size="sm"
																				variant="outline"
																				disabled
																			>
																				Delete Submission
																			</Button>
																		</>
																	)}
																</div>
															</div>

															{productionItem.assignments?.length ? (
																<div className="space-y-3">
																	{productionItem.assignments.map(
																		(assignment) => (
																			<div
																				key={assignment.id}
																				className="space-y-3 rounded-xl border bg-background p-3"
																			>
																				<div className="flex flex-wrap items-center justify-between gap-2">
																					<div>
																						<p className="text-sm font-medium">
																							{assignment.assignedTo ||
																								"Unassigned"}
																						</p>
																						<p className="text-xs text-muted-foreground">
																							Due:{" "}
																							{assignment.dueDate
																								? formatDateValue(
																										assignment.dueDate,
																									)
																								: "No due date"}
																						</p>
																					</div>
																					<p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
																						QTY {assignment.qty?.qty || 0}
																					</p>
																				</div>

																				{assignment.submissions?.length ? (
																					<div className="space-y-2">
																						{assignment.submissions.map(
																							(submission) => (
																								<div
																									key={submission.id}
																									className="rounded-lg border bg-muted/20 p-3"
																								>
																									<div className="flex flex-wrap items-center justify-between gap-2">
																										<p className="text-xs font-medium uppercase tracking-[0.16em]">
																											Submission #
																											{submission.id}
																										</p>
																										<p className="text-xs text-muted-foreground">
																											{submission.createdAt
																												? formatDateValue(
																														submission.createdAt,
																													)
																												: "No date"}
																										</p>
																									</div>
																									<p className="mt-2 text-xs text-muted-foreground">
																										QTY{" "}
																										{submission.qty?.qty || 0}
																										{submission.deliveredQty
																											? ` | Delivered ${submission.deliveredQty}`
																											: ""}
																									</p>
																									{submission.note ? (
																										<p className="mt-2 text-sm">
																											{submission.note}
																										</p>
																									) : null}
																								</div>
																							),
																						)}
																					</div>
																				) : (
																					<div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
																						No submissions yet.
																					</div>
																				)}
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

														<div className="space-y-3">
															<p className="text-sm font-semibold uppercase tracking-[0.16em]">
																Related Notes
															</p>
															<div className="rounded-xl border bg-background p-3">
																<Note
																	subject="Production Note"
																	headline=""
																	statusFilters={["public"]}
																	typeFilters={["production", "general"]}
																	tagFilters={[
																		noteTagFilter(
																			"itemControlUID",
																			productionItem.controlUid,
																		),
																		noteTagFilter(
																			"salesItemId",
																			productionItem.itemId,
																		),
																		noteTagFilter(
																			"salesId",
																			productionItem.salesId,
																		),
																	]}
																/>
															</div>
														</div>
													</div>
												</div>
											</AccordionContent>
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
							<Note
								subject="Production Note"
								headline=""
								statusFilters={["public"]}
								typeFilters={["production", "general"]}
								tagFilters={[noteTagFilter("salesNo", salesNo)]}
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
}: {
	label: string;
	value?: number;
	icon: ReactNode;
}) {
	return (
		<Card className="rounded-2xl">
			<CardContent className="flex items-center justify-between gap-4 p-5">
				<div>
					<p className="text-sm text-muted-foreground">{label}</p>
					<p className="mt-1 text-3xl font-semibold tracking-tight">
						{value ?? 0}
					</p>
				</div>
				<div className="rounded-full border bg-muted/40 p-3">{icon}</div>
			</CardContent>
		</Card>
	);
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

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between gap-3">
				<span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
					{label}
				</span>
				<span className="text-xs text-muted-foreground">
					{resolvedCompleted}/{resolvedTotal} ({percentage.toFixed(0)}
					%)
				</span>
			</div>
			<Progress value={percentage} className="h-2" />
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
