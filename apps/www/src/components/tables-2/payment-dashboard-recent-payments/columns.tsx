"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type PaymentDashboardRecentPaymentRow =
	RouterOutputs["jobs"]["paymentDashboard"]["recentPayments"][number];

type Column = ColumnDef<PaymentDashboardRecentPaymentRow>;

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function formatDate(value: string | number | Date | null | undefined) {
	if (!value) return "Not set";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function getPaymentDashboardRecentPaymentRowId(
	row: PaymentDashboardRecentPaymentRow,
) {
	return String(row.id);
}

const payoutColumn: Column = {
	id: "payout",
	header: "Payout",
	accessorKey: "id",
	...sizes.custom(136, 220, 156),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Payout",
		className: sizeClass(
			sizes.custom(136, 220, 156),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-mono font-semibold"
				text={`#${row.original.id}`}
			/>
			<p className="truncate text-xs text-muted-foreground">
				{formatDate(row.original.createdAt)}
			</p>
		</div>
	),
};

const contractorColumn: Column = {
	id: "contractor",
	header: "Paid To",
	accessorKey: "contractor",
	...sizes.custom(160, 260, 176),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Paid To",
		className: sizeClass(sizes.custom(160, 260, 176)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={row.original.contractor || "Unknown contractor"}
		/>
	),
};

const jobsColumn: Column = {
	id: "jobCount",
	header: "Jobs",
	accessorKey: "jobCount",
	...sizes.custom(86, 140, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Jobs",
		className: sizeClass(sizes.custom(86, 140, 96)),
	},
	cell: ({ row }) => (
		<Badge variant="secondary" className="h-5 rounded-full text-[10px]">
			{row.original.jobCount} job{row.original.jobCount === 1 ? "" : "s"}
		</Badge>
	),
};

const methodColumn: Column = {
	id: "paymentMethod",
	header: "Method",
	accessorKey: "paymentMethod",
	...sizes.custom(130, 220, 144),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Method",
		className: sizeClass(sizes.custom(130, 220, 144)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate"
				text={row.original.paymentMethod || "Unknown"}
			/>
			{row.original.checkNo ? (
				<p className="truncate text-xs text-muted-foreground">
					Check {row.original.checkNo}
				</p>
			) : null}
		</div>
	),
};

const paidByColumn: Column = {
	id: "paidBy",
	header: "Paid By",
	accessorKey: "paidBy",
	...sizes.custom(130, 220, 144),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Paid By",
		className: sizeClass(sizes.custom(130, 220, 144)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.paidBy || "Unknown payer"}
		/>
	),
};

const amountColumn: Column = {
	id: "amount",
	header: "Amount",
	accessorKey: "amount",
	...sizes.custom(110, 160, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Amount",
		className: sizeClass(sizes.custom(110, 160, 120), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-semibold">
			{formatCurrency(row.original.amount)}
		</span>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.custom(82, 108, 88),
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-14" },
		className: sizeClass(
			sizes.custom(82, 108, 88),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "justify-end",
	},
	cell: ({ row }) => (
		<div className="relative z-10 flex justify-end">
			<Button size="sm" variant="outline" asChild>
				<Link href={`/contractors/jobs/payments/${row.original.id}`}>View</Link>
			</Button>
		</div>
	),
};

export const columns: Column[] = [
	payoutColumn,
	contractorColumn,
	jobsColumn,
	methodColumn,
	paidByColumn,
	amountColumn,
	actionsColumn,
];
