"use client";

import { useResolutionCenterFilterParams } from "@/hooks/use-resolution-center-filter-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";
import Portal from "../_v1/portal";
import { columns } from "./resolution-center-content";

export function ResolutionCenter() {
	const { filters, hasFilters, setFilters } = useResolutionCenterFilterParams();
	const trpc = useTRPC();
	const { data: summary } = useQuery(
		trpc.sales.getSalesResolutionsSummary.queryOptions(filters),
	);
	const {
		hasNextPage,
		queryData,
		ref: loadMoreRef,
		data,
		isFetching,
	} = useTableData({
		filter: filters,
		route: trpc.sales.getSalesResolutions,
	});
	const firstPage = queryData?.pages?.[0] as
		| { meta?: { count?: number } }
		| undefined;
	const conflictCount = summary?.unresolvedCount ?? firstPage?.meta?.count ?? 0;

	if (hasFilters && !data?.length && !isFetching) {
		return <NoResults setFilter={setFilters} />;
	}

	if (!data?.length && !isFetching) {
		return <EmptyState label="resolution conflicts" className="mt-16" />;
	}

	return (
		<Table.Provider
			args={[
				{
					columns,
					data,
					props: { loadMoreRef, hasNextPage },
					tableMeta: {
						hidePagination: true,
					},
				},
			]}
		>
			<Portal nodeId="resolutionHeaderActions">
				<div className="flex items-center gap-4">
					<Badge variant="destructive" className="text-sm">
						<Icons.AlertTriangle className="mr-1 h-4 w-4" />
						{conflictCount} Conflicts
					</Badge>
				</div>
			</Portal>
			<div className="flex w-full min-w-0 flex-col gap-4 overflow-hidden rounded-md border-y border-border md:rounded-lg md:border">
				<Table>
					<Table.Body>
						<Table.TableRow />
					</Table.Body>
				</Table>
				<Table.LoadMore />
			</div>
		</Table.Provider>
	);
}
