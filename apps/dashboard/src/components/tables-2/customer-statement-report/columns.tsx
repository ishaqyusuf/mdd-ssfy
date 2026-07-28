"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type CustomerStatementReportRow =
	RouterOutputs["customers"]["getCustomerStatementReport"]["customers"][number];

export type CustomerStatementReportTableMeta = {
	onOpenCustomer: (customerId: number | null) => void;
};

type Column = ColumnDef<CustomerStatementReportRow>;

function getMeta(table: unknown): CustomerStatementReportTableMeta | undefined {
	return (
		table as {
			options?: { meta?: CustomerStatementReportTableMeta };
		}
	).options?.meta;
}

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function formatNullableDate(value?: string | null) {
	if (!value) return "Never";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Never";

	return Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

export function getCustomerStatementReportRowId(
	row: CustomerStatementReportRow,
	index?: number,
) {
	return String(
		row.customerId ??
			row.accountNo ??
			row.customerEmail ??
			`${row.customerName}-${index ?? 0}`,
	);
}

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	accessorKey: "customerName",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "avatar-text", width: "w-44" },
		headerLabel: "Customer",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.customerName || "Unnamed customer"}
			/>
			<div className="flex min-w-0 items-center gap-2">
				{row.original.accountNo ? (
					<Badge variant="outline" className="shrink-0">
						{row.original.accountNo}
					</Badge>
				) : null}
				{row.original.customerEmail ? (
					<TextWithTooltip
						className="min-w-0 truncate text-xs text-muted-foreground"
						text={row.original.customerEmail}
					/>
				) : null}
			</div>
		</div>
	),
};

const dueOrdersColumn: Column = {
	id: "dueOrders",
	header: "Orders",
	accessorKey: "dueOrders",
	...sizes.custom(84, 120, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Orders",
		className: sizeClass(sizes.custom(84, 120, 96), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right tabular-nums">
			{row.original.dueOrders}
		</span>
	),
};

const dueAmountColumn: Column = {
	id: "dueAmount",
	header: "Due",
	accessorKey: "dueAmount",
	...sizes.custom(108, 150, 124),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Due",
		className: sizeClass(sizes.custom(108, 150, 124), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-medium tabular-nums">
			{formatCurrency(row.original.dueAmount)}
		</span>
	),
};

const lastSentColumn: Column = {
	id: "lastSent",
	header: "Last Sent",
	accessorKey: "lastSentAt",
	...sizes.custom(112, 160, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Last Sent",
		className: sizeClass(sizes.custom(112, 160, 128)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{formatNullableDate(row.original.lastSentAt)}
		</span>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(56, 72, 64),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(56, 72, 64),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		if (!row.original.customerId) return null;

		return (
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`Open statement for ${row.original.customerName}`}
				onClick={(event) => {
					event.stopPropagation();
					getMeta(table)?.onOpenCustomer(row.original.customerId);
				}}
			>
				<Icons.ChevronRight className="size-4 text-muted-foreground" />
			</Button>
		);
	},
};

export const columns: Column[] = [
	customerColumn,
	dueOrdersColumn,
	dueAmountColumn,
	lastSentColumn,
	actionsColumn,
];
