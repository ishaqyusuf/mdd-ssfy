"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Badge } from "@gnd/ui/badge";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type TransactionOverviewApplicationRow = {
	amount?: number | string | null;
	status?: string | null;
	order?: {
		id?: number | string | null;
		orderId?: number | string | null;
	} | null;
};

type Column = ColumnDef<TransactionOverviewApplicationRow>;

export function getTransactionOverviewApplicationRowId(
	row: TransactionOverviewApplicationRow,
	index?: number,
) {
	return String(
		row.order?.id ??
			row.order?.orderId ??
			`transaction-application-${index ?? 0}`,
	);
}

function formatCurrency(value?: number | string | null) {
	const amount = Number(value || 0);

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

const invoiceColumn: Column = {
	id: "invoice",
	header: "Invoice",
	accessorFn: (row) => row.order?.orderId,
	...sizes.custom(104, 150, 118),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Invoice",
		className: sizeClass(
			sizes.custom(104, 150, 118),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={`#${row.original.order?.orderId || "-"}`}
		/>
	),
};

const appliedColumn: Column = {
	id: "applied",
	header: "Applied",
	accessorKey: "amount",
	...sizes.custom(108, 145, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Applied",
		className: sizeClass(sizes.custom(108, 145, 120), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-medium tabular-nums">
			{formatCurrency(row.original.amount)}
		</span>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(108, 150, 124),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(108, 150, 124)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className="max-w-full truncate rounded-full uppercase"
		>
			{row.original.status || "unknown"}
		</Badge>
	),
};

export const columns: Column[] = [invoiceColumn, appliedColumn, statusColumn];
