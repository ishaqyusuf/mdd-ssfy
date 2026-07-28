"use client";

import { Avatar } from "@/components/avatar";
import { DeleteButton } from "@/components/delete-button";
import { EditButton } from "@/components/edit-button";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useInvalidateQuery } from "@/hooks/use-invalidate-query";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobRole } from "@/hooks/use-job-role";
import { useTRPC } from "@/trpc/client";
import { formatDate } from "@/utils/format";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { padStart } from "@gnd/utils";
import type { ColumnDef } from "@tanstack/react-table";

export type JobRow = RouterOutputs["jobs"]["getJobs"]["data"][number];
type Column = ColumnDef<JobRow>;

export function getJobRowId(job: JobRow) {
	return String(job.id);
}

const selectColumn: Column = {
	id: "select",
	...sizes.custom(50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.custom(50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row }) => (
		<Checkbox
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
		/>
	),
};

const jobColumn: Column = {
	id: "job",
	header: "Job",
	accessorFn: (row) => row.jobId,
	...sizes.custom(150, 260, 180),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Job",
		className: sizeClass(
			sizes.custom(150, 260, 180),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const job = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<div className="flex items-center gap-1.5">
					<p className="whitespace-nowrap font-mono font-semibold">
						#J-{padStart(job.id, 5, "0")}
					</p>
					{job.isCustom ? (
						<Badge variant="outline" className="h-5 rounded-full text-[10px]">
							Custom
						</Badge>
					) : null}
				</div>
				<p className="truncate text-xs text-muted-foreground">
					{formatDate(job.createdAt)}
				</p>
			</div>
		);
	},
};

const descriptionColumn: Column = {
	id: "description",
	header: "Description",
	accessorFn: (row) => row.title,
	...sizes.custom(260, 560, 360),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-56" },
		headerLabel: "Description",
		className: sizeClass(sizes.custom(260, 560, 360)),
	},
	cell: ({ row }) => {
		const job = row.original;
		const title = [job.title, job.subtitle].filter(Boolean).join(" - ");

		return (
			<div className="min-w-0 space-y-1">
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					<TextWithTooltip
						className="max-w-full truncate font-medium"
						text={title || "Untitled job"}
					/>
				</div>
				<TextWithTooltip
					className="max-w-full truncate text-sm text-muted-foreground"
					text={job.description || "No report"}
				/>
				{job.builderTask?.taskName ? (
					<p className="truncate text-xs text-muted-foreground">
						{job.builderTask.taskName}
					</p>
				) : null}
			</div>
		);
	},
};

const workerDescriptionColumnSize = sizes.custom(220, 440, 300);
const workerDescriptionColumn: Column = {
	...descriptionColumn,
	...workerDescriptionColumnSize,
	meta: {
		...descriptionColumn.meta,
		className: sizeClass(workerDescriptionColumnSize),
	},
};

const contractorColumn: Column = {
	id: "contractor",
	header: "Contractor",
	accessorFn: (row) => row.user?.name,
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "avatar-text", width: "w-36" },
		headerLabel: "Contractor",
		className: sizeClass(sizes.custom(180, 320, 220)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-2">
			<Avatar name={row.original.user?.name} />
			<div className="min-w-0">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={row.original.user?.name || "No contractor"}
				/>
				{row.original.coWorker?.name ? (
					<p className="truncate text-xs text-muted-foreground">
						Co-worker: {row.original.coWorker.name}
					</p>
				) : null}
			</div>
		</div>
	),
};

const projectColumn: Column = {
	id: "project",
	header: "Project / Unit",
	accessorFn: (row) => row.project?.title,
	...sizes.custom(200, 420, 260),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Project / Unit",
		className: sizeClass(sizes.custom(200, 420, 260)),
	},
	cell: ({ row }) => {
		const job = row.original;

		return (
			<div className="min-w-0 space-y-1">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={job.project?.title || "No project"}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{job.home?.lotBlock || job.home?.modelName || "No unit"}
				</p>
			</div>
		);
	},
};

