"use client";

import FormInput from "@/components/common/controls/form-input";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { saveCommunityModelCostSchema } from "@api/schemas/community";
import type { ColumnDef } from "@tanstack/react-table";
import type { Control } from "react-hook-form";
import type { z } from "zod";

export type CommunityModelCostTaskRow = {
	uid: string;
	name: string | null;
};

type CommunityModelCostFormValues = z.infer<typeof saveCommunityModelCostSchema>;
type CostFieldName = `costs.${string}` | `tax.${string}`;

export type CommunityModelCostFormTasksTableMeta = {
	control: Control<CommunityModelCostFormValues>;
};

type Column = ColumnDef<CommunityModelCostTaskRow>;

function getMeta(
	table: unknown,
): CommunityModelCostFormTasksTableMeta | undefined {
	return (
		table as {
			options?: { meta?: CommunityModelCostFormTasksTableMeta };
		}
	).options?.meta;
}

function costFieldName(type: "costs" | "tax", uid: string): CostFieldName {
	return `${type}.${uid}`;
}

export function getCommunityModelCostTaskRowId(row: CommunityModelCostTaskRow) {
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
			<div className="truncate text-sm font-medium text-foreground">
				{row.original.name || "Untitled task"}
			</div>
			<div className="truncate text-xs text-muted-foreground">
				{row.original.uid}
			</div>
		</div>
	),
};

const costColumn: Column = {
	id: "cost",
	header: "Cost",
	...sizes.custom(112, 150, 124),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Cost",
		className: sizeClass(sizes.custom(112, 150, 124)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<FormInput
				className="mx-0 w-full"
				control={meta?.control}
				name={costFieldName("costs", row.original.uid)}
				numericProps={{
					prefix: "$",
					placeholder: "$0.00",
					className: "h-8 px-2",
					type: "tel",
				}}
			/>
		);
	},
};

const taxColumn: Column = {
	id: "tax",
	header: "Tax",
	...sizes.custom(112, 150, 124),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Tax",
		className: sizeClass(sizes.custom(112, 150, 124)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<FormInput
				className="mx-0 w-full"
				control={meta?.control}
				name={costFieldName("tax", row.original.uid)}
				numericProps={{
					prefix: "$",
					placeholder: "$0.00",
					className: "h-8 px-2",
					type: "tel",
				}}
			/>
		);
	},
};

export const columns: Column[] = [taskColumn, costColumn, taxColumn];
