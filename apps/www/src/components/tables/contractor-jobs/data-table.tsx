"use client";

import { _trpc } from "@/components/static-trpc";
import { useJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import type { GetJobsSchema } from "@api/db/queries/jobs";
import { Button } from "@gnd/ui/button";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { adminColumns, mobileColumn, workersColumn } from "./columns";
interface Props {
	defaultFilters?: GetJobsSchema;
	columnSet?: "admin" | "worker";
	emptyStateLabel?: string;
	CreateButton?: ReactNode;
}
export function DataTable(props: Props) {
	// const { rowSelection, setRowSelection } = useJobStore();
	const { filters, hasFilters, setFilters } = useJobFilterParams();
	const {
		data,
		ref: loadMoreRef,
		hasNextPage,
		isFetching,
	} = useTableData({
		filter: {
			...filters,
			...(props.defaultFilters || {}),
		},
		route: _trpc.jobs.getJobs,
	});
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 2,
	});
	const { setParams } = useJobParams();
	const columns = props.columnSet === "worker" ? workersColumn : adminColumns;
	if (hasFilters && !data?.length) {
		return <NoResults setFilter={setFilters} />;
	}

	if (!data?.length && !isFetching) {
		return (
			<EmptyState
				label={props.emptyStateLabel}
				CreateButton={
					props.CreateButton || (
						<Button asChild size="sm">
							<Link href="/">
								<Icons.add className="mr-2 size-4" />
								<span>New</span>
							</Link>
						</Button>
					)
				}
				onCreate={(e) => {}}
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
					props: {
						loadMoreRef,
						hasNextPage,
					},
					tableScroll,
					// rowSelection,
					// setRowSelection,
					tableMeta: {
						rowClick(id, rowData) {
							setParams({
								openJobId: rowData.id,
							});
						},
					},
				},
			]}
		>
			<div className="flex flex-col gap-4 w-full">
				<div
					// ref={tableScroll.containerRef}
					className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
				>
					<Table>
						<Table.TableHeader />
						<Table.Body>
							<Table.TableRow />
						</Table.Body>
					</Table>
				</div>
				<Table.LoadMore />
				{/* <BatchActions /> */}
			</div>
		</Table.Provider>
	);
}
