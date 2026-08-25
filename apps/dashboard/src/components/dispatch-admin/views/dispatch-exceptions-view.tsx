"use client";

import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
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
import { ToggleGroup, ToggleGroupItem } from "@gnd/ui/toggle-group";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useMemo } from "react";

export function DispatchExceptionsView() {
	const trpc = useTRPC();
	const overview = useSalesOverviewQuery();
	const { filters, setFilters } = useDispatchFilterParams();
	const query = useSuspenseInfiniteQuery(
		trpc.dispatch.exceptions.infiniteQueryOptions(
			{
				status: filters.exceptionStatus,
				q: filters.q,
				driversId: filters.driversId,
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
	return (
		<div className="flex flex-col gap-3">
			<ToggleGroup
				type="single"
				variant="outline"
				value={filters.exceptionStatus}
				onValueChange={(value) => {
					if (value === "open" || value === "resolved") {
						void setFilters({ exceptionStatus: value });
					}
				}}
			>
				<ToggleGroupItem value="open">Open</ToggleGroupItem>
				<ToggleGroupItem value="resolved">Resolved</ToggleGroupItem>
			</ToggleGroup>
			{rows.length ? (
				<div className="overflow-hidden rounded-xl border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Reported</TableHead>
								<TableHead>Order</TableHead>
								<TableHead>Reason</TableHead>
								<TableHead>Driver</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row) => (
								<TableRow key={row.id}>
									<TableCell>
										{new Date(row.reportedAt).toLocaleDateString()}
									</TableCell>
									<TableCell className="font-mono font-medium">
										{row.delivery.order.orderId}
									</TableCell>
									<TableCell className="capitalize">
										{row.reasonCode.replaceAll("_", " ")}
									</TableCell>
									<TableCell>
										{row.delivery.driver?.name || "Unassigned"}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												row.status === "open" ? "destructive" : "secondary"
											}
										>
											{row.status}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="sm"
											onClick={() =>
												overview.openDispatch(
													row.delivery.order.orderId,
													row.delivery.id,
													"packing",
												)
											}
										>
											Open Packing
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : (
				<Empty className="min-h-[420px] border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CircleAlert />
						</EmptyMedia>
						<EmptyTitle>No {filters.exceptionStatus} exceptions</EmptyTitle>
						<EmptyDescription>
							Driver and manager dispatch issues appear here with their
							resolution history.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</div>
	);
}
