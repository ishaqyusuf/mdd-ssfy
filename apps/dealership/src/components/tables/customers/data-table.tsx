"use client";

import { useCustomersFilterParams } from "@/hooks/use-customers-filter-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";
import { TableSkeleton } from "../skeleton";
import { columns, mobileColumn } from "./columns";

export function DataTable() {
	const trpc = useTRPC();
	const { filters, hasFilters, setFilters, isPending } =
		useCustomersFilterParams();
	const {
		data,
		ref: loadMoreRef,
		hasNextPage,
		isFetching,
	} = useTableData({
		filter: filters,
		route: trpc.dealerPortal.customersList,
	});
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 1,
	});

	if (isPending) return <TableSkeleton />;

	if (hasFilters && !data?.length) {
		return <NoResults setFilter={setFilters} />;
	}

	if (!data?.length && !isFetching) {
		return (
			<EmptyState
				CreateButton={
					<Button asChild size="sm">
						<Link href="/customers/new">
							<Icons.add className="mr-2 size-4" />
							<span>New customer</span>
						</Link>
					</Button>
				}
			/>
		);
	}

	return (
		<Table.Provider
			args={[
				{
					columns,
					mobileColumn,
					data,
					checkbox: false,
					tableScroll,
					props: {
						hasNextPage,
						loadMoreRef,
					},
					tableMeta: {
						mobileMode: {
							hideHeader: true,
							borderless: true,
						},
					},
				},
			]}
		>
			<div className="flex w-full flex-col gap-4">
				<Table.SummaryHeader />
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
