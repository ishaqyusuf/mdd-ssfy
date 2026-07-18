"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type ContractorPayoutRow =
	RouterOutputs["jobs"]["contractorPayouts"]["data"][number];

type Column = ColumnDef<ContractorPayoutRow>;

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

export function getContractorPayoutRowId(row: ContractorPayoutRow) {
	return String(row.id);
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
			aria-label={`Select payout ${row.original.id}`}
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
			onClick={(event) => event.stopPropagation()}
		/>
	),
};

const payoutColumn: Column = {
	id: "date",
	header: "Payout",
	accessorKey: "createdAt",
	...sizes.custom(150, 240, 170),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Payout",
		className: sizeClass(
			sizes.custom(150, 240, 170),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<p className="truncate font-mono font-semibold">#{row.original.id}</p>
			<p className="truncate text-xs text-muted-foreground">
				{formatDate(row.original.createdAt)}
			</p>
		</div>
	),
};

const paidToColumn: Column = {
	id: "paidTo",
	header: "Paid To",
	accessorKey: "paidTo",
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Paid To",
		className: sizeClass(sizes.custom(180, 320, 220)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={row.original.paidTo || "Unknown contractor"}
		/>
	),
};

const authorizedByColumn: Column = {
	id: "authorizedBy",
	header: "Authorized By",
	accessorKey: "authorizedBy",
	...sizes.custom(170, 300, 210),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Authorized By",
		className: sizeClass(sizes.custom(170, 300, 210)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.authorizedBy || "Unknown payer"}
		/>
	),
};

const jobsColumn: Column = {
	id: "jobCount",
	header: "Jobs",
	accessorKey: "jobCount",
	...sizes.custom(120, 180, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Jobs",
		className: sizeClass(sizes.custom(120, 180, 130)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5">
			<Badge variant="secondary" className="h-5 rounded-full text-[10px]">
				{row.original.jobCount} jobs
			</Badge>
			{row.original.isCancelled ? (
				<Badge variant="outline" className="h-5 rounded-full text-[10px]">
					Cancelled
				</Badge>
			) : null}
		</div>
	),
};

const amountColumn: Column = {
	id: "amount",
	header: "Amount",
	accessorKey: "amount",
	...sizes.custom(120, 200, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Amount",
		className: sizeClass(sizes.custom(120, 200, 150), "text-right"),
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
	...sizes.custom(104, 140, 116),
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-16" },
		className: sizeClass(
			sizes.custom(104, 140, 116),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <Actions item={row.original} />,
};

export const columns: Column[] = [
	selectColumn,
	payoutColumn,
	paidToColumn,
	authorizedByColumn,
	jobsColumn,
	amountColumn,
	actionsColumn,
];

function Actions({ item }: { item: ContractorPayoutRow }) {
	return (
		<div className="relative z-10 flex justify-end">
			<Button size="sm" variant="outline" asChild>
				<Link href={`/contractors/jobs/payments/${item.id}`}>View</Link>
			</Button>
		</div>
	);
}
