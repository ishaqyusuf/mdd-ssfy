"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCommunityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { useTRPC } from "@/trpc/client";
import type { GetCommunityTemplatesSchema } from "@api/db/queries/community-template";
import { Button } from "@gnd/ui/button";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { NoResults } from "@gnd/ui/custom/no-results";
import { Table, useTableData } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Icons } from "@gnd/ui/icons";
import { isCommunityUnitRole } from "@gnd/utils/constants";
import Link from "next/link";
import { columns, communityUnitColumns, mobileColumn } from "./columns";
interface Props {
	defaultFilters?: GetCommunityTemplatesSchema;
}
export function DataTable(props: Props) {
	const trpc = useTRPC();
	const auth = useAuth();
	const isCommunityUnit = isCommunityUnitRole(auth.role?.name);
	// const { rowSelection, setRowSelection } = useCommunityTemplateStore();
	const { filters, hasFilters, setFilters } =
		useCommunityTemplateFilterParams();
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
		route: trpc.community.getCommunityTemplates,
	});
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 2,
	});
	const { setParams } = useCommunityTemplateParams();
	if (hasFilters && !data?.length) {
		return <NoResults setFilter={setFilters} />;
	}

	if (!data?.length && !isFetching) {
		return (
			<EmptyState
				CreateButton={
					<Button asChild size="sm">
						<Link href="/">
							<Icons.add className="mr-2 size-4" />
							<span>New</span>
						</Link>
					</Button>
				}
				onCreate={(e) => {}}
			/>
		);
	}
	return (
		<Table.Provider
			// value={createTableContext({
			args={[
				{
					columns: isCommunityUnit ? communityUnitColumns : columns,
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
							// setParams({
							//     openCommunityTemplateId: rowData.id,
							// });
						},
					},
					// })}
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
