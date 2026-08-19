"use client";

import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@gnd/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { useMemo } from "react";

export function DispatchBacklogView() {
	const trpc = useTRPC();
	const { filters, setFilters } = useDispatchFilterParams();
	const query = useSuspenseInfiniteQuery(
		trpc.dispatch.backlog.infiniteQueryOptions(
			{
				q: filters.q,
				deliveryModes: filters.deliveryModes,
				size: 50,
			},
			{
				getNextPageParam: ({ meta }) =>
					(meta as { cursor?: string | number | null } | undefined)?.cursor,
			},
		),
	);
	const rows = useMemo(
		() => query.data.pages.flatMap((page) => page.data),
		[query.data.pages],
	);
	if (!rows.length) {
		return (
			<Empty className="min-h-[420px] border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ClipboardList />
					</EmptyMedia>
					<EmptyTitle>Dispatch backlog is clear</EmptyTitle>
					<EmptyDescription>
						Orders requiring delivery appear here before a trip is created.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}
	return (
		<div className="overflow-hidden rounded-xl border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Order</TableHead>
						<TableHead>Customer</TableHead>
						<TableHead>Destination</TableHead>
						<TableHead>Mode</TableHead>
						<TableHead className="text-right">Action</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row) => {
						const customer =
							row.customer?.businessName ||
							row.customer?.name ||
							"Unnamed customer";
						const address = [
							row.shippingAddress?.address1,
							row.shippingAddress?.city,
							row.shippingAddress?.state,
						]
							.filter(Boolean)
							.join(", ");
						return (
							<TableRow key={row.id}>
								<TableCell className="font-mono font-medium">
									{row.orderId}
								</TableCell>
								<TableCell>{customer}</TableCell>
								<TableCell>{address || "Address required"}</TableCell>
								<TableCell>
									<Badge variant="outline">{row.deliveryOption}</Badge>
								</TableCell>
								<TableCell className="text-right">
									<Button
										size="sm"
										variant="outline"
										onClick={() =>
											setFilters({
												dispatchSalesId: row.id,
												sheetMode: "create",
											})
										}
									>
										<Plus data-icon="inline-start" />
										Create dispatch
									</Button>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
			{query.hasNextPage ? (
				<div className="flex justify-center border-t p-3">
					<Button
						variant="ghost"
						disabled={query.isFetchingNextPage}
						onClick={() => query.fetchNextPage()}
					>
						{query.isFetchingNextPage ? "Loading..." : "Load more"}
					</Button>
				</div>
			) : null}
		</div>
	);
}
