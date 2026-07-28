"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

export type TaskEventHistoryRow =
	RouterOutputs["taskEvents"]["history"]["list"][number];

export type TaskEventHistoryTableMeta = {
	formatDate: (value?: Date | string | null) => string;
	renderMeta: (value: unknown) => ReactNode;
};

type Column = ColumnDef<TaskEventHistoryRow>;

function getMeta(table: unknown): TaskEventHistoryTableMeta | undefined {
	return (
		table as {
			options?: { meta?: TaskEventHistoryTableMeta };
		}
	).options?.meta;
}

function parseMeta(value: unknown): { triggerType?: string } | null {
	if (!value || typeof value !== "object") return null;
	return value as { triggerType?: string };
}

export function getTaskEventHistoryRowId(row: TaskEventHistoryRow) {
	return String(row.id);
}

const timeColumn: Column = {
	id: "time",
	header: "Time",
	accessorKey: "createdAt",
	...sizes.custom(136, 210, 156),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-32" },
		headerLabel: "Time",
		className: sizeClass(
			sizes.custom(136, 210, 156),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={meta?.formatDate(row.original.createdAt) ?? "-"}
			/>
		);
	},
};

const valueColumn: Column = {
	id: "value",
	header: "Value",
	accessorKey: "value",
	...sizes.custom(72, 112, 84),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Value",
		className: sizeClass(sizes.custom(72, 112, 84), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium">
			{row.original.value ?? 0}
		</span>
	),
};

const triggerColumn: Column = {
	id: "trigger",
	header: "Trigger",
	...sizes.custom(96, 150, 112),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Trigger",
		className: sizeClass(sizes.custom(96, 150, 112)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm text-muted-foreground"
			text={String(parseMeta(row.original.meta)?.triggerType || "-")}
		/>
	),
};

const metaColumn: Column = {
	id: "meta",
	header: "Meta",
	...sizes.custom(300, 700, 460),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-72" },
		headerLabel: "Meta",
		className: sizeClass(sizes.custom(300, 700, 460)),
		contentClassName: "whitespace-normal [text-overflow:clip]",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			meta?.renderMeta(row.original.meta) ?? (
				<span className="text-xs text-muted-foreground">No meta</span>
			)
		);
	},
};

export const columns: Column[] = [
	timeColumn,
	valueColumn,
	triggerColumn,
	metaColumn,
];
