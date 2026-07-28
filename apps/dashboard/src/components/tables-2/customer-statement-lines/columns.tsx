"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { getSalesOrderLifecycleStatusBadgeClassName } from "@gnd/sales/order-status";
import { Badge } from "@gnd/ui/badge";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

type CustomerStatementDetail =
	RouterOutputs["customers"]["getCustomerStatementDetail"];

export type CustomerStatementLineRow = CustomerStatementDetail["lines"][number];

export type CustomerStatementLinesTableMeta = {
	selectedLineSet: Set<number>;
	toggleLine: (salesId: number, checked: boolean) => void;
	allLinesSelected: boolean;
	hasPartialSelection: boolean;
	toggleAllLines: (checked: boolean) => void;
};

type Column = ColumnDef<CustomerStatementLineRow>;

function getMeta(table: unknown): CustomerStatementLinesTableMeta | undefined {
	return (
		table as {
			options?: { meta?: CustomerStatementLinesTableMeta };
		}
	).options?.meta;
}

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function getCustomerStatementLineRowId(row: CustomerStatementLineRow) {
	return String(row.salesId);
}

const selectColumn: Column = {
	id: "select",
	header: "",
	...sizes.custom(50, 50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		headerLabel: "Select",
		className: sizeClass(
			sizes.custom(50, 50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const checked = meta?.selectedLineSet.has(row.original.salesId) ?? false;

		return (
			<Checkbox
				checked={checked}
				onCheckedChange={(value) =>
					meta?.toggleLine(row.original.salesId, value === true)
				}
				aria-label={`Select order ${row.original.orderNo}`}
			/>
		);
	},
};

const orderColumn: Column = {
	id: "order",
	header: "Order #",
	accessorKey: "orderNo",
	...sizes.custom(112, 170, 132),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Order #",
		className: sizeClass(
			sizes.custom(112, 170, 132),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-mono text-sm font-medium uppercase"
			text={row.original.orderNo || "-"}
		/>
	),
};

const dateColumn: Column = {
	id: "date",
	header: "Date",
	accessorKey: "date",
	...sizes.custom(96, 130, 108),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Date",
		className: sizeClass(sizes.custom(96, 130, 108)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{row.original.date || "-"}
		</span>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "statusLabel",
	...sizes.custom(118, 180, 136),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(118, 180, 136)),
	},
	cell: ({ row }) => (
		<Badge
			className={cn(
				"max-w-full truncate border-0 whitespace-nowrap",
				getSalesOrderLifecycleStatusBadgeClassName(row.original.status),
			)}
		>
			{row.original.statusLabel}
		</Badge>
	),
};

const addressColumn: Column = {
	id: "address",
	header: "Address",
	accessorKey: "address",
	...sizes.custom(180, 320, 230),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Address",
		className: sizeClass(sizes.custom(180, 320, 230)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm text-muted-foreground"
			text={row.original.address || "-"}
		/>
	),
};

const invoiceColumn: Column = {
	id: "invoice",
	header: "Invoice",
	accessorKey: "invoice",
	...sizes.custom(104, 140, 116),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Invoice",
		className: sizeClass(sizes.custom(104, 140, 116), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right tabular-nums">
			{formatCurrency(row.original.invoice)}
		</span>
	),
};

const paidColumn: Column = {
	id: "paid",
	header: "Paid",
	accessorKey: "paid",
	...sizes.custom(96, 130, 108),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Paid",
		className: sizeClass(sizes.custom(96, 130, 108), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right tabular-nums">
			{formatCurrency(row.original.paid)}
		</span>
	),
};

const pendingColumn: Column = {
	id: "pending",
	header: "Pending",
	accessorKey: "pending",
	...sizes.custom(104, 148, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Pending",
		className: sizeClass(sizes.custom(104, 148, 120), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-medium tabular-nums">
			{formatCurrency(row.original.pending)}
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
	cell: () => null,
};

export const columns: Column[] = [
	selectColumn,
	orderColumn,
	dateColumn,
	statusColumn,
	addressColumn,
	invoiceColumn,
	paidColumn,
	pendingColumn,
	actionsColumn,
];
