"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { formatCurrency } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import { CircleAlert, CircleCheck, Eye } from "lucide-react";

export type SalesFinanceReceivableRow =
	RouterOutputs["salesFinance"]["receivables"]["data"][number];

type Column = ColumnDef<SalesFinanceReceivableRow>;

export function getSalesFinanceReceivableRowId(row: SalesFinanceReceivableRow) {
	return String(row.id);
}

function formatDate(value: string | number | Date | null | undefined) {
	if (!value) return "Not set";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Not set";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function agingLabel(bucket: string) {
	return (
		{
			current: "Current",
			"1_30": "1–30 days",
			"31_60": "31–60 days",
			"61_90": "61–90 days",
			"90_plus": "90+ days",
		}[bucket] || bucket
	);
}

const invoiceColumn: Column = {
	id: "invoice",
	header: "Invoice",
	accessorKey: "orderNo",
	...sizes.custom(150, 240, 180),
	enableHiding: false,
	enableResizing: true,
	meta: {
		sticky: true,
		headerLabel: "Invoice",
		skeleton: { type: "text", width: "w-28" },
		className: sizeClass(
			sizes.custom(150, 240, 180),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<p className="truncate font-mono text-sm font-medium">
				{row.original.orderNo}
			</p>
			<p className="truncate text-xs text-muted-foreground">
				{formatDate(row.original.createdAt)}
			</p>
		</div>
	),
};

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	accessorKey: "customerName",
	...sizes.custom(190, 340, 230),
	enableResizing: true,
	meta: {
		headerLabel: "Customer",
		skeleton: { type: "text", width: "w-40" },
		className: sizeClass(sizes.custom(190, 340, 230)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.customerName || "Unnamed customer"}
			/>
			<p className="truncate text-xs text-muted-foreground">
				{row.original.customerPhone ||
					row.original.customerEmail ||
					"No contact details"}
			</p>
		</div>
	),
};

function dateColumn(
	id: "createdAt" | "dueAt",
	label: string,
	fallback: string,
): Column {
	return {
		id,
		header: label,
		accessorKey: id,
		...sizes.custom(126, 190, 146),
		enableResizing: true,
		meta: {
			headerLabel: label,
			skeleton: { type: "text", width: "w-24" },
			className: sizeClass(sizes.custom(126, 190, 146)),
		},
		cell: ({ row }) => (
			<span className="truncate text-sm">
				{row.original[id] ? formatDate(row.original[id]) : fallback}
			</span>
		),
	};
}

const agingColumn: Column = {
	id: "daysOverdue",
	header: "Aging",
	accessorKey: "daysOverdue",
	...sizes.custom(130, 190, 148),
	enableResizing: true,
	meta: {
		headerLabel: "Aging",
		skeleton: { type: "badge" },
		className: sizeClass(sizes.custom(130, 190, 148)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<Badge
				variant={row.original.isOverdue ? "outline" : "secondary"}
				className={cn(
					row.original.isOverdue && "text-amber-700 dark:text-amber-400",
				)}
			>
				{agingLabel(row.original.agingBucket)}
			</Badge>
			<p className="truncate text-xs text-muted-foreground">
				{row.original.daysOverdue == null
					? "Due date not set"
					: row.original.daysOverdue
						? `${row.original.daysOverdue} days overdue`
						: "Not overdue"}
			</p>
		</div>
	),
};

function moneyColumn(
	id: "grandTotal" | "paidAmount" | "amountDue",
	label: string,
	emphasized?: boolean,
): Column {
	return {
		id,
		header: label,
		accessorKey: id,
		...sizes.custom(126, 190, 146),
		enableResizing: true,
		meta: {
			headerLabel: label,
			skeleton: { type: "text", width: "w-20" },
			className: sizeClass(sizes.custom(126, 190, 146), "text-right"),
			contentClassName: "text-right",
		},
		cell: ({ row }) => (
			<span
				className={cn(
					"block truncate text-right font-mono text-sm",
					emphasized && "font-semibold",
					emphasized &&
						row.original.isOverdue &&
						"text-amber-700 dark:text-amber-400",
				)}
			>
				{formatCurrency.format(row.original[id])}
			</span>
		),
	};
}

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "invoiceStatus",
	...sizes.custom(132, 200, 152),
	enableResizing: true,
	meta: {
		headerLabel: "Status",
		skeleton: { type: "badge" },
		className: sizeClass(sizes.custom(132, 200, 152)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<Badge variant="secondary" className="capitalize">
				{row.original.invoiceStatus}
			</Badge>
			<p className="truncate text-xs text-muted-foreground">
				{row.original.paymentTerm || "No payment term"}
			</p>
		</div>
	),
};

const reconciliationColumn: Column = {
	id: "reconciliation",
	header: "Reconciliation",
	accessorKey: "isBalanceReconciled",
	...sizes.custom(160, 240, 184),
	enableResizing: true,
	meta: {
		headerLabel: "Reconciliation",
		skeleton: { type: "badge" },
		className: sizeClass(sizes.custom(160, 240, 184)),
	},
	cell: ({ row }) =>
		row.original.isBalanceReconciled ? (
			<div className="flex items-center gap-2 text-emerald-700">
				<CircleCheck className="size-4 shrink-0" />
				<span className="truncate text-xs font-medium">Reconciled</span>
			</div>
		) : (
			<div className="flex items-center gap-2 text-amber-700">
				<CircleAlert className="size-4 shrink-0" />
				<span className="truncate text-xs font-medium">
					{formatCurrency.format(Math.abs(row.original.balanceDifference))}{" "}
					difference
				</span>
			</div>
		),
};

const salesRepColumn: Column = {
	id: "salesRep",
	header: "Sales rep",
	accessorKey: "salesRepName",
	...sizes.custom(150, 240, 180),
	enableResizing: true,
	meta: {
		headerLabel: "Sales rep",
		skeleton: { type: "text", width: "w-28" },
		className: sizeClass(sizes.custom(150, 240, 180)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={row.original.salesRepName || "Not assigned"}
		/>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.custom(84, 110, 92),
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-8" },
		className: sizeClass(
			sizes.custom(84, 110, 92),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <OpenReceivableButton id={row.original.id} />,
};

export const columns: Column[] = [
	invoiceColumn,
	customerColumn,
	dateColumn("createdAt", "Invoice date", "Not set"),
	dateColumn("dueAt", "Due date", "Not set"),
	agingColumn,
	moneyColumn("grandTotal", "Invoice"),
	moneyColumn("paidAmount", "Paid"),
	moneyColumn("amountDue", "Outstanding", true),
	statusColumn,
	reconciliationColumn,
	salesRepColumn,
	actionsColumn,
];

function OpenReceivableButton({ id }: { id: number }) {
	const { setParams } = useSalesFinanceFilterParams();

	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label={`Open receivable ${id}`}
			onClick={(event) => {
				event.stopPropagation();
				void setParams({ receivableId: id });
			}}
		>
			<Eye className="size-4" />
		</Button>
	);
}
