"use client";

import { DispatchContent } from "@/components/dispatch-admin/dispatch-content";
import { DispatchSheetHeader } from "@/components/dispatch-admin/dispatch-sheet-header";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useTRPC } from "@/trpc/client";
import { Sheet, SheetContent } from "@gnd/ui/sheet";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";

export function DispatchSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setFilters } = useDispatchFilterParams();
	const open = Boolean(filters.dispatchId);
	const detail = useQuery(
		trpc.dispatch.detail.queryOptions(
			{ dispatchId: filters.dispatchId || 0 },
			{ enabled: Boolean(filters.dispatchId), staleTime: 15_000 },
		),
	);
	const close = () => {
		queryClient.invalidateQueries({ queryKey: trpc.dispatch.detail.pathKey() });
		void setFilters({
			dispatchId: null,
			dispatchSalesId: null,
			exceptionId: null,
			sheetMode: null,
			detailTab: "overview",
		});
	};
	return (
		<Sheet open={open} onOpenChange={(next) => !next && close()}>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-0 sm:max-w-xl lg:max-w-2xl"
			>
				<DispatchSheetHeader detail={detail.data} />
				<Suspense
					fallback={
						<div className="flex flex-col gap-4 p-5">
							{["one", "two", "three", "four"].map((key) => (
								<Skeleton key={key} className="h-20 w-full" />
							))}
						</div>
					}
				>
					{detail.isPending ? (
						<div className="flex flex-col gap-4 p-5">
							{["one", "two", "three", "four"].map((key) => (
								<Skeleton key={key} className="h-20 w-full" />
							))}
						</div>
					) : detail.error ? (
						<div className="p-5 text-sm text-destructive">
							{detail.error.message}
						</div>
					) : (
						<DispatchContent detail={detail.data} />
					)}
				</Suspense>
			</SheetContent>
		</Sheet>
	);
}
