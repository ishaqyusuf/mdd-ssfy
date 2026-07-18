"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { CommunityInstallCostRateSchema } from "@community/schema";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { handleNumberInput } from "@gnd/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { Controller, type UseFormReturn } from "react-hook-form";

export type CommunityInstallCostRow =
	RouterOutputs["community"]["getCommunityInstallCostRates"]["communityInstallCostRates"][number];

export type CommunityInstallCostTableRow = CommunityInstallCostRow & {
	isDraft?: boolean;
};

export type CommunityInstallCostsTableMeta = {
	editingId: number | null;
	form: UseFormReturn<CommunityInstallCostRateSchema>;
	unitOptions: string[];
	isSaving: boolean;
	onEdit: (row: CommunityInstallCostTableRow) => void;
	onCancel: () => void;
	onSave: () => void;
	setCustomUnit: (unit: string) => void;
};

type Column = ColumnDef<CommunityInstallCostTableRow>;

function getMeta(table: unknown): CommunityInstallCostsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: CommunityInstallCostsTableMeta };
		}
	).options?.meta;
}

export function getCommunityInstallCostRowId(
	row: CommunityInstallCostTableRow,
) {
	return String(row.id);
}

function isEditing(
	row: CommunityInstallCostTableRow,
	meta?: CommunityInstallCostsTableMeta,
) {
	return meta?.editingId === row.id;
}

function formatMoney(value?: number | null) {
	return `$${Number(value ?? 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	})}`;
}

const taskColumn: Column = {
	id: "task",
	header: "Task",
	accessorFn: (row) => row.title,
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Task",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		if (isEditing(row.original, meta)) {
			if (!meta) return null;

			return (
				<div>
					<Controller
						control={meta.form.control}
						name="title"
						render={({ field }) => (
							<Input
								{...field}
								value={field.value ?? ""}
								className="h-8"
								placeholder="Task"
							/>
						)}
					/>
				</div>
			);
		}

		return (
			<div className="min-w-0">
				<TextWithTooltip
					className="max-w-full truncate font-medium uppercase"
					text={row.original.title || "Untitled install cost"}
				/>
				<p className="truncate font-mono text-xs text-muted-foreground">
					Rate #{row.original.id}
				</p>
			</div>
		);
	},
};

const costColumn: Column = {
	id: "unitCost",
	header: "Cost",
	accessorFn: (row) => row.unitCost ?? 0,
	...sizes.custom(108, 150, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Cost",
		className: sizeClass(sizes.custom(108, 150, 120), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		if (isEditing(row.original, meta)) {
			if (!meta) return null;

			return (
				<div className="flex h-8 overflow-hidden rounded-md border border-input bg-background">
					<span className="flex items-center border-r border-border px-2 text-xs text-muted-foreground">
						$
					</span>
					<Controller
						control={meta.form.control}
						name="unitCost"
						render={({ field }) => (
							<Input
								{...field}
								value={field.value ?? ""}
								type="number"
								className="h-8 border-0 text-right shadow-none focus-visible:ring-0"
								onChange={(event) =>
									field.onChange(handleNumberInput(event.currentTarget.value))
								}
							/>
						)}
					/>
				</div>
			);
		}

		return (
			<span className="block truncate text-right font-mono tabular-nums">
				{formatMoney(row.original.unitCost)}
			</span>
		);
	},
};

const unitColumn: Column = {
	id: "unit",
	header: "Unit",
	accessorFn: (row) => row.unit,
	...sizes.custom(100, 140, 112),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-16" },
		headerLabel: "Unit",
		className: sizeClass(sizes.custom(100, 140, 112)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		if (isEditing(row.original, meta)) {
			if (!meta) return null;

			return (
				<div>
					<Controller
						control={meta.form.control}
						name="unit"
						render={({ field }) => (
							<ComboboxDropdown
								className="uppercase"
								selectedItem={
									field.value
										? { id: field.value, label: field.value }
										: undefined
								}
								onCreate={(value) => {
									const nextUnit = value?.toUpperCase() ?? "";
									if (!nextUnit) return;

									meta.setCustomUnit(nextUnit);
									field.onChange(nextUnit);
								}}
								renderOnCreate={(value) => (
									<div className="flex items-center space-x-2">
										<span>{`"${value}"`}</span>
									</div>
								)}
								placeholder="Unit"
								items={(meta?.unitOptions ?? []).map((unit) => ({
									id: unit,
									label: unit,
								}))}
								onSelect={(item) => {
									field.onChange(String(item.id));
								}}
							/>
						)}
					/>
				</div>
			);
		}

		return (
			<Badge variant="secondary" className="h-5 rounded-full uppercase">
				{row.original.unit || "No unit"}
			</Badge>
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
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-16" },
		className: sizeClass(
			sizes.custom(92, 120, 104),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		if (isEditing(row.original, meta)) {
			return (
				<div className="relative z-10 flex items-center justify-end gap-1">
					<Button
						type="button"
						variant="default"
						size="icon-xs"
						aria-label="Save install cost"
						disabled={meta?.isSaving}
						onClick={(event) => {
							event.stopPropagation();
							meta?.onSave();
						}}
					>
						<Icons.Check className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label="Cancel install cost edit"
						disabled={meta?.isSaving}
						onClick={(event) => {
							event.stopPropagation();
							meta?.onCancel();
						}}
					>
						<Icons.Close className="size-4" />
					</Button>
				</div>
			);
		}

		return (
			<div className="relative z-10 flex justify-end">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={`Edit ${row.original.title}`}
					onClick={(event) => {
						event.stopPropagation();
						meta?.onEdit(row.original);
					}}
				>
					<Icons.Edit className="size-4" />
				</Button>
			</div>
		);
	},
};

export const columns: Column[] = [
	taskColumn,
	costColumn,
	unitColumn,
	actionsColumn,
];
