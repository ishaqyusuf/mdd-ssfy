"use client";
import { useTRPC } from "@/trpc/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@gnd/ui/button";
import { Skeleton } from "@gnd/ui/skeleton";

export function FulfillmentActivity({
	salesId,
	fulfillmentId,
}: { salesId: number; fulfillmentId: number }) {
	const trpc = useTRPC();
	const query = useInfiniteQuery(
		trpc.dispatch.fulfillmentActivity.infiniteQueryOptions(
			{ salesId, fulfillmentId },
			{ getNextPageParam: (page) => page.nextCursor ?? undefined },
		),
	);
	if (query.isPending) return <Skeleton className="h-48" />;
	if (query.isError)
		return (
			<div role="alert">
				<p>{query.error.message}</p>
				<Button variant="outline" onClick={() => query.refetch()}>
					Try again
				</Button>
			</div>
		);
	const first = query.data.pages[0];
	const entries = query.data.pages.flatMap((page) => page.data);
	return (
		<section aria-label="Fulfillment activity" className="space-y-4 text-sm">
			<h3 className="font-semibold">Activity</h3>
			{first?.createdAt && (
				<p className="text-muted-foreground">
					Created {new Date(first.createdAt).toLocaleString()}
					{first.createdBy ? ` by ${first.createdBy}` : ""}.
				</p>
			)}
			{!entries.length && (
				<p className="text-muted-foreground">
					No additional fulfillment audit events recorded.
				</p>
			)}
			<ol className="space-y-3">
				{entries.map((entry) => (
					<li key={entry.id} className="space-y-1 border-l-2 pl-4">
						<p className="font-medium">{entry.name || "Fulfillment updated"}</p>
						<p className="text-xs text-muted-foreground">
							{entry.createdAt
								? new Date(entry.createdAt).toLocaleString()
								: "Date not recorded"}
							{entry.authorName ? ` · ${entry.authorName}` : ""}
						</p>
						{entry.targetDate && (
							<p>
								{entry.sourceDate || "Unscheduled"} → {entry.targetDate}
							</p>
						)}
					</li>
				))}
			</ol>
			{query.hasNextPage && (
				<Button
					variant="outline"
					disabled={query.isFetchingNextPage}
					onClick={() => query.fetchNextPage()}
				>
					{query.isFetchingNextPage ? "Loading…" : "Load more activity"}
				</Button>
			)}
		</section>
	);
}
