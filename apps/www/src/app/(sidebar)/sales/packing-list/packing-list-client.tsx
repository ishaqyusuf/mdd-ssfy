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
type PackingListItem = {
	dispatchId?: number;
	salesId?: number;
	orderNo?: string | null;
	salesRep?: string | null;
	customerName?: string | null;
	address?: string | null;
	phone?: string | null;
	status?: string | null;
};

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
	item: PackingListItem;
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
				"h-full max-w-full overflow-hidden rounded-3xl border-border/70 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
				item.status === "cancelled" && "border-destructive/30 bg-destructive/5",
			)}
		>
			<CardContent className="flex h-full min-w-0 flex-col gap-4 p-4 sm:p-5">
				<div className="flex items-start justify-between gap-3">
					<button
						type="button"
						onClick={onOpen}
						className="min-w-0 flex-1 text-left"
					>
						<p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							Customer
						</p>
						<p className="mt-1 truncate text-xl font-semibold sm:text-2xl">
							{item.customerName || "Unknown customer"}
						</p>
					</button>

					<div className="flex shrink-0 items-center gap-1.5">
						<span
							className={cn(
								"max-w-[96px] truncate rounded-full px-2.5 py-1 text-xs font-semibold sm:max-w-none sm:px-3",
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
					className="flex min-w-0 flex-1 flex-col gap-3 text-left"
				>
					<div className="space-y-3 text-sm">
						<div className="flex min-w-0 items-start gap-2">
							<Icons.User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
							<div className="min-w-0">
								<p className="truncate font-medium">{item.orderNo}</p>
								<p className="truncate text-muted-foreground">
									Sales Rep: {item.salesRep || "Unassigned"}
								</p>
							</div>
						</div>

						<div className="flex min-w-0 items-start gap-2">
							<Icons.MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
							<p className="min-w-0 break-words text-muted-foreground">
								{item.address || "No address available"}
							</p>
						</div>

						<div className="flex min-w-0 items-center gap-2">
							<Icons.Phone className="size-4 shrink-0 text-muted-foreground" />
							<p className="min-w-0 truncate text-muted-foreground">
								{item.phone || "No phone number"}
							</p>
						</div>
					</div>

					<div className="mt-auto flex min-w-0 items-center justify-between gap-3 pt-2 text-sm">
						<span className="min-w-0 truncate text-muted-foreground">
							{tab === "current" ? "Open packing slip" : "View packing slip"}
						</span>
						<Icons.ExternalLink className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
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
	const activeMutationDispatchId =
		statusMutation.variables && "dispatchId" in statusMutation.variables
			? statusMutation.variables.dispatchId
			: null;

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
		<div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 overflow-x-hidden px-0 py-4 sm:gap-8 sm:px-2 sm:py-6 md:px-6">
			<div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col items-center gap-3 text-center">
				<span className="max-w-full truncate rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:tracking-[0.24em]">
					Warehouse Pickup Packing
				</span>
				<h1 className="max-w-full truncate text-2xl font-semibold tracking-tight md:text-3xl">
					Packing List
				</h1>
				<p className="max-w-2xl text-sm text-muted-foreground">
					Open pickup orders in packing mode, capture customer signature on the
					packing slip, and track completed packing history from one queue.
				</p>
				<Tabs
					className="w-full min-w-0"
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
						placeholder={`Search ${getTabLabel(tab)} orders`}
						className="h-12 w-full min-w-0 rounded-full border border-border bg-background pl-12 pr-4 text-sm shadow-sm outline-none transition placeholder:text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 sm:h-16 sm:pl-14 sm:pr-6 sm:text-base"
					/>
				</div>
			</div>

			<div className="flex min-w-0 items-center justify-between gap-3 text-sm text-muted-foreground">
				<p className="min-w-0 truncate">
					{packingList.isPending
						? `Loading ${getTabLabel(tab)} packing orders...`
						: `${filtered.length} order${filtered.length === 1 ? "" : "s"} in ${getTabLabel(tab)}`}
				</p>
			</div>

			{packingList.isPending ? (
				<div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{Array.from({ length: 6 }).map((_, skeletonIndex) => (
						<div
							key={`packing-skeleton-${skeletonIndex + 1}`}
							className="h-48 animate-pulse rounded-3xl border bg-muted/30"
						/>
					))}
				</div>
			) : filtered.length ? (
				<div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{filtered.map((item) => (
						<PackingListCard
							key={`${tab}-${item.dispatchId ?? item.orderNo ?? item.salesId}`}
							item={item}
							tab={tab}
							isAdmin={isAdmin}
							isUpdating={
								statusMutation.isPending &&
								activeMutationDispatchId === item.dispatchId
							}
							onOpen={() => {
								void (async () => {
									if (!item.salesId || !item.dispatchId) {
										toast.error("Packing slip is missing dispatch details.");
										return;
									}

									try {
										const token = await generateToken({
											salesIds: [item.salesId],
											dispatchId: item.dispatchId,
											expiry: addDays(new Date(), 7).toISOString(),
											mode: "packing list",
										});

										openLink(
											"p/sales-document-v2",
											{ token, templateId: "template-2" },
											true,
										);
									} catch (error) {
										toast.error("Unable to open packing slip.");
									}
								})();
							}}
							onStatusChange={(newStatus) => {
								if (!item.dispatchId) {
									toast.error("Unable to update dispatch.");
									return;
								}

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
