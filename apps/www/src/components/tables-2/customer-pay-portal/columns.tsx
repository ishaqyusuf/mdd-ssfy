"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type CustomerPayPortalRow = NonNullable<
	RouterOutputs["customers"]["getCustomerPayPortal"]
>["pendingSales"][number];

export type CustomerPayPortalTableMeta = {
	selectedIds: number[];
};

type Column = ColumnDef<CustomerPayPortalRow>;

function getMeta(table: unknown): CustomerPayPortalTableMeta | undefined {
	return (
		table as {
			options?: { meta?: CustomerPayPortalTableMeta };
		}
	).options?.meta;
}

function formatDate(value: string | number | Date | null | undefined) {
	if (!value) return "-";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function getCustomerPayPortalRowId(row: CustomerPayPortalRow) {
	return String(row.id);
}

const selectedColumn: Column = {
	id: "selected",
	header: "",
	...sizes.custom(50, 50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "icon" },
		headerLabel: "Selected",
		className: sizeClass(
			sizes.custom(50, 50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const selected = meta?.selectedIds.includes(row.original.id) ?? false;

		return (
			<Icons.CheckCircle
				className={cn("size-4", selected ? "text-emerald-700" : "opacity-20")}
			/>
		);
	},
};

const orderColumn: Column = {
	id: "order",
	header: "Order #",
	accessorKey: "orderId",
	...sizes.custom(132, 220, 154),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Order #",
		className: sizeClass(
			sizes.custom(132, 220, 154),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0">
			<TextWithTooltip
				className="max-w-full truncate font-mono text-sm font-medium uppercase"
				text={row.original.orderId || "-"}
			/>
			<p className="truncate text-xs text-muted-foreground">
				{row.original.paymentMethod || "Pending payment"}
			</p>
		</div>
	),
};

const dateColumn: Column = {
	id: "date",
	header: "Date",
	accessorKey: "createdAt",
	...sizes.custom(116, 180, 132),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Date",
		className: sizeClass(sizes.custom(116, 180, 132)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{formatDate(row.original.createdAt)}
		</span>
	),
};

const totalColumn: Column = {
	id: "total",
	header: "Total",
	accessorKey: "grandTotal",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Total",
		className: sizeClass(sizes.custom(112, 170, 128), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono tabular-nums">
			{formatCurrency(row.original.grandTotal)}
		</span>
	),
};

const pendingColumn: Column = {
	id: "pending",
	header: "Pending",
	accessorKey: "amountDue",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Pending",
		className: sizeClass(sizes.custom(112, 170, 128), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium tabular-nums">
			{formatCurrency(row.original.amountDue)}
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
	selectedColumn,
	orderColumn,
	dateColumn,
	totalColumn,
	pendingColumn,
	actionsColumn,
];
