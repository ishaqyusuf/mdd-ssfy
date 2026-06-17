"use client";

import { useCustomerOverviewV2SheetQuery } from "@/hooks/use-customer-overview-v2-sheet-query";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type Customer = RouterOutputs["sales"]["customersIndex"]["data"][number];

type Column = ColumnDef<Customer>;

export function getCustomerAccountNo(customer: Customer) {
	return customer.phoneNo || `cust-${customer.id}`;
}

function getDisplayName(customer: Customer) {
	return customer.businessName || customer.name || "Unnamed customer";
}

function getInitials(value?: string | null) {
	if (!value) return "CU";

	return value
		.split(" ")
		.slice(0, 2)
		.map((segment) => segment[0]?.toUpperCase() || "")
		.join("");
}

const customerColumn: Column = {
	id: "customer",
	header: "Customer",
	accessorFn: (row) => getDisplayName(row),
	size: 300,
	minSize: 220,
	maxSize: 440,
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Customer",
		sortField: "name",
		className:
			"w-[300px] min-w-[220px] md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => {
		const customer = row.original;
		const displayName = getDisplayName(customer);
		const accountNo = getCustomerAccountNo(customer);

		return (
			<div className="flex min-w-0 items-center gap-3 overflow-hidden">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
					{getInitials(displayName)}
				</div>
				<div className="min-w-0 space-y-1">
					<div className="flex min-w-0 items-center gap-2">
						<TextWithTooltip
							className={cn(
								"max-w-full truncate font-medium uppercase",
								customer.businessName && "text-blue-700",
							)}
							text={displayName}
						/>
						{customer.businessName ? (
							<Badge
								variant="outline"
								className="h-5 shrink-0 rounded-full px-1.5 text-[10px] uppercase"
							>
								Business
							</Badge>
						) : null}
					</div>
					<div className="truncate font-mono text-xs text-muted-foreground">
						{accountNo}
					</div>
				</div>
			</div>
		);
	},
};

const phoneColumn: Column = {
	id: "phoneNo",
	header: "Phone",
	accessorKey: "phoneNo",
	size: 160,
	minSize: 130,
	maxSize: 220,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Phone",
		sortField: "phoneNo",
		className: "w-[160px] min-w-[130px]",
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.phoneNo || "No phone"}
		/>
	),
};

const secondaryContactColumn: Column = {
	id: "secondaryContact",
	header: "Secondary",
	accessorFn: (row) => row.phoneNo2 || row.email,
	size: 220,
	minSize: 160,
	maxSize: 320,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Secondary",
		className: "w-[220px] min-w-[160px]",
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={
				row.original.phoneNo2 || row.original.email || "No secondary contact"
			}
		/>
	),
};

const emailColumn: Column = {
	id: "email",
	header: "Email",
	accessorKey: "email",
	size: 260,
	minSize: 180,
	maxSize: 360,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Email",
		sortField: "email",
		className: "w-[260px] min-w-[180px]",
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.email || "No email"}
		/>
	),
};

const addressColumn: Column = {
	id: "address",
	header: "Address",
	accessorKey: "address",
	size: 340,
	minSize: 220,
	maxSize: 520,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Address",
		sortField: "address",
		className: "w-[340px] min-w-[220px]",
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.address || "No primary address"}
		/>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	size: 92,
	minSize: 92,
	maxSize: 92,
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className:
			"w-[92px] min-w-[92px] md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => <CustomerActions customer={row.original} />,
};

export const columns: Column[] = [
	customerColumn,
	phoneColumn,
	secondaryContactColumn,
	emailColumn,
	addressColumn,
	actionsColumn,
];

function CustomerActions({ customer }: { customer: Customer }) {
	const overviewSheet = useCustomerOverviewV2SheetQuery();
	const accountNo = getCustomerAccountNo(customer);

	return (
		<Button
			type="button"
			size="icon"
			variant="ghost"
			className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
			aria-label={`Open ${getDisplayName(customer)}`}
			title="Open customer"
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				overviewSheet.open(accountNo);
			}}
		>
			<Icons.ExternalLink className="size-4" />
			<span className="sr-only">Open customer</span>
		</Button>
	);
}
