"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import { formatDate } from "@gnd/utils/dayjs";
import { EmptyState } from "./empty-state";

export type SalesHistoryEntry = RouterOutputs["sales"]["getSalesHx"][number];

type SalesHistoryProps = {
	salesNo?: string | null;
	activeHistoryId?: number | null;
	busyHistoryId?: number | null;
	onPreview?: (entry: SalesHistoryEntry) => void;
	onRestore?: (entry: SalesHistoryEntry) => void;
};

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function SalesHistory(props: SalesHistoryProps) {
	const trpc = useTRPC();
	const history = useQuery(
		trpc.sales.getSalesHx.queryOptions(
			{
				salesNo: props.salesNo || "",
			},
			{
				enabled: Boolean(props.salesNo),
				refetchOnWindowFocus: true,
			},
		),
	);

	if (history.isPending) return <LoadingSkeleton />;

	if (history.isError) {
		return (
			<EmptyState
				className="h-[40vh]"
				title="Unable to load sales history"
				empty
				description="Refresh the form and try opening History again."
			/>
		);
	}

	if (!history.data?.length || !props.salesNo) {
		return (
			<EmptyState
				className="h-[40vh]"
				title="This sale has no saved history"
				empty
				description="A version will appear here after the next successful update."
			/>
		);
	}

	return (
		<div className="space-y-3">
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
				<p className="font-semibold">Saved versions</p>
				<p className="mt-1 text-blue-800">
					Previewing is read-only. Restoring loads that version as unsaved
					changes so you can review it before saving.
				</p>
			</div>

			{history.data.map((entry, index) => {
				const active = props.activeHistoryId === entry.id;
				const busy = props.busyHistoryId === entry.id;
				return (
					<Card
						className={
							active
								? "border-amber-400 bg-amber-50/70 shadow-sm"
								: "border-border/80"
						}
						key={entry.id}
					>
						<CardContent className="space-y-3 p-3">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<span
											className={`size-2 rounded-full ${
												index === 0 ? "bg-emerald-500" : "bg-slate-400"
											}`}
										/>
										<p className="text-xs font-semibold uppercase tracking-[0.1em]">
											{formatDate(entry.createdAt, "MMM DD, YYYY · h:mma")}
										</p>
									</div>
									<p className="mt-1 truncate text-xs text-muted-foreground">
										{entry.authorName || "Saved by system"}
										{entry.customerProfileName
											? ` · ${entry.customerProfileName}`
											: ""}
									</p>
								</div>
								{index === 0 ? (
									<span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
										Latest
									</span>
								) : null}
							</div>

							<div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2 text-xs">
								<div>
									<p className="text-muted-foreground">Items</p>
									<p className="font-semibold">{entry.lineItemCount}</p>
								</div>
								<div className="text-right">
									<p className="text-muted-foreground">Grand total</p>
									<p className="font-semibold">{currency(entry.grandTotal)}</p>
								</div>
							</div>

							{props.onPreview || props.onRestore ? (
								<div className="flex items-center gap-2">
									{props.onPreview ? (
										<Button
											type="button"
											size="sm"
											variant={active ? "default" : "outline"}
											className="flex-1"
											disabled={busy}
											onClick={() => props.onPreview?.(entry)}
										>
											{busy && !active ? (
												<Icons.Loader2 className="size-4 animate-spin" />
											) : (
												<Icons.Eye className="size-4" />
											)}
											{active ? "Previewing" : "Preview"}
										</Button>
									) : null}
									{props.onRestore ? (
										<Button
											type="button"
											size="sm"
											variant="ghost"
											disabled={busy}
											onClick={() => props.onRestore?.(entry)}
										>
											<Icons.History className="size-4" />
											Restore
										</Button>
									) : null}
								</div>
							) : null}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-3">
			{Array.from({ length: 4 }, (_, index) => (
				<div className="space-y-3 rounded-lg border p-3" key={index}>
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-5 w-14" />
					</div>
					<Skeleton className="h-10 w-full" />
					<div className="flex gap-2">
						<Skeleton className="h-8 flex-1" />
						<Skeleton className="h-8 w-20" />
					</div>
				</div>
			))}
		</div>
	);
}
