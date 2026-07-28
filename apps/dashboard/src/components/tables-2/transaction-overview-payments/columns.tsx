"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type TransactionOverviewPaymentRow = {
	id?: number | string | null;
	salesNo?: number | string | null;
	note?: string | null;
	date?: string | number | Date | null;
	status?: string | null;
	paymentMethod?: string | null;
	receivedBy?: string | null;
};

export type TransactionOverviewPaymentsTableMeta = {
	onOpenSale: (orderId: number | string) => void;
};

type Column = ColumnDef<TransactionOverviewPaymentRow>;

function getMeta(
	table: unknown,
): TransactionOverviewPaymentsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: TransactionOverviewPaymentsTableMeta };
		}
	).options?.meta;
}

export function getTransactionOverviewPaymentRowId(
	row: TransactionOverviewPaymentRow,
	index?: number,
) {
	return String(row.id ?? row.salesNo ?? `transaction-payment-${index ?? 0}`);
}

function formatDate(value?: string | number | Date | null) {
	if (!value) return "Not set";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

const dateColumn: Column = {
	id: "date",
	header: "Date",
	accessorKey: "date",
	...sizes.custom(108, 150, 124),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Date",
		className: sizeClass(
			sizes.custom(108, 150, 124),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={formatDate(row.original.date)}
		/>
	),
};

const descriptionColumn: Column = {
	id: "description",
	header: "Description",
	accessorKey: "note",
	...sizes.custom(220, 380, 270),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Description",
		className: sizeClass(sizes.custom(220, 380, 270)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="max-w-full truncate text-sm text-muted-foreground"
				text={row.original.note || "Payment"}
			/>
			<div className="flex min-w-0 items-center gap-2">
				{row.original.paymentMethod ? (
					<Badge variant="secondary" className="h-5 rounded-full uppercase">
						{row.original.paymentMethod}
					</Badge>
				) : null}
				{row.original.receivedBy ? (
					<TextWithTooltip
						className="min-w-0 truncate text-xs text-muted-foreground"
						text={`by ${row.original.receivedBy}`}
					/>
				) : null}
			</div>
		</div>
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

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(48, 56, 52),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(48, 56, 52),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		if (!row.original.salesNo) return null;

		return (
			<Button
				type="button"
				size="icon-xs"
				variant="ghost"
				aria-label={`Open sale ${row.original.salesNo}`}
				onClick={(event) => {
					event.stopPropagation();
					getMeta(table)?.onOpenSale(row.original.salesNo as number | string);
				}}
			>
				<Icons.ChevronRight className="size-4 text-muted-foreground" />
			</Button>
		);
	},
};

export const columns: Column[] = [
	dateColumn,
	descriptionColumn,
	statusColumn,
	actionsColumn,
];
