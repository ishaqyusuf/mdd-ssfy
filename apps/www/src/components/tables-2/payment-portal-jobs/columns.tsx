"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type PaymentPortalJobRow =
	RouterOutputs["jobs"]["paymentPortal"]["jobs"][number];

type Column = ColumnDef<PaymentPortalJobRow>;

const READY_TO_PAY_STATUSES = new Set(["Approved", "Completed"]);

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function formatDate(value: string | Date | null | undefined) {
	if (!value) return "N/A";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "N/A";

	return format(date, "MMM d, yyyy");
}

function canSelectJob(job: { paymentStage?: string | null }) {
	return !!job.paymentStage;
}

function canSelectForReview(job: { paymentStage?: string | null }) {
	return job.paymentStage === "pending-review";
}

function canMarkSubmitted(job: { status?: string | null }) {
	return job.status !== "Submitted" && job.status !== "Paid";
}

function getPaymentStageCopy(job: PaymentPortalJobRow) {
	if (job.paymentStage === "pending-review") {
		return "Pending review";
	}

	if (job.paymentStage === "ready-to-pay") {
		return "Ready to pay";
	}

	if (READY_TO_PAY_STATUSES.has(String(job.status || ""))) {
		return "Ready to pay";
	}

	return "Auto-approve on pay";
}

export function getPaymentPortalJobRowId(row: PaymentPortalJobRow) {
	return String(row.id);
}

type ColumnOptions = {
	isPendingReviewMode: boolean;
	isReviewPending: boolean;
	onMarkSubmitted: (jobId: number) => void;
	onApprove: (jobId: number) => void;
	onReject: (jobId: number) => void;
};

