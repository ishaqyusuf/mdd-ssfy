"use client";

import { useContractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";
import { useContractorPayoutParams } from "@/hooks/use-contractor-payout-params";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTRPC } from "@/trpc/client";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";

import { columns, mobileColumn } from "./columns";

export function DataTable() {
	const trpc = useTRPC();
	const { filters, hasFilters, setFilters } = useContractorPayoutFilterParams();
	const { params, setParams } = useSortParams();
	const { setParams: setPayoutParams } = useContractorPayoutParams();
	const { data, ref, isFetching, hasNextPage } = useTableData({
		filter: {
			...filters,
			sort: params.sort,
		},
		route: trpc.jobs.contractorPayouts,
	});
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 1,
	});

	if (hasFilters && !data?.length) {
		return <NoResults setFilter={setFilters} />;
	}

	if (!data?.length && !isFetching) {
		return <EmptyState />;
	}

	return (
		<Table.Provider
			args={[
				{
					columns,
					mobileColumn,
					data,
					params,
					setParams,
					props: {
						loadMoreRef: ref,
						hasNextPage,
					},
					tableScroll,
					tableMeta: {
						rowClick(id, rowData) {
							setPayoutParams({
								openContractorPayoutId: rowData.id,
							});
						},
					},
				},
			]}
		>
			<div className="flex w-full flex-col gap-4">
				<div
					ref={tableScroll.containerRef}
					className="overflow-x-auto overscroll-x-none border-border scrollbar-hide md:border-l md:border-r"
				>
					<Table>
						<Table.TableHeader />
						<Table.Body>
							<Table.TableRow />
						</Table.Body>
					</Table>
				</div>
				<Table.LoadMore />
			</div>
		</Table.Provider>
	);
}
