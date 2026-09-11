"use client";

import { useTRPC } from "@/trpc/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import { Skeleton } from "@gnd/ui/skeleton";

export function FulfillmentExceptions({
	salesId,
	fulfillmentId,
}: { salesId: number; fulfillmentId: number }) {
	const trpc = useTRPC();
	const query = useInfiniteQuery(
		trpc.dispatch.fulfillmentExceptions.infiniteQueryOptions(
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
	const items = query.data.pages.flatMap((page) => page.data);
	return (
		<section aria-label="Fulfillment exceptions" className="space-y-4">
			<h3 className="font-semibold">Exceptions</h3>
			{!items.length && (
				<p className="text-sm text-muted-foreground">
					No exceptions recorded for this fulfillment.
				</p>
			)}
			{items.map((item) => (
				<article
					key={item.id}
					className="space-y-2 rounded-md border p-4 text-sm"
				>
					<div className="flex items-start justify-between gap-3">
						<h4 className="font-medium capitalize">
							{item.reasonCode.replaceAll("_", " ")}
						</h4>
						<Badge variant="secondary">{item.status}</Badge>
					</div>
					<p className="text-xs text-muted-foreground">
						Reported {new Date(item.reportedAt).toLocaleString()}
					</p>
					{item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
					{item.resolvedAt && (
						<p className="text-xs text-muted-foreground">
							Resolved {new Date(item.resolvedAt).toLocaleString()}
						</p>
					)}
					{item.resolutionNote && (
						<p className="whitespace-pre-wrap">{item.resolutionNote}</p>
					)}
				</article>
			))}
			{query.hasNextPage && (
				<Button
					variant="outline"
					disabled={query.isFetchingNextPage}
					onClick={() => query.fetchNextPage()}
				>
					{query.isFetchingNextPage ? "Loading…" : "Load more exceptions"}
				</Button>
			)}
		</section>
	);
}
