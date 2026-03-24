"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type PaymentPortalJob =
	RouterOutputs["jobs"]["paymentPortal"]["jobs"][number];

type PaymentPortalMode = "payment" | "review";

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function formatDate(value?: Date | string | null) {
	if (!value) return "N/A";
	return format(new Date(value), "MMM d, yyyy");
}

function getStatusVariant(status?: string | null) {
	switch (status) {
		case "Approved":
			return "default" as const;
		case "Completed":
			return "secondary" as const;
		case "Payment Cancelled":
			return "outline" as const;
		default:
			return "secondary" as const;
	}
}

function canSelectJob(item: PaymentPortalJob, mode: PaymentPortalMode) {
	if (mode === "review") return item.paymentStage === "pending-review";
	return item.paymentStage === "ready-to-pay";
}

export function getPaymentPortalColumns({
	mode,
	onApprove,
	onReject,
	isReviewPending,
}: {
	mode: PaymentPortalMode;
	onApprove: (jobId: number) => void;
	onReject: (jobId: number) => void;
	isReviewPending: boolean;
}): ColumnDef<PaymentPortalJob>[] {
	return [
		{
			id: "select",
			enableSorting: false,
			enableHiding: false,
			meta: {
				className:
					"md:sticky md:left-0 bg-background z-20 border-r border-border",
			},
			cell: ({ row }) => {
				const item = row.original;
				const disabled = !canSelectJob(item, mode);
				return (
					<Checkbox
						checked={row.getIsSelected()}
						disabled={disabled}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
					/>
				);
			},
		},
		{
			header: "Job",
			accessorKey: "title",
			cell: ({ row: { original: item } }) => (
				<div className="flex min-w-0 max-w-[240px] flex-col gap-1">
					<p className="truncate font-medium text-foreground">
						{item.title}
						{item.subtitle ? ` - ${item.subtitle}` : ""}
					</p>
					<p className="truncate text-sm text-muted-foreground">
						#{item.id} • {formatDate(item.createdAt)}
					</p>
				</div>
			),
		},
		{
			header: "Location",
			accessorKey: "location",
			cell: ({ row: { original: item } }) => (
				<div className="flex min-w-0 max-w-[220px] flex-col gap-1">
					<p className="truncate font-medium text-foreground">
						{item.home?.lotBlock || "No lot assigned"}
					</p>
					<p className="truncate text-sm text-muted-foreground">
						{item.project?.title || "Unknown project"}
						{item.home?.modelName ? ` • ${item.home.modelName}` : ""}
					</p>
				</div>
			),
		},
		{
			header: "Status",
			accessorKey: "status",
			cell: ({ row: { original: item } }) => {
				return (
					<div className="flex flex-col gap-1">
						<Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
						<p className="text-xs text-muted-foreground">
							{item.paymentStage === "pending-review"
								? "Pending review"
								: "Ready to pay"}
						</p>
					</div>
				);
			},
		},
		{
			header: "Amount",
			accessorKey: "amount",
			cell: ({ row: { original: item } }) => (
				<div className="text-right font-semibold">
					{formatCurrency(item.amount)}
				</div>
			),
		},
		...(mode === "review"
			? [
					{
						id: "actions",
						header: "Review",
						enableSorting: false,
						cell: ({ row: { original: item } }) => (
							<div className="flex min-w-0 items-center justify-end gap-1.5">
								<Button
									size="sm"
									variant="outline"
									className="h-8 px-2.5"
									onClick={(event) => {
										event.stopPropagation();
										onReject(item.id);
									}}
									disabled={
										item.paymentStage !== "pending-review" || isReviewPending
									}
								>
									Reject
								</Button>
								<Button
									size="sm"
									className="h-8 px-2.5"
									onClick={(event) => {
										event.stopPropagation();
										onApprove(item.id);
									}}
									disabled={
										item.paymentStage !== "pending-review" || isReviewPending
									}
								>
									Approve
								</Button>
							</div>
						),
					} satisfies ColumnDef<PaymentPortalJob>,
				]
			: []),
	];
}