export function createColumns({
	isPendingReviewMode,
	isReviewPending,
	onMarkSubmitted,
	onApprove,
	onReject,
}: ColumnOptions): Column[] {
	const selectColumn: Column = {
		id: "select",
		...sizes.custom(50, 50, 50),
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			sticky: true,
			skeleton: { type: "checkbox" },
			className: sizeClass(
				sizes.custom(50, 50, 50),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
			),
			contentClassName: "flex items-center justify-center",
		},
		cell: ({ row }) => {
			const disabled = isPendingReviewMode
				? !canSelectForReview(row.original)
				: !canSelectJob(row.original);

			return (
				<Checkbox
					aria-label={`Select job ${row.original.id}`}
					checked={row.getIsSelected()}
					disabled={disabled}
					onCheckedChange={(checked) => {
						if (checked === "indeterminate") {
							row.toggleSelected();
						} else {
							row.toggleSelected(checked);
						}
					}}
					onClick={(event) => event.stopPropagation()}
				/>
			);
		},
	};

	const jobColumn: Column = {
		id: "job",
		header: "Job",
		accessorKey: "id",
		...sizes.custom(132, 210, 154),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			skeleton: { type: "text", width: "w-24" },
			headerLabel: "Job",
			className: sizeClass(
				sizes.custom(132, 210, 154),
				"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => (
			<div className="min-w-0 space-y-0.5">
				<p className="truncate font-mono font-semibold">#{row.original.id}</p>
				<p className="truncate text-xs text-muted-foreground">
					{formatDate(row.original.createdAt)}
				</p>
			</div>
		),
	};

	const detailsColumn: Column = {
		id: "details",
		header: "Details",
		accessorKey: "title",
		...sizes.custom(220, 420, 280),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-48" },
			headerLabel: "Details",
			className: sizeClass(sizes.custom(220, 420, 280)),
		},
		cell: ({ row }) => {
			const title = [row.original.title, row.original.subtitle]
				.filter(Boolean)
				.join(" - ");

			return (
				<div className="min-w-0 space-y-0.5">
					<TextWithTooltip
						className="max-w-full truncate font-medium"
						text={title || "Untitled job"}
					/>
					<TextWithTooltip
						className="max-w-full truncate text-xs text-muted-foreground"
						text={row.original.description || "No description"}
					/>
				</div>
			);
		},
	};

	const projectColumn: Column = {
		id: "project",
		header: "Project / Unit",
		accessorFn: (row) => row.project?.title,
		...sizes.custom(180, 320, 220),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-36" },
			headerLabel: "Project / Unit",
			className: sizeClass(sizes.custom(180, 320, 220)),
		},
		cell: ({ row }) => (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate"
					text={row.original.project?.title || "Unknown project"}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{row.original.home?.lotBlock || "No lot"} /{" "}
					{row.original.home?.modelName || "No model"}
				</p>
			</div>
		),
	};

	const statusColumn: Column = {
		id: "status",
		header: "Status",
		accessorKey: "status",
		...sizes.custom(118, 170, 132),
		enableResizing: true,
		meta: {
			skeleton: { type: "badge" },
			headerLabel: "Status",
			className: sizeClass(sizes.custom(118, 170, 132)),
		},
		cell: ({ row }) => (
			<Badge
				variant="secondary"
				className="h-5 max-w-full rounded-full text-[10px]"
			>
				<span className="truncate">{row.original.status || "Unknown"}</span>
			</Badge>
		),
	};

	const paymentColumn: Column = {
		id: "paymentStage",
		header: "Payment",
		accessorKey: "paymentStage",
		...sizes.custom(150, 260, 180),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-32" },
			headerLabel: "Payment",
			className: sizeClass(sizes.custom(150, 260, 180)),
		},
		cell: ({ row }) => (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate text-sm"
					text={getPaymentStageCopy(row.original)}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{row.original.paymentStage === "ready-to-pay"
						? "Include in payout"
						: row.original.paymentStage === "pending-review"
							? "Review before payout"
							: "Approves during payout"}
				</p>
			</div>
		),
	};

	const amountColumn: Column = {
		id: "amount",
		header: "Amount",
		accessorKey: "amount",
		...sizes.custom(104, 150, 116),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Amount",
			className: sizeClass(sizes.custom(104, 150, 116), "text-right"),
			contentClassName: "text-right",
		},
		cell: ({ row }) => (
			<span className="block truncate text-right font-mono font-semibold">
				{formatCurrency(row.original.amount)}
			</span>
		),
	};

	const actionsColumn: Column = {
		id: "actions",
		header: "Actions",
		...sizes.custom(220, 320, 250),
		enableResizing: false,
		enableHiding: false,
		meta: {
			actionCell: true,
			preventDefault: true,
			headerLabel: "Actions",
			skeleton: { type: "button", width: "w-40" },
			className: sizeClass(
				sizes.custom(220, 320, 250),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "justify-end",
		},
		cell: ({ row }) => {
			const canReviewThisJob = canSelectForReview(row.original);
			const showSubmittedAction = canMarkSubmitted(row.original);

			if (isPendingReviewMode && canReviewThisJob) {
				return (
					<div className="relative z-10 flex justify-end gap-1.5">
						<Button
							size="sm"
							variant="secondary"
							onClick={(event) => {
								event.stopPropagation();
								onMarkSubmitted(row.original.id);
							}}
							disabled={isReviewPending || !showSubmittedAction}
						>
							Submit
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={(event) => {
								event.stopPropagation();
								onReject(row.original.id);
							}}
							disabled={isReviewPending}
						>
							Reject
						</Button>
						<Button
							size="sm"
							onClick={(event) => {
								event.stopPropagation();
								onApprove(row.original.id);
							}}
							disabled={isReviewPending}
						>
							Approve
						</Button>
					</div>
				);
			}

			if (!showSubmittedAction) return null;

			return (
				<div className="relative z-10 flex justify-end">
					<Button
						size="sm"
						variant="secondary"
						onClick={(event) => {
							event.stopPropagation();
							onMarkSubmitted(row.original.id);
						}}
						disabled={isReviewPending}
					>
						Mark submitted
					</Button>
				</div>
			);
		},
	};

	return [
		selectColumn,
		jobColumn,
		detailsColumn,
		projectColumn,
		statusColumn,
		paymentColumn,
		amountColumn,
		actionsColumn,
	];
}

export const columns = createColumns({
	isPendingReviewMode: false,
	isReviewPending: false,
	onMarkSubmitted: () => {},
	onApprove: () => {},
	onReject: () => {},
});
