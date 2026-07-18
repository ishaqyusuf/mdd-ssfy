"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type PaymentDashboardContractorRow =
	RouterOutputs["jobs"]["paymentDashboard"]["contractors"][number];

type Column = ColumnDef<PaymentDashboardContractorRow>;

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function getInsuranceTone(state?: string | null) {
	switch (state) {
		case "valid":
			return "default" as const;
		case "expiring_soon":
			return "secondary" as const;
		default:
			return "destructive" as const;
	}
}

export function getPaymentDashboardContractorRowId(
	row: PaymentDashboardContractorRow,
) {
	return String(row.id);
}

const contractorColumn: Column = {
	id: "contractor",
	header: "Contractor",
	accessorKey: "name",
	...sizes.custom(200, 360, 250),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Contractor",
		className: sizeClass(
			sizes.custom(200, 360, 250),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.name || "Unknown contractor"}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.email || "No email on file"}
			/>
		</div>
	),
};

const insuranceColumn: Column = {
	id: "insurance",
	header: "Insurance",
	accessorFn: (row) => row.insurance?.state,
	...sizes.custom(136, 210, 156),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Insurance",
		className: sizeClass(sizes.custom(136, 210, 156)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<Badge
				variant={getInsuranceTone(row.original.insurance?.state)}
				className="h-5 rounded-full text-[10px] capitalize"
			>
				{String(row.original.insurance?.state || "missing").replace("_", " ")}
			</Badge>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.insurance?.message || "Insurance status unavailable"}
			/>
		</div>
	),
};

const jobsColumn: Column = {
	id: "jobs",
	header: "Jobs",
	accessorKey: "pendingJobs",
	...sizes.custom(150, 220, 168),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Jobs",
		className: sizeClass(sizes.custom(150, 220, 168)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5">
			<Badge variant="secondary" className="h-5 rounded-full text-[10px]">
				{row.original.pendingReviewCount} review
			</Badge>
			<Badge variant="secondary" className="h-5 rounded-full text-[10px]">
				{row.original.readyToPayCount} ready
			</Badge>
		</div>
	),
};

const projectColumn: Column = {
	id: "lastProjectTitle",
	header: "Recent Project",
	accessorKey: "lastProjectTitle",
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Recent Project",
		className: sizeClass(sizes.custom(180, 320, 220)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.lastProjectTitle || "No recent project"}
		/>
	),
};

const totalColumn: Column = {
	id: "totalPay",
	header: "Total Pay",
	accessorKey: "totalPay",
	...sizes.custom(116, 170, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Total Pay",
		className: sizeClass(sizes.custom(116, 170, 130), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5 text-right">
			<span className="block truncate font-mono font-semibold">
				{formatCurrency(row.original.totalPay)}
			</span>
			<span className="block truncate text-xs text-muted-foreground">
				Bill {formatCurrency(row.original.pendingBill)}
			</span>
		</div>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.custom(104, 132, 112),
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-16" },
		className: sizeClass(
			sizes.custom(104, 132, 112),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "justify-end",
	},
	cell: ({ row }) => (
		<div className="relative z-10 flex justify-end">
			<Button size="sm" variant="outline" asChild>
				<Link
					href={`/contractors/jobs/payment-portal?contractorId=${row.original.id}`}
				>
					Open
				</Link>
			</Button>
		</div>
	),
};

export const columns: Column[] = [
	contractorColumn,
	insuranceColumn,
	jobsColumn,
	projectColumn,
	totalColumn,
	actionsColumn,
];
