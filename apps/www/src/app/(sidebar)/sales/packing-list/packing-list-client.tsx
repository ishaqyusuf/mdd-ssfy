"use client";

import { generateToken } from "@/actions/token-action";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { openLink } from "@/lib/open-link";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { addDays } from "date-fns";
import { toast } from "sonner";

type PackingListTab = "current" | "completed" | "cancelled";

function normalize(value?: string | null) {
	return String(value || "").toLowerCase();
}

function getTabLabel(tab: PackingListTab) {
	switch (tab) {
		case "completed":
			return "completed";
		case "cancelled":
			return "cancelled";
		default:
			return "current";
	}
}

function getEmptyStateCopy(tab: PackingListTab) {
	switch (tab) {
		case "completed":
			return {
				title: "No completed packing orders yet.",
				description:
					"Orders signed from packing mode will appear here once they are completed.",
			};
		case "cancelled":
			return {
				title: "No cancelled packing orders yet.",
				description:
					"Cancelled packing-list deliveries will appear here for admin review.",
			};
		default:
			return {
				title: "No pickup orders in the packing list.",
				description:
					"Orders sent to packing will appear here for warehouse signoff.",
			};
	}
}

function PackingListCard({
	item,
	tab,
	isAdmin,
	onOpen,
	onStatusChange,
	isUpdating,
}: {
	item: {
		dispatchId: number;
		salesId: number;
		orderNo: string;
		salesRep?: string | null;
		customerName?: string | null;
		address?: string | null;
		phone?: string | null;
		status?: string | null;
	};
	tab: PackingListTab;
	isAdmin: boolean;
	onOpen: () => void;
	onStatusChange: (status: "queue" | "completed" | "cancelled") => void;
	isUpdating: boolean;
}) {
	const statusLabel =
		item.status === "completed"
			? "Completed"
			: item.status === "cancelled"
				? "Cancelled"
				: "Current";

	return (
		<Card
			className={cn(
				"h-full rounded-3xl border-border/70 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
				item.status === "cancelled" && "border-destructive/30 bg-destructive/5",
			)}
		>
			<CardContent className="flex h-full flex-col gap-4 p-5">
				<div className="flex items-start justify-between gap-3">
					<button type="button" onClick={onOpen} className="min-w-0 text-left">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Customer
						</p>
						<p className="mt-1 truncate text-2xl font-semibold">
							{item.customerName || "Unknown customer"}
						</p>
					</button>

					<div className="flex items-center gap-2">
						<span
							className={cn(
								"rounded-full px-3 py-1 text-xs font-semibold",
								item.status === "completed" &&
									"bg-emerald-500/10 text-emerald-700",
								item.status === "cancelled" &&
									"bg-destructive/10 text-destructive",
								item.status !== "completed" &&
									item.status !== "cancelled" &&
									"bg-primary/10 text-primary",
							)}
						>
							{statusLabel}
						</span>

						{isAdmin ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										disabled={isUpdating}
										className="size-8 rounded-full"
									>
										<Icons.MoreVertical className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onSelect={(event) => {
											event.preventDefault();
											onOpen();
										}}
									>
										<Icons.ExternalLink className="mr-2 size-4" />
										Open Packing Slip
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									{item.status !== "queue" ? (
										<DropdownMenuItem
											onSelect={(event) => {
												event.preventDefault();
												onStatusChange("queue");
											}}
										>
											<Icons.RotateCcw className="mr-2 size-4" />
											Move to Current
										</DropdownMenuItem>
									) : null}
									{item.status !== "completed" ? (
										<DropdownMenuItem
											onSelect={(event) => {
												event.preventDefault();
												onStatusChange("completed");
											}}
										>
											<Icons.CheckCheck className="mr-2 size-4" />
											Mark Completed
										</DropdownMenuItem>
									) : null}
									{item.status !== "cancelled" ? (
										<DropdownMenuItem
											onSelect={(event) => {
												event.preventDefault();
												onStatusChange("cancelled");
											}}
											className="text-destructive focus:text-destructive"
										>
											<Icons.XCircle className="mr-2 size-4" />
											Cancel
										</DropdownMenuItem>
									) : null}
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
					</div>
				</div>

				<button
					type="button"
					onClick={onOpen}
					className="flex flex-1 flex-col gap-3 text-left"
				>
					<div className="space-y-3 text-sm">
						<div className="flex items-start gap-2">
							<Icons.User className="mt-0.5 size-4 text-muted-foreground" />
							<div className="min-w-0">
								<p className="truncate font-medium">{item.orderNo}</p>
								<p className="truncate text-muted-foreground">
									Sales Rep: {item.salesRep || "Unassigned"}
								</p>
							</div>
						</div>

						<div className="flex items-start gap-2">
							<Icons.MapPin className="mt-0.5 size-4 text-muted-foreground" />
							<p className="text-muted-foreground">
								{item.address || "No address available"}
							</p>
						</div>

						<div className="flex items-center gap-2">
							<Icons.Phone className="size-4 text-muted-foreground" />
							<p className="text-muted-foreground">
								{item.phone || "No phone number"}
							</p>
						</div>
					</div>

					<div className="mt-auto flex items-center justify-between pt-2 text-sm">
						<span className="text-muted-foreground">
							{tab === "current" ? "Open packing slip" : "View packing slip"}
						</span>
						<Icons.ExternalLink className="size-4 text-muted-foreground transition group-hover:text-primary" />
					</div>
				</button>
			</CardContent>
		</Card>
	);
}

export function PackingListClient() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [query, setQuery] = useState(() => searchParams.get("q") || "");
	const rawTab = searchParams.get("tab");
	const isAdmin =
		auth.roleTitle?.toLowerCase() === "admin" ||
		auth.roleTitle?.toLowerCase() === "super admin";
	const tab: PackingListTab =
		rawTab === "completed" || (rawTab === "cancelled" && isAdmin)
			? (rawTab as PackingListTab)
			: "current";
	const packingList = useQuery(
		trpc.dispatch.packingList.queryOptions(
			{
				tab,
			},
			{
				enabled: tab !== "cancelled" || isAdmin,
			},
		),
	);

	const statusMutation = useMutation(
		trpc.dispatch.updateDispatchStatus.mutationOptions({
			async onSuccess(result) {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.packingList.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.packingQueue.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.orderDispatchOverview.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.dispatchOverview.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.dispatchOverviewV2.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getSaleOverview.pathKey(),
					}),
				]);
				toast.success(
					result?.newStatus
						? `Dispatch moved to ${result.newStatus}.`
						: "Dispatch updated.",
				);
			},
			onError(error) {
				toast.error(error.message || "Unable to update dispatch.");
			},
		}),
	);

	const items = packingList.data || [];
	const term = normalize(query).trim();
	const filtered = useMemo(() => {
		if (!term) return items;
		return items.filter((item) =>
			[item.orderNo, item.salesRep, item.customerName, item.address, item.phone]
				.map((value) => normalize(value))
				.some((value) => value.includes(term)),
		);
	}, [items, term]);

	const emptyState = getEmptyStateCopy(tab);

	function setTab(nextTab: PackingListTab) {
		const params = new URLSearchParams(searchParams.toString());
		if (nextTab === "current") params.delete("tab");
		else params.set("tab", nextTab);
		router.replace(
			params.toString() ? `${pathname}?${params.toString()}` : pathname,
		);
	}

	function updateQuery(nextQuery: string) {
		setQuery(nextQuery);
		const params = new URLSearchParams(searchParams.toString());
		if (nextQuery.trim()) params.set("q", nextQuery);
		else params.delete("q");
		router.replace(
			params.toString() ? `${pathname}?${params.toString()}` : pathname,
		);
	}

	useEffect(() => {
		const nextQuery = searchParams.get("q") || "";
		if (nextQuery !== query) {
			setQuery(nextQuery);
		}
	}, [query, searchParams]);

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 md:px-6">
			<div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 text-center">
				<span className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
					Warehouse Pickup Packing
				</span>
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					Packing List
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Open pickup orders in packing mode, capture customer signature on the
					packing slip, and track completed packing history from one queue.
				</p>
				<Tabs
					value={tab}
					onValueChange={(value) => setTab(value as PackingListTab)}
				>
					<TabsList
						className={cn(
							"grid h-auto w-full gap-2 rounded-2xl p-1",
							isAdmin ? "grid-cols-3" : "grid-cols-2",
						)}
					>
						<TabsTrigger value="current">Current</TabsTrigger>
						<TabsTrigger value="completed">Completed</TabsTrigger>
						{isAdmin ? (
							<TabsTrigger value="cancelled">Cancelled</TabsTrigger>
						) : null}
					</TabsList>
				</Tabs>
				<div className="relative mt-2 w-full">
					<Icons.Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
					<input
						value={query}
						onChange={(event) => updateQuery(event.target.value)}
						placeholder={`Search ${getTabLabel(tab)} orders by order #, customer, sales rep, phone, or address`}
						className="h-16 w-full rounded-full border border-border bg-background pl-14 pr-6 text-base shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
					/>
				</div>
			</div>

			<div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
				<p>
					{packingList.isPending
						? `Loading ${getTabLabel(tab)} packing orders...`
						: `${filtered.length} order${filtered.length === 1 ? "" : "s"} in ${getTabLabel(tab)}`}
				</p>
			</div>

			{packingList.isPending ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 6 }).map((_, skeletonIndex) => (
						<div
							key={`packing-skeleton-${skeletonIndex + 1}`}
							className="h-48 animate-pulse rounded-3xl border bg-muted/30"
						/>
					))}
				</div>
			) : filtered.length ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{filtered.map((item) => (
						<PackingListCard
							key={`${tab}-${item.dispatchId}`}
							item={item}
							tab={tab}
							isAdmin={isAdmin}
							isUpdating={
								statusMutation.isPending &&
								statusMutation.variables?.dispatchId === item.dispatchId
							}
							onOpen={() => {
								void (async () => {
									try {
										const token = await generateToken({
											salesIds: [item.salesId],
											dispatchId: item.dispatchId,
											expiry: addDays(new Date(), 7).toISOString(),
											mode: "packing list",
										});

										openLink(
											"p/sales-invoice-v2",
											{ token, preview: true },
											true,
										);
									} catch (error) {
										toast.error("Unable to open packing slip.");
									}
								})();
							}}
							onStatusChange={(newStatus) => {
								statusMutation.mutate({
									dispatchId: item.dispatchId,
									oldStatus: (item.status || "queue") as
										| "queue"
										| "packing queue"
										| "packed"
										| "in progress"
										| "completed"
										| "cancelled",
									newStatus,
									completionMode:
										newStatus === "completed" ? "packed_only" : undefined,
								});
							}}
						/>
					))}
				</div>
			) : (
				<div className="rounded-3xl border border-dashed px-6 py-16 text-center">
					<p className="text-lg font-medium">{emptyState.title}</p>
					<p className="mt-2 text-sm text-muted-foreground">
						{emptyState.description}
					</p>
				</div>
			)}
		</div>
	);
}
