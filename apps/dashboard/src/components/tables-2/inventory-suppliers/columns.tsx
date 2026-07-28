"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type InventorySupplierRow = {
	id?: number | null;
	uid?: string | null;
	name: string;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
};

export type InventorySuppliersTableMeta = {
	defaultSupplierId?: number | null;
	isDeleting?: boolean;
	onSetDefault?: (supplier: InventorySupplierRow) => void;
	onEdit: (supplier: InventorySupplierRow) => void;
	onDelete: (supplier: InventorySupplierRow) => void;
};

type Column = ColumnDef<InventorySupplierRow>;

function getMeta(table: unknown): InventorySuppliersTableMeta | undefined {
	return (
		table as {
			options?: { meta?: InventorySuppliersTableMeta };
		}
	).options?.meta;
}

export function getInventorySupplierRowId(
	row: InventorySupplierRow,
	index?: number,
) {
	return String(row.id ?? row.uid ?? `${row.name}-${index ?? 0}`);
}

function contactLines(row: InventorySupplierRow) {
	return [row.email, row.phone].filter(Boolean) as string[];
}

const supplierColumn: Column = {
	id: "supplier",
	header: "Supplier",
	accessorKey: "name",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Supplier",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const supplier = row.original;
		const meta = getMeta(table);
		const isDefault =
			meta?.defaultSupplierId != null && supplier.id === meta.defaultSupplierId;

		return (
			<div className="min-w-0">
				<div className="flex min-w-0 items-center gap-2">
					<TextWithTooltip
						className={cn(
							"max-w-full truncate font-medium uppercase",
							isDefault && "text-emerald-700",
						)}
						text={supplier.name || "Unnamed supplier"}
					/>
					{isDefault ? <Badge className="shrink-0">Default</Badge> : null}
				</div>
				<p className="truncate font-mono text-xs text-muted-foreground">
					{supplier.uid || "No UID"}
				</p>
			</div>
		);
	},
};

const contactColumn: Column = {
	id: "contact",
	header: "Contact",
	...sizes.custom(170, 280, 210),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Contact",
		className: sizeClass(sizes.custom(170, 280, 210)),
	},
	cell: ({ row }) => {
		const lines = contactLines(row.original);

		if (!lines.length) {
			return <span className="text-sm text-muted-foreground">No contact</span>;
		}

		return (
			<div className="min-w-0 space-y-0.5">
				{lines.slice(0, 2).map((line) => (
					<TextWithTooltip
						key={line}
						className="max-w-full truncate text-sm text-muted-foreground"
						text={line}
					/>
				))}
			</div>
		);
	},
};

const addressColumn: Column = {
	id: "address",
	header: "Address",
	accessorKey: "address",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Address",
		className: sizeClass(sizes.custom(220, 420, 280)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm text-muted-foreground"
			text={row.original.address || "No address"}
		/>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(92, 120, 104),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(92, 120, 104),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const supplier = row.original;
		const isDefault =
			meta?.defaultSupplierId != null && supplier.id === meta.defaultSupplierId;

		return (
			<div className="relative z-10 flex items-center justify-end">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label={`Actions for ${supplier.name}`}
							onClick={(event) => event.stopPropagation()}
						>
							<Icons.MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{meta?.onSetDefault ? (
							<DropdownMenuItem
								disabled={!supplier.id || isDefault}
								onClick={(event) => {
									event.stopPropagation();
									meta.onSetDefault?.(supplier);
								}}
							>
								<Icons.Star className="mr-2 size-4" />
								<span>Default</span>
							</DropdownMenuItem>
						) : null}
						<DropdownMenuItem
							onClick={(event) => {
								event.stopPropagation();
								meta?.onEdit(supplier);
							}}
						>
							<Icons.Edit className="mr-2 size-4" />
							<span>Edit</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={!supplier.id || meta?.isDeleting}
							onClick={(event) => {
								event.stopPropagation();
								meta?.onDelete(supplier);
							}}
						>
							<Icons.Trash className="mr-2 size-4" />
							<span>Delete</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	},
};

export const columns: Column[] = [
	supplierColumn,
	contactColumn,
	addressColumn,
	actionsColumn,
];
