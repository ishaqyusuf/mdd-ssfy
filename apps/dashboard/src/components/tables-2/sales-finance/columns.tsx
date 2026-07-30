"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { formatCurrency } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import { CircleAlert, Eye } from "lucide-react";

export type SalesFinanceRow =
	RouterOutputs["salesFinance"]["transactions"]["data"][number];

type Column = ColumnDef<SalesFinanceRow>;

export function getSalesFinanceRowId(row: SalesFinanceRow) {
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

function formatMoney(value: number) {
	return formatCurrency.format(Number(value || 0));
}

const selectColumn: Column = {
	id: "select",
	...sizes.custom(50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.custom(50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row }) => (
		<Checkbox
			aria-label={`Select payment ${row.original.paymentNo}`}
			checked={row.getIsSelected()}
			onCheckedChange={(checked) =>
				row.toggleSelected(
					checked === "indeterminate" ? !row.getIsSelected() : checked,
				)
			}
			onClick={(event) => event.stopPropagation()}
		/>
	),
};

const dateColumn: Column = {
	id: "createdAt",
	header: "Payment",
	accessorKey: "receivedAt",
	...sizes.custom(132, 190, 150),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Payment",
		className: sizeClass(
			sizes.custom(132, 190, 150),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<p className="truncate text-sm font-medium">
				{formatDate(row.original.receivedAt)}
			</p>
			<p className="truncate font-mono text-xs text-muted-foreground">
				#{row.original.paymentNo}
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
				{row.original.accountNo || "No customer account"}
			</p>
		</div>
	),
};

const invoicesColumn: Column = {
	id: "invoices",
	header: "Invoices",
	accessorKey: "orderNos",
	...sizes.custom(150, 260, 190),
	enableResizing: true,
	meta: {
		headerLabel: "Invoices",
		skeleton: { type: "text", width: "w-28" },
		className: sizeClass(sizes.custom(150, 260, 190)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-mono text-xs"
			text={row.original.orderNos.join(", ") || "Unapplied payment"}
		/>
	),
};

const methodColumn: Column = {
	id: "paymentMethod",
	header: "Method",
	accessorKey: "paymentMethod",
	...sizes.custom(118, 170, 132),
	enableResizing: true,
	meta: {
		headerLabel: "Method",
		skeleton: { type: "badge" },
		className: sizeClass(sizes.custom(118, 170, 132)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<Badge className="capitalize" variant="secondary">
				{row.original.paymentMethod}
			</Badge>
			<p className="truncate text-xs text-muted-foreground">
				{row.original.reference || "No reference"}
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
		headerLabel: "Status",
		skeleton: { type: "badge" },
		className: sizeClass(sizes.custom(118, 170, 132)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<Badge
				variant={row.original.needsReview ? "outline" : "secondary"}
				className="capitalize"
			>
				{row.original.status}
			</Badge>
			<p className="truncate text-xs text-muted-foreground capitalize">
				{row.original.applicationStatus}
			</p>
		</div>
	),
};

function moneyColumn(
	id:
		| "receivedAmount"
		| "feeAmount"
		| "refundedAmount"
		| "netAmount"
		| "appliedAmount"
		| "unappliedAmount",
	label: string,
	options?: { emphasized?: boolean; warning?: boolean },
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
		cell: ({ row }) => {
			const value = row.original[id];
			return (
				<span
					className={cn(
						"block truncate text-right font-mono text-sm",
						options?.emphasized && "font-semibold",
						options?.warning && value > 0 && "font-semibold text-amber-700",
					)}
				>
					{formatMoney(value)}
				</span>
			);
		},
	};
}

const reviewColumn: Column = {
	id: "review",
	header: "Review",
	accessorKey: "needsReview",
	...sizes.custom(150, 240, 180),
	enableResizing: true,
	meta: {
		headerLabel: "Review",
		skeleton: { type: "badge" },
		className: sizeClass(sizes.custom(150, 240, 180)),
	},
	cell: ({ row }) =>
		row.original.needsReview ? (
			<div className="flex min-w-0 items-start gap-2 text-amber-700">
				<CircleAlert className="mt-0.5 size-4 shrink-0" />
				<div className="min-w-0">
					<p className="truncate text-xs font-medium">
						{row.original.exceptionCodes
							.map((code) => code.replaceAll("_", " "))
							.join(", ")}
					</p>
					<p className="mt-0.5 truncate text-[11px] capitalize text-muted-foreground">
						{row.original.reconciliationStatus.replaceAll("_", " ")}
					</p>
				</div>
			</div>
		) : (
			<span className="text-xs capitalize text-muted-foreground">
				{row.original.reconciliationStatus === "resolved"
					? "Reconciled"
					: "Ready"}
			</span>
		),
};

const recordedByColumn: Column = {
	id: "recordedBy",
	header: "Recorded by",
	accessorKey: "recordedBy",
	...sizes.custom(150, 240, 180),
	enableResizing: true,
	meta: {
		headerLabel: "Recorded by",
		skeleton: { type: "text", width: "w-28" },
		className: sizeClass(sizes.custom(150, 240, 180)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={row.original.recordedBy}
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
	cell: ({ row }) => <OpenTransactionButton id={row.original.id} />,
};

export const columns: Column[] = [
	selectColumn,
	dateColumn,
	customerColumn,
	invoicesColumn,
	methodColumn,
	statusColumn,
	moneyColumn("receivedAmount", "Received"),
	moneyColumn("feeAmount", "Fees"),
	moneyColumn("refundedAmount", "Refunded"),
	moneyColumn("netAmount", "Net", { emphasized: true }),
	moneyColumn("appliedAmount", "Applied"),
	moneyColumn("unappliedAmount", "Unapplied", { warning: true }),
	reviewColumn,
	recordedByColumn,
	actionsColumn,
];

function OpenTransactionButton({ id }: { id: number }) {
	const { setParams } = useSalesFinanceFilterParams();

	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label={`Open payment ${id}`}
			onClick={(event) => {
				event.stopPropagation();
				void setParams({ transactionId: id });
			}}
		>
			<Eye className="size-4" />
		</Button>
	);
}
