"use client";

import { useSalesProfileFormParams } from "@/hooks/use-sales-profile-form-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { Table } from "@gnd/ui/data-table";
import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { TableSkeleton } from "../skeleton";
import { columns, mobileColumn } from "./columns";

export function DataTable() {
	const trpc = useTRPC();
	const profileForm = useSalesProfileFormParams();
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
	const profiles = profilesQuery.data ?? [];
	const tableScroll = useTableScroll({
		useColumnWidths: true,
		startFromColumn: 1,
	});
	const loadMoreRef = useCallback(() => undefined, []);

	if (profilesQuery.isPending) return <TableSkeleton />;

	if (!profiles.length) {
		return (
			<EmptyState
				CreateButton={
					<Button
						onClick={() => profileForm.openCreate()}
						size="sm"
						type="button"
					>
						<Icons.add className="mr-2 size-4" />
						<span>New profile</span>
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
					data: profiles,
					checkbox: false,
					tableScroll,
					props: {
						hasNextPage: false,
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
