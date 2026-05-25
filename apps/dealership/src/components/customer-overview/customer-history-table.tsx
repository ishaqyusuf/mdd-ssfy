"use client";

import { useTRPC } from "@/trpc/client";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { columns as orderColumns, mobileColumn as orderMobileColumn } from "../tables/orders/columns";
import { TableSkeleton } from "../tables/skeleton";
import { columns as quoteColumns, mobileColumn as quoteMobileColumn } from "../tables/quotes/columns";

type CustomerHistoryTableProps = {
	customerId: number;
	type: "orders" | "quotes";
};

export function CustomerHistoryTable({
	customerId,
	type,
}: CustomerHistoryTableProps) {
	const trpc = useTRPC();
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 1,
	});
	const route =
		type === "orders" ? trpc.dealerPortal.orders : trpc.dealerPortal.quotes;
	const {
		data,
		ref: loadMoreRef,
		hasNextPage,
		isFetching,
	} = useTableData({
		filter: {
			customerId,
		},
		route,
	});

	if (!data?.length && isFetching) return <TableSkeleton />;

	if (!data?.length) return <EmptyState />;

	return (
		<Table.Provider
			args={[
				{
					columns: type === "orders" ? orderColumns : quoteColumns,
					mobileColumn:
						type === "orders" ? orderMobileColumn : quoteMobileColumn,
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
