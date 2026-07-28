"use client";

import { InventoryKindReviewColumnVisibility } from "@/components/tables-2/inventory-kind-review/column-visibility";
import { DataTable } from "@/components/tables-2/inventory-kind-review/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useMutation } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

type InventoryKindReviewInput =
	RouterInputs["inventories"]["inventoryProductKindReview"];
type InventoryKindReviewResult =
	RouterOutputs["inventories"]["inventoryProductKindReview"];

type Props = {
	initialSettings?: Partial<TableSettings>;
	sort?: string[] | null;
};

export function InventoryKindReviewPage({ initialSettings, sort }: Props) {
	const trpc = useTRPC();
	const queryInput = {
		size: 24,
		sort,
	} satisfies InventoryKindReviewInput;
	const review = useSuspenseInfiniteQuery<InventoryKindReviewResult>(
		trpc.inventories.inventoryProductKindReview.infiniteQueryOptions(
			queryInput,
			{
				getNextPageParam: (lastPage) => lastPage.meta?.cursor,
			},
		) as never,
	);
	const backfill = useMutation(
		trpc.inventories.backfillInventoryProductKinds.mutationOptions({
			onSuccess(data) {
				toast({
					title: "Product types updated",
					description: `${data.inventoryCount} inventory items, ${data.componentCount} components, ${data.unchangedCount} unchanged.`,
					variant: "success",
				});
				review.refetch();
			},
		}),
	);

	const pages = review.data?.pages || [];
	const summary = pages[0]?.summary;
	const rows = useMemo(() => pages.flatMap((page) => page.data || []), [pages]);
	const mismatched = summary?.mismatched || 0;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between gap-4">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold">Kind Review</h2>
					<p className="text-sm text-muted-foreground">
						Review current product type against the pricing-based migration
						suggestion before or after running the backfill.
					</p>
				</div>
				<Button
					type="button"
					onClick={() => backfill.mutate()}
					disabled={backfill.isPending}
				>
					<Icons.Refresh className="mr-2 size-4" />
					Run Backfill
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">Total</div>
					<div className="text-2xl font-semibold">{summary?.total || 0}</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Needs Review
					</div>
					<div className="text-2xl font-semibold">{mismatched}</div>
				</Card>
				<Card className="p-4">
					<div className="text-xs uppercase text-muted-foreground">
						Heuristic
					</div>
					<div className="text-sm font-medium">Priced item =&gt; inventory</div>
				</Card>
			</div>

			<div className="flex justify-end">
				<InventoryKindReviewColumnVisibility />
			</div>

			<DataTable
				data={rows}
				initialSettings={initialSettings}
				hasNextPage={review.hasNextPage}
				isFetchingNextPage={review.isFetchingNextPage}
				fetchNextPage={() => {
					void review.fetchNextPage();
				}}
			/>
		</div>
	);
}
