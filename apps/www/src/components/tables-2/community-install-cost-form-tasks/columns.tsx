"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Input } from "@gnd/ui/input";
import type { ColumnDef } from "@tanstack/react-table";
import { type Control, Controller } from "react-hook-form";
import type { CommunityInstallCostFormValues } from "./schema";

export type CommunityInstallCostFormTaskRow = {
	uid: string;
	title: string | null;
	cost: number | string | null;
	defaultQty: number | string | null;
};

type InstallCostFieldName = `installCost.${string}`;

export type CommunityInstallCostFormTasksTableMeta = {
	control: Control<CommunityInstallCostFormValues>;
};

type Column = ColumnDef<CommunityInstallCostFormTaskRow>;

function getMeta(
	table: unknown,
): CommunityInstallCostFormTasksTableMeta | undefined {
	return (
		table as {
			options?: { meta?: CommunityInstallCostFormTasksTableMeta };
		}
	).options?.meta;
}

function installCostFieldName(uid: string): InstallCostFieldName {
	return `installCost.${uid}`;
}

function formatMoney(value: number | string | null) {
	const amount = Number(value ?? 0);

	if (!Number.isFinite(amount)) return "$0.00";

	return `$${amount.toLocaleString(undefined, {
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
	})}`;
}

export function getCommunityInstallCostFormTaskRowId(
	row: CommunityInstallCostFormTaskRow,
) {
	return row.uid;
}

const taskColumn: Column = {
	id: "task",
	header: "Task",
	...sizes.custom(240, 420, 300),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Task",
		className: sizeClass(
			sizes.custom(240, 420, 300),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0">
			<div className="truncate text-sm font-medium uppercase text-foreground">
				{row.original.title || "Untitled task"}
			</div>
			<div className="truncate text-xs text-muted-foreground">
				{formatMoney(row.original.cost)} per qty
			</div>
		</div>
	),
};

const defaultQtyColumn: Column = {
	id: "defaultQty",
	header: "Def. Qty",
	...sizes.custom(88, 120, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Default quantity",
		className: sizeClass(sizes.custom(88, 120, 96), "text-right"),
		contentClassName: "justify-end text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono tabular-nums">
			{row.original.defaultQty ?? "-"}
		</span>
	),
};

const quantityColumn: Column = {
	id: "quantity",
	header: "Qty",
	...sizes.custom(88, 120, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Qty",
		className: sizeClass(sizes.custom(88, 120, 96)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<Controller
				control={meta?.control}
				name={installCostFieldName(row.original.uid)}
				render={({ field }) => (
					<Input
						{...field}
						value={field.value ? String(field.value) : ""}
						placeholder="0"
						inputMode="numeric"
						className="h-8 w-full px-2"
					/>
				)}
			/>
		);
	},
};

export const columns: Column[] = [taskColumn, defaultQtyColumn, quantityColumn];
