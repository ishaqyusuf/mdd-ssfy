"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type DoorSupplierRow = NonNullable<
	RouterOutputs["sales"]["getSuppliers"]
>["stepProducts"][number];

export type DoorSuppliersTableMeta = {
	selectedSupplierUid?: string | null;
	isDeleting?: boolean;
	onSelect: (supplier: DoorSupplierRow) => void;
	onEdit: (supplier: DoorSupplierRow) => void;
	onDelete: (supplier: DoorSupplierRow) => void;
};

type Column = ColumnDef<DoorSupplierRow>;

function getMeta(table: unknown): DoorSuppliersTableMeta | undefined {
	return (
		table as {
			options?: { meta?: DoorSuppliersTableMeta };
		}
	).options?.meta;
}

export function getDoorSupplierRowId(row: DoorSupplierRow) {
	return String(row.id);
}

const selectColumn: Column = {
	id: "selected",
	header: "",
	...sizes.custom(50, 50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "icon" },
		headerLabel: "Selected",
		className: sizeClass(
			sizes.custom(50, 50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const isSelected = meta?.selectedSupplierUid === row.original.uid;

		return (
			<Icons.Check
				className={cn(
					"size-4",
					isSelected ? "text-emerald-600" : "text-transparent",
				)}
			/>
		);
	},
};

const supplierColumn: Column = {
	id: "supplier",
	header: "Supplier",
	accessorKey: "name",
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Supplier",
		className: sizeClass(
			sizes.custom(180, 320, 220),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const isSelected = meta?.selectedSupplierUid === row.original.uid;

		return (
			<div className="min-w-0">
				<TextWithTooltip
					className={cn(
						"max-w-full truncate font-medium uppercase",
						isSelected && "text-emerald-700",
					)}
					text={row.original.name || "Unnamed supplier"}
				/>
				<p className="truncate font-mono text-xs text-muted-foreground">
					{row.original.uid}
				</p>
			</div>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(92, 120, 104),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "button", width: "w-16" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(92, 120, 104),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<div className="relative z-10 flex items-center justify-end gap-1">
				<Button
					type="button"
					variant="outline"
					size="icon-xs"
					aria-label={`Edit ${row.original.name}`}
					onClick={(event) => {
						event.stopPropagation();
						meta?.onEdit(row.original);
					}}
				>
					<Icons.Edit className="size-4" />
				</Button>
				<Button
					type="button"
					variant="destructive"
					size="icon-xs"
					aria-label={`Delete ${row.original.name}`}
					disabled={meta?.isDeleting}
					onClick={(event) => {
						event.stopPropagation();
						meta?.onDelete(row.original);
					}}
				>
					<Icons.Delete className="size-4" />
				</Button>
			</div>
		);
	},
};

export const columns: Column[] = [selectColumn, supplierColumn, actionsColumn];
