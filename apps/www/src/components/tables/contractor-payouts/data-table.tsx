"use client";

import { useContractorPayoutFilterParams } from "@/hooks/use-contractor-payout-filter-params";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTRPC } from "@/trpc/client";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { useRouter } from "next/navigation";

import { BatchActions } from "./batch-actions";
import { columns, mobileColumn } from "./columns";

export function DataTable() {
	const router = useRouter();
	const trpc = useTRPC();
	const { filters, hasFilters, setFilters } = useContractorPayoutFilterParams();
	const { params, setParams } = useSortParams();
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
					checkbox: true,
					tableScroll,
					tableMeta: {
						hidePagination: true,
						rowClick(_, rowData) {
							router.push(`/contractors/jobs/payments/${rowData.id}`);
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
				<BatchActions />
			</div>
		</Table.Provider>
	);
}