const workerProjectColumnSize = sizes.custom(180, 340, 220);
const workerProjectColumn: Column = {
	...projectColumn,
	...workerProjectColumnSize,
	meta: {
		...projectColumn.meta,
		className: sizeClass(workerProjectColumnSize),
	},
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorFn: (row) => row.status,
	...sizes.custom(130, 220, 150),
	enableResizing: true,
	meta: {
		preventDefault: true,
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(130, 220, 150)),
	},
	cell: ({ row }) => (
		<Progress.Status badge noDot>
			{row.original.status}
		</Progress.Status>
	),
};

const amountColumn: Column = {
	id: "amount",
	header: "Amount",
	accessorFn: (row) => row.amount,
	...sizes.custom(120, 200, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Amount",
		className: sizeClass(sizes.custom(120, 200, 140), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="font-semibold">
			${Number(row.original.amount || 0).toFixed(2)}
		</span>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.custom(180, 240, 210),
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-28" },
		className: sizeClass(
			sizes.custom(180, 240, 210),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <Actions item={row.original} />,
};

const workerActionsColumnSize = sizes.custom(150, 220, 170);
const workerActionsColumn: Column = {
	...actionsColumn,
	...workerActionsColumnSize,
	meta: {
		...actionsColumn.meta,
		className: sizeClass(
			workerActionsColumnSize,
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
};

export const columns: Column[] = [
	selectColumn,
	jobColumn,
	descriptionColumn,
	contractorColumn,
	projectColumn,
	statusColumn,
	amountColumn,
	actionsColumn,
];

export const workerDashboardColumns: Column[] = [
	selectColumn,
	jobColumn,
	workerDescriptionColumn,
	workerProjectColumn,
	statusColumn,
	amountColumn,
	workerActionsColumn,
];

export const projectTabColumns: Column[] = [
	selectColumn,
	jobColumn,
	descriptionColumn,
	contractorColumn,
	statusColumn,
	amountColumn,
	actionsColumn,
];

function isLockedWorkerJob(item: JobRow) {
	return (
		item.status === "Approved" ||
		String(item.status) === "Paid" ||
		!!item.payment?.id
	);
}

function StatusActionsDropdown({ item }: { item: JobRow }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const isPaid = String(item.status) === "Paid" || !!item.payment?.id;

	const reviewMutation = useMutation(
		trpc.jobs.jobReview.mutationOptions({
			onSuccess(_, variables) {
				const action = (variables as { action?: string })?.action;
				queryClient.invalidateQueries({
					queryKey: trpc.jobs.getJobs.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.jobs.getJobs.infiniteQueryKey(),
				});
				toast({
					title:
						action === "submit"
							? "Job marked as submitted"
							: action === "approve"
								? "Job approved"
								: "Job rejected",
					variant: action === "reject" ? "destructive" : "success",
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
				>
					Status
					<Icons.ChevronDown className="ml-1 size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					disabled={reviewMutation.isPending || item.status === "Submitted"}
					onClick={() =>
						runAction(
							"submit",
							"Marked as submitted from contractor jobs list.",
						)
					}
				>
					<Icons.Send className="mr-2 size-4" />
					Mark as submitted
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={reviewMutation.isPending || item.status === "Approved"}
					onClick={() =>
						runAction("approve", "Approved from contractor jobs list.")
					}
				>
					<Icons.CheckCircle2 className="mr-2 size-4" />
					Approve
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={reviewMutation.isPending || item.status === "Rejected"}
					onClick={() =>
						runAction("reject", "Rejected from contractor jobs list.")
					}
					className="text-destructive focus:text-destructive"
				>
					<Icons.XCircle className="mr-2 size-4" />
					Reject
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function Actions({ item }: { item: JobRow }) {
	const { invalidateInfiniteQueries } = useInvalidateQuery();
	const { setParams } = useJobFormParams();
	const isAdmin = useJobRole().isAdmin;
	const isLocked = !isAdmin && isLockedWorkerJob(item);
	const canDelete = item.deletionEligibility?.canDelete ?? !isLockedWorkerJob(item);

	return (
		<div className="relative z-10 flex items-center justify-end gap-2">
			{isAdmin ? <StatusActionsDropdown item={item} /> : null}
			<EditButton
				disabled={isLocked}
				onClick={() => {
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
				size="sm"
				disabled={!canDelete}
				route="jobs.deleteJob"
				input={{ id: item.id }}
				onDelete={() => {
					invalidateInfiniteQueries("jobs.getJobs");
				}}
			/>
		</div>
	);
}
