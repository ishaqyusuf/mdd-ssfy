import { Avatar } from "@/components/avatar";
import { DeleteButton } from "@/components/delete-button";
import { EditButton } from "@/components/edit-button";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobRole } from "@/hooks/use-job-role";
import { useTRPC } from "@/trpc/client";
import { formatDate } from "@/utils/format";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Item } from "@gnd/ui/namespace";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { padStart } from "@gnd/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, ChevronDown, Send, XCircle } from "lucide-react";

export type JobItem = RouterOutputs["jobs"]["getJobs"]["data"][number];
interface ItemProps {
	item: JobItem;
}
type Column = ColumnDef<JobItem>;
const column1: Column = {
	header: "Job",
	accessorKey: "header",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<>
			<Item.Title className="whitespace-nowrap">{`#J-${padStart(item.id, 5, "0")}`}</Item.Title>
			<Item.Description>{formatDate(item.createdAt)}</Item.Description>
		</>
	),
};
const descriptionColumn: Column = {
	header: "Description",
	accessorKey: "description",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<>
			<Item.Title>
				{item.title} - {item.subtitle}{" "}
				{item.isCustom && (
					<Progress.Status badge noDot>
						Custom
					</Progress.Status>
				)}
			</Item.Title>
			<span>
				<TextWithTooltip
					text={item.description || "no report"}
					// tooltip={item.description || "no report"}
					// maxChars={50}

					className="max-w-sm line-clamp-2 xl:max-w-[250px]"
				/>
				{/* {item.description || "no report"} */}
			</span>
		</>
	),
};
const amountColumn: Column = {
	header: "Amount",
	accessorKey: "amount",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<Item.Title className="text-right">{`$${item.amount?.toFixed(2)}`}</Item.Title>
	),
};
const contractorColumn: Column = {
	header: "Contractor",
	accessorKey: "contractor",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<div className="flex items-center gap-2">
			<Avatar name={item?.user?.name} />
			<Item.Title>{item.user?.name}</Item.Title>
			{/* <Item.Description>{item.user?.email}</Item.Description> */}
		</div>
	),
};
const statusColumn: Column = {
	header: "Status",
	accessorKey: "status",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<Progress.Status badge noDot>
			{item.status}
		</Progress.Status>
	),
};
const actionColumn: Column = {
	header: "",
	accessorKey: "action",
	meta: {
		actionCell: true,
		preventDefault: true,
		className: "w-[250px] dt-action-cell",
	},
	cell: ({ row: { original: item } }) => (
		<>
			<Actions item={item} />
		</>
	),
};

export const adminColumns: Column[] = [
	column1,
	descriptionColumn,
	contractorColumn,
	statusColumn,
	amountColumn,
	actionColumn,
];

export const workersColumn: Column[] = [
	column1,
	descriptionColumn,
	statusColumn,
	amountColumn,
	actionColumn,
];

function StatusActionsDropdown({ item }: ItemProps) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const isPaid = item.status === "Paid" || !!item.payment?.id;

	const reviewMutation = useMutation(
		trpc.jobs.jobReview.mutationOptions({
			onSuccess(_, variables) {
				queryClient.invalidateQueries({
					queryKey: trpc.jobs.getJobs.pathKey(),
				});
				toast({
					title:
						variables.action === "submit"
							? "Job marked as submitted"
							: variables.action === "approve"
								? "Job approved"
								: "Job rejected",
					variant: variables.action === "reject" ? "destructive" : "success",
				});
			},
			onError() {
				toast({
					title: "Failed to update job status.",
					variant: "destructive",
				});
			},
		}),
	);

	if (isPaid) return null;

	const runAction = (action: "submit" | "approve" | "reject", note: string) => {
		reviewMutation.mutate({
			action,
			jobId: item.id,
			note,
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					size="sm"
					variant="outline"
					className="h-8 px-2"
					disabled={reviewMutation.isPending}
					onClick={(e) => e.stopPropagation()}
				>
					Status
					<ChevronDown className="ml-1 size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
				<DropdownMenuItem
					disabled={reviewMutation.isPending || item.status === "Submitted"}
					onClick={() =>
						runAction(
							"submit",
							"Marked as submitted from contractor jobs list.",
						)
					}
				>
					<Send className="mr-2 size-4" />
					Mark as submitted
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={reviewMutation.isPending || item.status === "Approved"}
					onClick={() =>
						runAction("approve", "Approved from contractor jobs list.")
					}
				>
					<CheckCircle2 className="mr-2 size-4" />
					Approve
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={reviewMutation.isPending || item.status === "Rejected"}
					onClick={() =>
						runAction("reject", "Rejected from contractor jobs list.")
					}
					className="text-destructive focus:text-destructive"
				>
					<XCircle className="mr-2 size-4" />
					Reject
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function Actions({ item }: ItemProps) {
	const { setParams } = useJobFormParams();
	const isAdmin = useJobRole().isAdmin;
	return (
		<div className="relative flex items-center justify-end gap-2 z-10">
			{isAdmin ? <StatusActionsDropdown item={item} /> : null}
			<EditButton
				onClick={(e) => {
					setParams({
						jobId: item.id,
						step: isAdmin ? 5 : 4,
						projectId: item?.project?.id,
						unitId: item?.home?.id,
						modelId: item?.home?.communityTemplateId,
						builderTaskId: item?.builderTaskId || -1,
					});
				}}
			/>
			<DeleteButton
				// size="xs"
				size="sm"
				route="jobs.deleteJob"
				input={{ id: item.id }}
				onDelete={() => {
					invalidateInfiniteQueries("jobs.getJobs");
				}}
			/>
		</div>
	);
}
export const mobileColumn: ColumnDef<JobItem>[] = [
	{
		header: "",
		accessorKey: "row",
		meta: {
			className: "flex-1 p-0",
			// preventDefault: true,
		},
		cell: ({ row: { original: item } }) => {
			return <ItemCard item={item} />;
		},
	},
];
function ItemCard({ item }: ItemProps) {
	// design a mobile version of the columns here
	const { setParams } = useJobParams();
	return <></>;
}
