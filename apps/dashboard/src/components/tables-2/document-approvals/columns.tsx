"use client";

import { Avatar } from "@/components/avatar";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type ApprovalDocument = {
	id: number;
	title: string | null;
	description: string | null;
	url: string;
	expiresAt: string | null;
	status: "pending" | "approved" | "rejected";
	approvedAt: string | null;
	rejectedAt: string | null;
	createdAt: Date | string | null;
	user: {
		id: number;
		name: string;
		email: string;
		avatarUrl: string | null;
	};
};

export type DocumentApprovalsTableMeta = {
	isReviewPending?: boolean;
	onOpenReview: (row: ApprovalDocument) => void | Promise<void>;
	onReview: (
		row: ApprovalDocument,
		status: "approved" | "rejected",
	) => void | Promise<void>;
};

type Column = ColumnDef<ApprovalDocument>;

function getMeta(table: unknown): DocumentApprovalsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: DocumentApprovalsTableMeta };
		}
	).options?.meta;
}

function formatDate(value?: Date | string | null) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function badgeVariant(status: ApprovalDocument["status"]) {
	switch (status) {
		case "approved":
			return "success";
		case "rejected":
			return "destructive";
		default:
			return "outline";
	}
}

export function getDocumentApprovalRowId(row: ApprovalDocument) {
	return String(row.id);
}

const employeeColumn: Column = {
	id: "employee",
	header: "Employee",
	accessorFn: (row) => row.user.name,
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Employee",
		className: sizeClass(
			sizes.custom(180, 320, 220),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-2">
			<Avatar
				url={row.original.user.avatarUrl}
				name={row.original.user.name}
				email={row.original.user.email}
				className="size-8"
			/>
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate text-sm font-medium"
					text={row.original.user.name}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-[11px] text-muted-foreground"
					text={row.original.user.email || "No email"}
				/>
			</div>
		</div>
	),
};

const documentColumn: Column = {
	id: "document",
	header: "Document",
	accessorFn: (row) => row.title ?? "Insurance",
	...sizes.custom(180, 340, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Document",
		className: sizeClass(sizes.custom(180, 340, 220)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<a
				href={row.original.url}
				target="_blank"
				rel="noreferrer"
				className="block max-w-full truncate text-sm font-medium text-primary hover:underline"
			>
				{row.original.title || "Insurance"}
			</a>
			<TextWithTooltip
				className="max-w-full truncate text-[11px] text-muted-foreground"
				text={row.original.description || "Open uploaded document"}
			/>
		</div>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(104, 150, 118)),
	},
	cell: ({ row }) => (
		<Badge variant={badgeVariant(row.original.status)}>
			{row.original.status}
		</Badge>
	),
};

const datesColumn: Column = {
	id: "dates",
	header: "Dates",
	accessorFn: (row) => row.createdAt,
	...sizes.custom(132, 210, 154),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Dates",
		className: sizeClass(sizes.custom(132, 210, 154)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-xs">
			<TextWithTooltip
				className="max-w-full truncate"
				text={`Uploaded: ${formatDate(row.original.createdAt)}`}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={
					row.original.expiresAt
						? `Expires: ${formatDate(row.original.expiresAt)}`
						: "No expiry"
				}
			/>
		</div>
	),
};

const reviewedColumn: Column = {
	id: "reviewed",
	header: "Reviewed",
	accessorFn: (row) => row.approvedAt ?? row.rejectedAt ?? null,
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Reviewed",
		className: sizeClass(sizes.custom(112, 170, 128)),
	},
	cell: ({ row }) => {
		const value = row.original.approvedAt ?? row.original.rejectedAt;
		return (
			<TextWithTooltip
				className="max-w-full truncate text-xs"
				text={formatDate(value)}
			/>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(156, 210, 172),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(156, 210, 172),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const isPending = !!meta?.isReviewPending;

		return (
			<div className="relative z-10 flex items-center justify-end gap-1.5">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 px-2 text-xs"
					onClick={() => {
						void meta?.onOpenReview(row.original);
					}}
				>
					Open
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 px-2 text-xs"
					disabled={isPending || row.original.status === "approved"}
					onClick={() => {
						void meta?.onReview(row.original, "approved");
					}}
				>
					Approve
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 px-2 text-xs"
					disabled={isPending || row.original.status === "rejected"}
					onClick={() => {
						void meta?.onReview(row.original, "rejected");
					}}
				>
					Reject
				</Button>
			</div>
		);
	},
};

export const columns: Column[] = [
	employeeColumn,
	documentColumn,
	statusColumn,
	datesColumn,
	reviewedColumn,
	actionsColumn,
];
