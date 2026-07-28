"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesEmailLedgerRow =
	RouterOutputs["emails"]["salesEmailAttempts"]["rows"][number];

export type SalesEmailLedgerTableMeta = {
	canResend?: boolean;
	isResendingAttemptId?: string | null;
	onResend: (attempt: SalesEmailLedgerRow) => void;
};

type Column = ColumnDef<SalesEmailLedgerRow>;

function getMeta(table: unknown): SalesEmailLedgerTableMeta | undefined {
	return (
		table as {
			options?: { meta?: SalesEmailLedgerTableMeta };
		}
	).options?.meta;
}

function toDate(value?: string | Date | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | Date | null) {
	const date = toDate(value);
	if (!date) return "Not set";

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatTime(value?: string | Date | null) {
	const date = toDate(value);
	if (!date) return "";

	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
}

function sentStatusDate(attempt: SalesEmailLedgerRow) {
	return (
		attempt.sentAt || attempt.failedAt || attempt.skippedAt || attempt.createdAt
	);
}

export function salesEmailStatusLabel(status: SalesEmailLedgerRow["status"]) {
	switch (status) {
		case "QUEUED":
			return "Queued";
		case "SENDING":
			return "Sending";
		case "SENT":
			return "Sent";
		case "FAILED":
			return "Failed";
		case "SKIPPED":
			return "Skipped";
		default:
			return status;
	}
}

function statusClassName(status: SalesEmailLedgerRow["status"]) {
	switch (status) {
		case "SENT":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "FAILED":
			return "border-rose-200 bg-rose-50 text-rose-700";
		case "SKIPPED":
			return "border-amber-200 bg-amber-50 text-amber-700";
		case "SENDING":
			return "border-sky-200 bg-sky-50 text-sky-700";
		default:
			return "border-muted bg-muted/40 text-muted-foreground";
	}
}

function emailKindLabel(attempt: SalesEmailLedgerRow) {
	const doc = attempt.documentType === "quote" ? "Quote" : "Invoice";
	if (attempt.emailKind === "composed_sales_document_email") {
		return `Custom ${doc}`;
	}

	return doc;
}

function personLabel(
	person?: { name?: string | null; email?: string | null } | null,
) {
	return person?.name || person?.email || "Not assigned";
}

export function getSalesEmailLedgerRowId(row: SalesEmailLedgerRow) {
	return row.id;
}

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(142, 210, 160),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(
			sizes.custom(142, 210, 160),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const attempt = row.original;
		const statusDate = sentStatusDate(attempt);

		return (
			<div className="flex min-w-0 items-center gap-2">
				<Badge variant="outline" className={statusClassName(attempt.status)}>
					{salesEmailStatusLabel(attempt.status)}
				</Badge>
				<span className="min-w-0 truncate text-xs text-muted-foreground">
					{formatDate(statusDate)} {formatTime(statusDate)}
				</span>
			</div>
		);
	},
};

const recipientColumn: Column = {
	id: "recipient",
	header: "Recipient",
	accessorKey: "recipientEmail",
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Recipient",
		className: sizeClass(sizes.custom(180, 320, 220)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.customerName || "Customer"}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.recipientEmail || "No email address"}
			/>
		</div>
	),
};

const salesColumn: Column = {
	id: "sales",
	header: "Sales",
	accessorKey: "salesNosText",
	...sizes.custom(128, 220, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Sales",
		className: sizeClass(sizes.custom(128, 220, 150)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={emailKindLabel(row.original)}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={
					row.original.salesNos?.length
						? row.original.salesNos.join(", ")
						: "No sales reference"
				}
			/>
		</div>
	),
};

const subjectColumn: Column = {
	id: "subject",
	header: "Subject",
	accessorKey: "subject",
	...sizes.custom(200, 420, 260),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-56" },
		headerLabel: "Subject",
		className: sizeClass(sizes.custom(200, 420, 260)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate text-sm"
				text={row.original.subject || "No subject"}
			/>
			{row.original.errorMessage ? (
				<TextWithTooltip
					className="max-w-full truncate text-xs text-rose-600"
					text={row.original.errorMessage}
				/>
			) : (
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={row.original.message || "No message preview"}
				/>
			)}
		</div>
	),
};

const repColumn: Column = {
	id: "rep",
	header: "Rep",
	accessorFn: (row) => row.salesRep?.name || row.salesRep?.email || "",
	...sizes.custom(128, 220, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Rep",
		className: sizeClass(sizes.custom(128, 220, 150)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={personLabel(row.original.salesRep)}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={`By ${personLabel(row.original.sender)}`}
			/>
		</div>
	),
};

const providerColumn: Column = {
	id: "provider",
	header: "Provider",
	accessorKey: "provider",
	...sizes.custom(136, 240, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Provider",
		className: sizeClass(sizes.custom(136, 240, 160)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate text-sm"
				text={row.original.provider || "Provider"}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={
					row.original.providerMessageId ||
					row.original.providerStatus ||
					row.original.taskRunId ||
					"Pending"
				}
			/>
		</div>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(104, 132, 116),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(104, 132, 116),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const attempt = row.original;
		const canResend = Boolean(meta?.canResend && attempt.canResend);
		const isResending = meta?.isResendingAttemptId === attempt.id;

		if (!canResend) {
			return (
				<span className="text-xs text-muted-foreground" aria-label="No action">
					-
				</span>
			);
		}

		return (
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={isResending}
				onClick={(event) => {
					event.stopPropagation();
					meta?.onResend(attempt);
				}}
			>
				{isResending ? (
					<Icons.Loader2 className="mr-2 size-4 animate-spin" />
				) : (
					<Icons.RotateCcw className="mr-2 size-4" />
				)}
				Resend
			</Button>
		);
	},
};

export const columns: Column[] = [
	statusColumn,
	recipientColumn,
	salesColumn,
	subjectColumn,
	repColumn,
	providerColumn,
	actionsColumn,
];
