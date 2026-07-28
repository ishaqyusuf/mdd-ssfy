"use client";

import { InventoryAllocationsColumnVisibility } from "@/components/tables-2/inventory-allocations/column-visibility";
import { DataTable } from "@/components/tables-2/inventory-allocations/data-table";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { toast } from "@gnd/ui/use-toast";
import {
	useMutation,
	useQueryClient,
	useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

type InventoryAllocationsInput =
	RouterInputs["inventories"]["pendingAllocations"];
type InventoryAllocationsPage = {
	data?: Array<{
		id: number;
	}>;
	meta?: {
		count?: number;
		cursor?: string | number | null;
	};
};

export function InventoryAllocationReviewPage({ initialSettings }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params } = useSortParams();

	const queryInput = {
		size: 20,
		sort: params.sort,
	} as InventoryAllocationsInput;

	const allocations = useSuspenseInfiniteQuery<InventoryAllocationsPage>(
		trpc.inventories.pendingAllocations.infiniteQueryOptions(queryInput, {
			getNextPageParam: ({ meta }) =>
				(meta as { cursor?: string | number | null } | undefined)?.cursor,
		}) as never,
	);

	const invalidateAllocations = useCallback(async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.inventories.pendingAllocations.queryKey(),
		});
	}, [queryClient, trpc]);

	const approveAll = useMutation(
		trpc.inventories.approveBulkStockAllocation.mutationOptions({
			onSuccess(data) {
				const skippedCount = data.skippedCount || 0;
				toast({
					title: "Allocations approved",
					description: `${data.count} allocation suggestions approved${skippedCount ? `, ${skippedCount} skipped because they were already handled` : ""}.`,
					variant: "success",
				});
				void invalidateAllocations();
			},
		}),
	);

	const approveOne = useMutation(
		trpc.inventories.approveStockAllocation.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.skipped
						? "Allocation already handled"
						: "Allocation approved",
					description: data.skipped
						? "This allocation was no longer pending review."
						: undefined,
					variant: "success",
				});
				void invalidateAllocations();
			},
		}),
	);

	const rejectOne = useMutation(
		trpc.inventories.rejectStockAllocation.mutationOptions({
			onSuccess(data) {
				toast({
					title: data.skipped
						? "Allocation already handled"
						: "Allocation rejected",
					description: data.skipped
						? "This allocation was no longer pending review."
						: undefined,
					variant: "success",
				});
				void invalidateAllocations();
			},
		}),
	);

	const pages = allocations.data?.pages || [];
	const rows = useMemo(() => pages.flatMap((page) => page.data || []), [pages]);
	const pendingIds = rows.map((row) => row.id);
	const total = pages[0]?.meta?.count || 0;
	const tableActions = useMemo(
		() => ({
			onApprove: (allocationId: number) =>
				approveOne.mutate({
					allocationId,
				}),
			onReject: (allocationId: number) =>
				rejectOne.mutate({
					allocationId,
				}),
			isApproving: approveOne.isPending,
			isRejecting: rejectOne.isPending,
		}),
		[approveOne, rejectOne],
	);
	const approveSelected = useCallback(
		(allocationIds: number[]) => {
			if (!allocationIds.length) return;

			approveAll.mutate({
				allocationIds,
			});
		},
		[approveAll],
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold">Allocation Review</h2>
					<p className="max-w-3xl text-sm text-muted-foreground">
						Review suggested stock reservations before they become committed
						allocations.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<InventoryAllocationsColumnVisibility />
					<Button
						type="button"
						onClick={() =>
							approveAll.mutate({
								allocationIds: pendingIds,
							})
						}
						disabled={!pendingIds.length || approveAll.isPending}
					>
						Approve Visible
					</Button>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-3">
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">Pending</div>
					<div className="text-2xl font-semibold">{total}</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Visible Suggestions
					</div>
					<div className="text-2xl font-semibold">{rows.length}</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Safety Gate
					</div>
					<div className="text-sm font-medium">Manual approval required</div>
				</Card>
			</div>

			<DataTable
				initialSettings={initialSettings}
				actions={tableActions}
				onApproveSelected={approveSelected}
				isApprovingSelected={approveAll.isPending}
			/>
		</div>
	);
}
