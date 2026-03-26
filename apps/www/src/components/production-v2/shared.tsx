"use client";

import { ActivityHistory } from "@/components/chat/activity-history";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { activityTag } from "@notifications/activity-tree";
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
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Skeleton } from "@gnd/ui/skeleton";
import { cn } from "@/lib/utils";
import {
	AlertTriangle,
	CalendarDays,
	CheckCircle2,
	ChevronDown,
	Clock3,
	Package,
	Search,
	UserRoundPlus,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

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
		title: string;
		subtitle?: string | null;
		configs: {
			label?: string | null;
			value?: string | null;
			color?: string | null;
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

	const dashboardQuery = useQuery(
		trpc.sales.productionDashboardV2.queryOptions({
			scope,
			production: label === "completed" ? "completed" : "pending",
		}),
	);
	const boardQuery = useQuery(
		trpc.sales.productionsV2.queryOptions({
			scope,
			production: label === "completed" ? "completed" : "pending",
			show:
				label === "due-today" ||
				label === "due-tomorrow" ||
				label === "past-due"
					? (label as "due-today" | "due-tomorrow" | "past-due")
					: null,
			productionDueDate: selectedDate,
			q: search || null,
			size: 50,
		}),
	);
	const employeeFiltersQuery = useQuery(
		trpc.filters.salesProductions.queryOptions(undefined, {
			enabled: scope === "admin",
		}),
	);

	const dashboard = dashboardQuery.data as ProductionDashboardV2 | undefined;
	const items = (boardQuery.data?.data || []) as ProductionListItem[];
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
								className="w-full"
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
						{selectedDate ? (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSelectedDate(null)}
							>
								Clear date
							</Button>
						) : null}
					</CardHeader>
					<CardContent className="space-y-3">
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
										assignOptions={assignOptions}
									/>
								))}
						{!boardQuery.isPending && !items.length ? (
							<div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
								No production orders match the current filters.
							</div>
						) : null}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

function ProductionOrderCard({
	scope,
	item,
	isExpanded,
	onToggle,
	assignOptions,
}: {
	scope: Scope;
	item: ProductionListItem;
	isExpanded: boolean;
	onToggle: () => void;
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
		<div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="space-y-4">
				<Card className="rounded-2xl">
					<CardHeader>
						<CardTitle className="text-base">Production Information</CardTitle>
						<CardDescription>
							Inline detail view for {detail?.orderId}.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{detail?.items?.map((productionItem) => (
							<div
								key={productionItem.controlUid}
								className="rounded-2xl border bg-background p-4"
							>
								<p className="font-medium">{productionItem.title}</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{productionItem.subtitle || "No subtitle"}
								</p>
								<div className="mt-3 grid gap-3 sm:grid-cols-2">
									{productionItem.configs?.map((config, index) => (
										<div
											key={`${productionItem.controlUid}-${index}`}
											className="space-y-1"
										>
											<p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
												{config.label}
											</p>
											<p className="text-sm font-medium">{config.value}</p>
										</div>
									))}
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				<Card className="rounded-2xl">
					<CardHeader>
						<CardTitle className="text-base">Actions</CardTitle>
						<CardDescription>
							These actions move into the inline panel in v2 instead of the
							modal.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{scope === "admin" ? (
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
						) : null}
						<div className="flex flex-wrap gap-2">
							<Button disabled={!detail?.actions.canSubmitProduction}>
								Submit Production
							</Button>
							<Button
								variant="outline"
								disabled={!detail?.actions.canDeleteSubmission}
							>
								Delete Submission
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Action wiring is the next v2 slice; the panel structure is now in
							place.
						</p>
					</CardContent>
				</Card>
			</div>

			<Card className="rounded-2xl">
				<CardHeader>
					<CardTitle className="text-base">Note Activities</CardTitle>
					<CardDescription>
						Recent activity for this production order.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ActivityHistory
						filter={activityTag("salesNo", salesNo)}
						emptyText="No note activity recorded for this order yet."
					/>
				</CardContent>
			</Card>
		</div>
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

function formatCalendarDate(date: Date) {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}
