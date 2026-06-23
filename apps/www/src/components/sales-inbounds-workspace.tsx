"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";

import { ActivityHistory as ChatActivityHistory } from "@/components/chat";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useMemo, useState } from "react";

type InboundShipment = RouterOutputs["inventories"]["inboundShipments"][number];
type InboundDetail = RouterOutputs["inventories"]["inboundShipmentDetail"];
type InboundActivity = RouterOutputs["inventories"]["inboundActivity"][number];
type LinkedOrder = InboundShipment["linkedOrders"][number];
type InboundStatus =
	| "pending"
	| "in_progress"
	| "completed"
	| "issue_open"
	| "closed"
	| "cancelled";
type StatusFilter = "all" | InboundStatus;

const inboundStatuses = [
	"pending",
	"in_progress",
	"issue_open",
	"completed",
	"closed",
	"cancelled",
] satisfies InboundStatus[];

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "No date";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "No date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function formatCurrency(value: number | null | undefined) {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(Number(value || 0));
}

function titleCase(value: string | null | undefined) {
	return (value || "unknown")
		.replaceAll("_", " ")
		.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function statusClassName(status: string | null | undefined) {
	switch (status) {
		case "completed":
		case "closed":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "in_progress":
			return "border-blue-200 bg-blue-50 text-blue-700";
		case "issue_open":
			return "border-amber-200 bg-amber-50 text-amber-700";
		case "cancelled":
			return "border-red-200 bg-red-50 text-red-700";
		default:
			return "border-slate-200 bg-slate-50 text-slate-700";
	}
}

function searchableText(shipment: InboundShipment) {
	return [
		shipment.id,
		shipment.reference,
		shipment.status,
		shipment.supplier?.name,
		shipment.supplier?.id,
		...(shipment.linkedOrders || []).flatMap((order) => [
			order.orderId,
			order.customer?.name,
			order.customer?.businessName,
			order.customer?.phoneNo,
			order.inventoryStatus,
			order.invoiceStatus,
		]),
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

function itemName(item: InboundDetail["items"][number]) {
	return (
		item.inventoryVariant.inventory?.name ||
		item.inventoryVariant.sku ||
		item.inventoryVariant.uid ||
		"Inventory item"
	);
}

function demandOrderLabel(item: InboundDetail["items"][number]) {
	const orderNos = Array.from(
		new Set(
			(item.inboundDemands || [])
				.map((demand) => demand.lineItemComponent.parent.sale?.orderId)
				.filter(Boolean),
		),
	);
	return orderNos.length ? orderNos.join(", ") : "No linked order";
}

function activityAuthor(activity: InboundActivity) {
	return activity.senderContact?.name || "System";
}

function activityTimelineRows(activities: InboundActivity[]) {
	return [...activities].reverse().map((activity) => ({
		id: activity.id,
		createdAt: activity.createdAt,
		subject: activity.subject,
		headline: activity.headline,
		description: null,
		note: activity.note,
		senderContactName: activityAuthor(activity),
		tags: activity.tags || {},
		children: [],
	}));
}

function customerName(order: LinkedOrder | null | undefined) {
	if (!order) return "No customer";
	return (
		order.customer?.businessName ||
		order.customer?.name ||
		`Customer #${order.customer?.id || "unknown"}`
	);
}

function orderSummary(shipment: InboundShipment) {
	const orders = shipment.linkedOrders || [];
	const first = orders[0];
	if (!first) return "No linked order";
	const suffix = orders.length > 1 ? ` +${orders.length - 1} more` : "";
	return `${first.orderId} • ${customerName(first)}${suffix}`;
}

function createdByLabel(activities: InboundActivity[]) {
	const created =
		activities.find((activity) =>
			`${activity.subject || ""} ${activity.headline || ""}`
				.toLowerCase()
				.includes("created"),
		) || activities.at(-1);
	return created ? activityAuthor(created) : "Unknown";
}

function StatCard({
	label,
	value,
	helper,
}: {
	label: string;
	value: string | number;
	helper: string;
}) {
	return (
		<div className="rounded-md border bg-muted/20 px-3 py-2">
			<div className="text-[10px] font-medium uppercase text-muted-foreground">
				{label}
			</div>
			<div className="mt-0.5 text-lg font-semibold">{value}</div>
			<div className="text-[11px] text-muted-foreground">{helper}</div>
		</div>
	);
}

function ShipmentStatusBadge({
	status,
}: {
	status: string | null | undefined;
}) {
	return (
		<Badge
			variant="outline"
			className={cn("h-5 px-1.5 text-[10px]", statusClassName(status))}
		>
			{titleCase(status)}
		</Badge>
	);
}

export function SalesInboundsWorkspace() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [selectedInboundId, setSelectedInboundId] = useState<number | null>(
		null,
	);
	const shipmentsQuery = useQuery(
		trpc.inventories.inboundShipments.queryOptions(
			{},
			{
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false,
			},
		),
	);
	const shipments = shipmentsQuery.data ?? [];
	const filteredShipments = useMemo(() => {
		const term = search.trim().toLowerCase();
		return shipments.filter((shipment) => {
			const statusMatches =
				statusFilter === "all" || shipment.status === statusFilter;
			const searchMatches = !term || searchableText(shipment).includes(term);
			return statusMatches && searchMatches;
		});
	}, [search, shipments, statusFilter]);
	const selectedShipment =
		filteredShipments.find((shipment) => shipment.id === selectedInboundId) ??
		filteredShipments[0] ??
		null;
	const detailQuery = useQuery(
		trpc.inventories.inboundShipmentDetail.queryOptions(
			{
				inboundId: selectedShipment?.id ?? 0,
			},
			{
				enabled: !!selectedShipment?.id,
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false,
			},
		),
	);
	const activityQuery = useQuery(
		trpc.inventories.inboundActivity.queryOptions(
			{
				inboundId: selectedShipment?.id ?? 0,
			},
			{
				enabled: !!selectedShipment?.id,
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false,
			},
		),
	);
	const selectedDetail = detailQuery.data ?? null;
	const activities = activityQuery.data ?? [];
	const activityRows = useMemo(
		() => activityTimelineRows(activities),
		[activities],
	);
	const analytics = useMemo(() => {
		const active = shipments.filter(
			(shipment) =>
				!["completed", "closed", "cancelled"].includes(shipment.status),
		).length;
		const issues = shipments.filter(
			(shipment) => shipment.status === "issue_open",
		).length;
		const itemCount = shipments.reduce(
			(total, shipment) => total + Number(shipment.itemCount || 0),
			0,
		);
		const linkedOrderCount = new Set(
			shipments.flatMap((shipment) =>
				(shipment.linkedOrders || []).map((order) => order.id),
			),
		).size;
		const completed = shipments.filter(
			(shipment) =>
				shipment.status === "completed" || shipment.status === "closed",
		).length;

		return {
			active,
			completed,
			issues,
			itemCount,
			linkedOrderCount,
			total: shipments.length,
		};
	}, [shipments]);

	useEffect(() => {
		if (!filteredShipments.length) {
			setSelectedInboundId(null);
			return;
		}
		if (
			selectedInboundId &&
			filteredShipments.some((shipment) => shipment.id === selectedInboundId)
		) {
			return;
		}
		setSelectedInboundId(filteredShipments[0]?.id ?? null);
	}, [filteredShipments, selectedInboundId]);

	const refreshInbound = async (inboundId?: number | null) => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundShipments.queryKey({}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundDemandQueue.queryKey({}),
			}),
			inboundId
				? queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundShipmentDetail.queryKey({
							inboundId,
						}),
					})
				: Promise.resolve(),
			inboundId
				? queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundActivity.queryKey({
							inboundId,
						}),
					})
				: Promise.resolve(),
		]);
	};
	const updateStatus = useMutation(
		trpc.inventories.updateInboundShipmentStatus.mutationOptions({
			onSuccess: async (data) => {
				await refreshInbound(data.id);
				toast({
					title: "Inbound status updated",
					description: `Inbound #${data.id} is now ${titleCase(data.status)}.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to update inbound",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const receiveInbound = useMutation(
		trpc.inventories.receiveInboundShipment.mutationOptions({
			onSuccess: async (data) => {
				await refreshInbound(data.inboundId);
				toast({
					title: "Inbound received into stock",
					description: `${formatQty(data.newlyReceivedQty)} new stock qty posted.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to receive inbound",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const receiveAll = () => {
		if (!selectedDetail) return;
		receiveInbound.mutate({
			inboundId: selectedDetail.id,
			items: selectedDetail.items.map((item) => ({
				inboundShipmentItemId: item.id,
				qtyReceived: Number(item.qty || 0),
				qtyGood: Number(item.qty || 0),
				qtyIssue: 0,
				unitPrice: item.unitPrice ?? null,
			})),
		});
	};
	const canReceive =
		!!selectedDetail &&
		!["completed", "closed", "cancelled"].includes(selectedDetail.status) &&
		selectedDetail.items.some(
			(item) =>
				Number(item.qtyGood || 0) + Number(item.qtyIssue || 0) <
				Number(item.qty),
		);

	return (
		<div className="space-y-4 p-4 sm:p-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="text-xl font-semibold tracking-normal">Inbounds</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Review inbound shipments, linked order stock, status changes, and
						activity history.
					</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search inbound, supplier, reference"
						className="h-9 sm:w-72"
					/>
					<Select
						value={statusFilter}
						onValueChange={(value) => setStatusFilter(value as StatusFilter)}
					>
						<SelectTrigger className="h-9 sm:w-44">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All statuses</SelectItem>
							{inboundStatuses.map((status) => (
								<SelectItem key={status} value={status}>
									{titleCase(status)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
				<StatCard
					label="Total"
					value={analytics.total}
					helper="Inbound shipments"
				/>
				<StatCard
					label="Active"
					value={analytics.active}
					helper="Still receiving"
				/>
				<StatCard
					label="Completed"
					value={analytics.completed}
					helper="Received or closed"
				/>
				<StatCard
					label="Orders"
					value={analytics.linkedOrderCount}
					helper="Linked sales orders"
				/>
				<StatCard label="Issues" value={analytics.issues} helper="Open issue" />
				<StatCard label="Items" value={analytics.itemCount} helper="Lines" />
			</div>

			<div className="flex flex-col gap-2">
				{shipmentsQuery.isLoading ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-20 rounded-md" />
						<Skeleton className="h-20 rounded-md" />
						<Skeleton className="h-20 rounded-md" />
					</div>
				) : filteredShipments.length ? (
					filteredShipments.map((shipment) => {
						const isSelected = selectedShipment?.id === shipment.id;
						return (
							<Collapsible
								key={shipment.id}
								open={isSelected}
								onOpenChange={(open) =>
									setSelectedInboundId(open ? shipment.id : null)
								}
								className={cn(
									"rounded-md border bg-background",
									isSelected && "border-primary",
								)}
							>
								<CollapsibleTrigger asChild>
									<button
										type="button"
										className="flex w-full flex-col gap-3 p-3 text-left transition hover:bg-muted/40"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="text-sm font-semibold">
													Inbound #{shipment.id}
												</div>
												<div className="mt-0.5 truncate text-xs text-muted-foreground">
													{shipment.supplier?.name || "No supplier"}
													{shipment.reference ? ` • ${shipment.reference}` : ""}
												</div>
												<div className="mt-0.5 truncate text-xs text-muted-foreground">
													{orderSummary(shipment)}
												</div>
											</div>
											<div className="flex shrink-0 items-center gap-2">
												<ShipmentStatusBadge status={shipment.status} />
												<Icons.ChevronDown
													className={cn(
														"size-4 text-muted-foreground transition-transform",
														isSelected && "rotate-180",
													)}
												/>
											</div>
										</div>
										<div className="flex flex-wrap gap-1.5">
											<Badge variant="outline" className="h-6 rounded-full">
												{shipment.itemCount} items
											</Badge>
											<Badge variant="outline" className="h-6 rounded-full">
												{shipment.linkedOrders?.length || 0} orders
											</Badge>
											<Badge variant="outline" className="h-6 rounded-full">
												Expected {formatDate(shipment.expectedAt)}
											</Badge>
											<Badge variant="outline" className="h-6 rounded-full">
												Created {formatDate(shipment.createdAt)}
											</Badge>
										</div>
									</button>
								</CollapsibleTrigger>
								<CollapsibleContent className="border-t bg-muted/10 p-3">
									<div className="flex flex-col gap-3">
										<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
											<div>
												<div className="text-sm font-semibold">
													Inbound #{shipment.id}
												</div>
												<div className="mt-1 text-xs text-muted-foreground">
													{shipment.supplier?.name || "No supplier"} • Created
													by {createdByLabel(activities)}
												</div>
											</div>
											<div className="flex flex-wrap gap-2">
												<Select
													value={shipment.status as InboundStatus}
													onValueChange={(status) =>
														updateStatus.mutate({
															inboundId: shipment.id,
															status: status as InboundStatus,
														})
													}
													disabled={updateStatus.isPending}
												>
													<SelectTrigger className="h-8 w-40">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{inboundStatuses.map((status) => (
															<SelectItem key={status} value={status}>
																{titleCase(status)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<Button
													type="button"
													size="sm"
													disabled={!canReceive || receiveInbound.isPending}
													onClick={receiveAll}
												>
													<Icons.Warehouse className="mr-2 size-4" />
													Receive stock
												</Button>
											</div>
										</div>
										{detailQuery.isLoading && isSelected ? (
											<div className="flex flex-col gap-2">
												<Skeleton className="h-24 rounded-md" />
												<Skeleton className="h-24 rounded-md" />
											</div>
										) : selectedDetail && isSelected ? (
											<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
												<div className="flex flex-col gap-2">
													{shipment.linkedOrders?.length ? (
														<div className="rounded-md border bg-background p-3">
															<div className="text-xs font-semibold uppercase text-muted-foreground">
																Linked orders
															</div>
															<div className="mt-2 grid gap-2 md:grid-cols-2">
																{shipment.linkedOrders.map((order) => (
																	<div
																		key={order.id}
																		className="rounded-md bg-muted/40 p-2"
																	>
																		<div className="flex items-center justify-between gap-2">
																			<div className="text-xs font-semibold">
																				{order.orderId}
																			</div>
																			<Badge
																				variant="outline"
																				className="h-5 px-1.5 text-[10px]"
																			>
																				{titleCase(order.inventoryStatus)}
																			</Badge>
																		</div>
																		<div className="mt-1 truncate text-xs text-muted-foreground">
																			{customerName(order)}
																		</div>
																		<div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
																			<span>{order.demandCount} demand</span>
																			<span>Qty {formatQty(order.qty)}</span>
																			<span>
																				Due {formatCurrency(order.amountDue)}
																			</span>
																		</div>
																	</div>
																))}
															</div>
														</div>
													) : null}
													{selectedDetail.items.map((item) => (
														<div
															key={item.id}
															className="rounded-md border bg-background p-3"
														>
															<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
																<div className="min-w-0">
																	<div className="truncate text-xs font-semibold uppercase">
																		{itemName(item)}
																	</div>
																	<div className="mt-0.5 text-[11px] text-muted-foreground">
																		{demandOrderLabel(item)}
																	</div>
																</div>
																<div className="flex flex-wrap gap-1.5">
																	<Badge
																		variant="outline"
																		className="h-6 rounded-full"
																	>
																		Qty {formatQty(item.qty)}
																	</Badge>
																	<Badge
																		variant="outline"
																		className="h-6 rounded-full"
																	>
																		Good {formatQty(item.qtyGood)}
																	</Badge>
																	{Number(item.qtyIssue || 0) > 0 ? (
																		<Badge
																			variant="outline"
																			className="h-6 rounded-full border-amber-200 bg-amber-50 text-amber-700"
																		>
																			Issue {formatQty(item.qtyIssue)}
																		</Badge>
																	) : null}
																</div>
															</div>
															<div className="mt-2 flex flex-col gap-1">
																{item.inboundDemands.map((demand) => (
																	<div
																		key={demand.id}
																		className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground"
																	>
																		<span>
																			{demand.lineItemComponent.parent.sale
																				?.orderId || "Order"}{" "}
																			• {titleCase(demand.status)}
																		</span>
																		<span className="tabular-nums">
																			{formatQty(demand.qtyReceived)} /{" "}
																			{formatQty(demand.qty)}
																		</span>
																	</div>
																))}
															</div>
														</div>
													))}
												</div>
												<div className="flex flex-col gap-2">
													<ChatActivityHistory
														data={activityRows}
														isPending={activityQuery.isLoading}
														isError={activityQuery.isError}
														title="Activity History"
														emptyText="No activity history yet"
														className="rounded-md border bg-background p-4"
													/>
												</div>
											</div>
										) : null}
									</div>
								</CollapsibleContent>
							</Collapsible>
						);
					})
				) : (
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						No inbound shipments match this filter.
					</div>
				)}
			</div>
		</div>
	);
}
