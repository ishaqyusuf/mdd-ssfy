"use client";

import { PackingListColumnVisibility } from "@/components/tables-2/packing-list/column-visibility";
import type {
	PackingListRow,
	PackingListStatus,
	PackingListTab,
} from "@/components/tables-2/packing-list/columns";
import { DataTable } from "@/components/tables-2/packing-list/data-table";
import { useAuth } from "@/hooks/use-auth";
import { openLink } from "@/lib/open-link";
import { prepareSalesHtmlPreview } from "@/modules/sales-print/application/sales-print-service";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

function getTabLabel(tab: PackingListTab) {
	if (tab === "completed") return "completed";
	if (tab === "cancelled") return "cancelled";
	return "current";
}

export function PackingListClient({ initialSettings }: Props) {
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

	function openPackingSlip(item: PackingListRow) {
		void (async () => {
			if (!item.salesId || !item.dispatchId) {
				toast.error("Packing slip is missing dispatch details.");
				return;
			}

			try {
				const previewUrl = await prepareSalesHtmlPreview({
					salesIds: [item.salesId],
					dispatchId: item.dispatchId,
					mode: "packing-slip",
				});
				openLink(previewUrl, null, true);
			} catch (_error) {
				toast.error("Unable to open packing slip.");
			}
		})();
	}

	function updateStatus(item: PackingListRow, newStatus: PackingListStatus) {
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
			completionMode: newStatus === "completed" ? "packed_only" : undefined,
		});
	}

	return (
		<div className="flex w-full min-w-0 flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<Tabs
					className="w-full min-w-0 lg:w-auto"
					value={tab}
					onValueChange={(value) => setTab(value as PackingListTab)}
				>
					<TabsList
						className={cn(
							"grid h-auto w-full gap-2 rounded-md p-1 lg:w-auto",
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

				<div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-xl">
					<div className="relative min-w-0 flex-1">
						<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<input
							value={query}
							onChange={(event) => updateQuery(event.target.value)}
							placeholder={`Search ${getTabLabel(tab)} orders`}
							className="h-10 w-full min-w-0 rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none transition placeholder:text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
						/>
					</div>
					{query ? (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="Clear packing list search"
							onClick={() => updateQuery("")}
						>
							<Icons.XCircle className="size-4" />
						</Button>
					) : null}
					<PackingListColumnVisibility />
				</div>
			</div>

			<DataTable
				initialSettings={initialSettings}
				tab={tab}
				searchTerm={query}
				isAdmin={isAdmin}
				isEnabled={tab !== "cancelled" || isAdmin}
				isUpdatingDispatchId={
					statusMutation.isPending ? activeMutationDispatchId : null
				}
				onClearSearch={() => updateQuery("")}
				onOpen={openPackingSlip}
				onStatusChange={updateStatus}
			/>
		</div>
	);
}
