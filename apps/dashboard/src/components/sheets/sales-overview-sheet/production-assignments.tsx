import { getSalesItemAssignments } from "@/actions/get-sales-item-assignments";
import { DataSkeleton } from "@/components/data-skeleton";
import {
	DataSkeletonProvider,
	type useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { timeout } from "@/lib/timeout";
import createContextFactory from "@/utils/context-factory";
import { skeletonListData } from "@/utils/format";
import { useState } from "react";
import { useAsyncMemo } from "use-async-memo";

import { Button } from "@gnd/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Icons } from "@gnd/ui/icons";

import { AccessBased } from "./access-based";
import { ProductionAssignmentForm } from "./production-assignment-form";
import { ProductionAssignmentRow } from "./production-assignment-row";
import { useProductionItem } from "./production-item-context";

export const {
	Provider: ProductionItemAssignmentsProvider,
	useContext: useProductionAssignments,
} = createContextFactory(() => {
	const ctx = useProductionItem();
	const { queryCtx, item } = ctx;
	const result = useAsyncMemo(async () => {
		await timeout(100);
		try {
			return {
				data: await getSalesItemAssignments(
					item.controlUid,
					item.itemId,
					item.doorId,
					queryCtx.assignedTo,
				),
				error: false,
			};
		} catch {
			return { data: undefined, error: true };
		}
	}, [item.controlUid]);
	return { data: result?.data, error: result?.error || false, item };
});

export function ProductionItemAssignments({
	view = "assignments",
}: {
	view?: "assignments" | "submissions";
}) {
	return (
		<ProductionItemAssignmentsProvider args={[]}>
			<Content view={view} />
		</ProductionItemAssignmentsProvider>
	);
}

function Content({ view }: { view: "assignments" | "submissions" }) {
	const ctx = useProductionAssignments();
	const { data, item } = ctx;
	const [open, setOpen] = useState(
		item.analytics?.stats?.prodAssigned?.qty === 0,
	);
	const query = useSalesOverviewQuery();
	const submissionsView = view === "submissions";

	return (
		<DataSkeletonProvider
			value={
				{
					loading: !data?.uid,
				} as unknown as ReturnType<typeof useCreateDataSkeletonCtx>
			}
		>
			<div className="mt-4 space-y-3 px-6">
				{submissionsView ? null : (
					<Collapsible open={open} onOpenChange={setOpen}>
						<div className="flex items-center justify-between">
							<h4 className="text-sm font-medium">Assignments</h4>
							<AccessBased>
								<CollapsibleTrigger asChild>
									<DataSkeleton className="h-8">
										<Button
											disabled={
												!item.analytics?.assignment?.pending?.qty ||
												query.dispatchMode
											}
											onClick={() => setOpen(!open)}
											size="sm"
											variant="outline"
											className="mt-2 w-full"
										>
											{open ? (
												<>
													<Icons.Close className="mr-2 h-4 w-4" />
													Close
												</>
											) : (
												<>
													<Icons.Add className="mr-2 h-4 w-4" />
													New Assignment
												</>
											)}
										</Button>
									</DataSkeleton>
								</CollapsibleTrigger>
							</AccessBased>
						</div>
						<CollapsibleContent>
							<ProductionAssignmentForm closeForm={() => setOpen(false)} />
						</CollapsibleContent>
					</Collapsible>
				)}
				{data?.uid && !data.assignments?.length ? (
					submissionsView ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							No submission assignment is available for this item.
						</p>
					) : (
						<EmptyAssignment />
					)
				) : null}
				{skeletonListData(data?.assignments, 1)?.map((assignment, index) => (
					<DataSkeleton className="min-h-36" key={assignment?.id ?? index}>
						<ProductionAssignmentRow
							index={index}
							view={submissionsView ? "submissions" : "assignments"}
						/>
					</DataSkeleton>
				))}
				<DataSkeleton className="hidden">
					{!!data?.assignments?.length || (
						<p className="py-2 text-center text-sm text-muted-foreground">
							No assignments yet
						</p>
					)}
				</DataSkeleton>
			</div>
		</DataSkeletonProvider>
	);
}

function EmptyAssignment() {
	return (
		<div className="flex h-36 items-center justify-center">
			<div className="flex flex-col items-center">
				<Icons.Transactions2 className="mb-4" />
				<div className="mb-6 space-y-2 text-center">
					<h2 className="text-lg font-medium">No Assignment</h2>
					<p className="text-sm text-[#606060]">
						There are no assignments on this item
					</p>
				</div>
			</div>
		</div>
	);
}
