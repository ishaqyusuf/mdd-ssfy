"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { formatMoneyCents } from "@gnd/contractor-accounting";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

export type ContractorAccountingRow =
	RouterOutputs["contractorAccounting"]["entries"]["data"][number];
type Column = ColumnDef<ContractorAccountingRow>;

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

function money(cents: number | null | undefined) {
	return currency.format(Number(formatMoneyCents(cents ?? 0)));
}

function titleCase(value: string) {
	return value
		.replaceAll("_", " ")
		.toLowerCase()
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

const dateColumn: Column = {
	id: "effectiveAt",
	header: "Effective",
	accessorKey: "effectiveAt",
	...sizes.custom(132, 190, 150),
	enableHiding: false,
	meta: {
		sticky: true,
		headerLabel: "Effective date",
		skeleton: { type: "text", width: "w-24" },
		className: sizeClass(
			sizes.custom(132, 190, 150),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<p className="truncate text-sm font-medium">
			{new Date(row.original.effectiveAt).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})}
		</p>
	),
};

const contractorColumn: Column = {
	id: "contractor",
	header: "Contractor",
	accessorFn: (row) => row.contractor?.name,
	...sizes.custom(180, 300, 220),
	meta: {
		headerLabel: "Contractor",
		skeleton: { type: "text", width: "w-32" },
		className: sizeClass(sizes.custom(180, 300, 220)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium"
			text={
				row.original.contractor?.name ||
				`Contractor #${row.original.contractorId}`
			}
		/>
	),
};

const typeColumn: Column = {
	id: "type",
	header: "Type",
	accessorKey: "type",
	...sizes.custom(135, 190, 150),
	meta: {
		headerLabel: "Entry type",
		skeleton: { type: "badge" },
		className: sizeClass(sizes.custom(135, 190, 150)),
	},
	cell: ({ row }) => (
		<Badge variant="secondary">{titleCase(row.original.type)}</Badge>
	),
};

const descriptionColumn: Column = {
	id: "description",
	header: "Description",
	accessorKey: "description",
	...sizes.custom(220, 520, 330),
	meta: {
		headerLabel: "Description",
		skeleton: { type: "text", width: "w-48" },
		className: sizeClass(sizes.custom(220, 520, 330)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={row.original.description || "No description"}
		/>
	),
};

function moneyColumn(
	id: "amount" | "effect" | "balance",
	label: string,
	getValue: (row: ContractorAccountingRow) => number | null,
): Column {
	return {
		id,
		header: label,
		accessorFn: getValue,
		...sizes.custom(125, 180, 145),
		meta: {
			headerLabel: label,
			skeleton: { type: "text", width: "w-20" },
			className: sizeClass(sizes.custom(125, 180, 145), "text-right"),
			contentClassName: "text-right",
		},
		cell: ({ row }) => {
			const value = getValue(row.original);
			return (
				<span
					className={cn(
						"block truncate text-right font-mono text-sm",
						id === "effect" &&
							value != null &&
							(value < 0 ? "text-rose-700" : "text-emerald-700"),
						id === "balance" && "font-semibold",
					)}
				>
					{value == null ? "—" : money(value)}
				</span>
			);
		},
	};
}

const sourceColumn: Column = {
	id: "source",
	header: "Source",
	accessorKey: "sourceType",
	...sizes.custom(150, 260, 190),
	meta: {
		headerLabel: "Source",
		skeleton: { type: "text", width: "w-28" },
		className: sizeClass(sizes.custom(150, 260, 190)),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-1">
			<p className="truncate text-sm">{titleCase(row.original.sourceType)}</p>
			<p className="truncate font-mono text-xs text-muted-foreground">
				{row.original.sourceId}
			</p>
		</div>
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
	cell: ({ row }) => <OpenEntryButton id={row.original.id} />,
};

export const columns: Column[] = [
	dateColumn,
	contractorColumn,
	typeColumn,
	descriptionColumn,
	moneyColumn("amount", "Amount", (row) => row.amountCents),
	moneyColumn("effect", "Balance effect", (row) => row.liabilityDeltaCents),
	moneyColumn("balance", "Balance after", (row) => row.balanceAfterCents),
	sourceColumn,
	actionsColumn,
];

export function getContractorAccountingRowId(row: ContractorAccountingRow) {
	return row.id;
}

function OpenEntryButton({ id }: { id: string }) {
	const { setParams } = useContractorAccountingFilterParams();
	return (
		<Button
			size="icon"
			variant="ghost"
			aria-label={`Open ledger entry ${id}`}
			onClick={(event) => {
				event.stopPropagation();
				void setParams({ entryId: id });
			}}
		>
			<Eye className="size-4" />
		</Button>
	);
}
