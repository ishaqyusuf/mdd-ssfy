"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
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
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "avatar-text", width: "w-32" },
		headerLabel: "Customer",
		sortField: "name",
		className: sizeClass(
			sizes.custom(180, 320, 220),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const customer = row.original;
		const displayName = getDisplayName(customer);
		const accountNo = getCustomerAccountNo(customer);

		return (
			<div className="flex min-w-0 items-center gap-2 overflow-hidden">
				<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
					{getInitials(displayName)}
				</div>
				<div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
					<TextWithTooltip
						className={cn(
							"max-w-full truncate text-sm font-medium uppercase",
							customer.businessName && "text-blue-700",
						)}
						text={displayName}
					/>
					<span className="shrink-0 truncate font-mono text-[11px] text-muted-foreground">
						{accountNo}
					</span>
					{customer.businessName ? (
						<Badge
							variant="outline"
							className="h-5 shrink-0 rounded-full px-1.5 text-[10px] uppercase"
						>
							Business
						</Badge>
					) : null}
				</div>
			</div>
		);
	},
};

const phoneColumn: Column = {
	id: "phoneNo",
	header: "Phone",
	accessorKey: "phoneNo",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Phone",
		sortField: "phoneNo",
		className: sizeClass(sizes.custom(112, 170, 128)),
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
	...sizes.custom(130, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Secondary",
		className: sizeClass(sizes.custom(130, 220, 160)),
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
	...sizes.custom(150, 280, 200),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Email",
		sortField: "email",
		className: sizeClass(sizes.custom(150, 280, 200)),
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
	...sizes.custom(180, 360, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Address",
		sortField: "address",
		className: sizeClass(sizes.custom(180, 360, 240)),
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
	...sizes.custom(56, 64, 56),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(56, 64, 56),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
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
