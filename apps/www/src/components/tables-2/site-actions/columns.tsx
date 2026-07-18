"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Checkbox } from "@gnd/ui/checkbox";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type SiteActionRow =
	RouterOutputs["siteActions"]["index"]["data"][number];

type Column = ColumnDef<SiteActionRow>;

type SiteActionMeta = {
	authorName?: string | null;
	authorId?: number | string | null;
	description?: string | null;
};

function getMeta(item: SiteActionRow): SiteActionMeta {
	if (!item.meta || typeof item.meta !== "object" || Array.isArray(item.meta)) {
		return {};
	}

	return item.meta as SiteActionMeta;
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "No date";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatTime(value: Date | string | null | undefined) {
	if (!value) return "";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";

	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
	});
}

function eventLabel(item: SiteActionRow) {
	return item.event || item.type || "Site action";
}

export function getSiteActionRowId(row: SiteActionRow) {
	return String(row.id);
}

const selectColumn: Column = {
	id: "select",
	...sizes.custom(50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.custom(50, 50),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row }) => (
		<Checkbox
			aria-label={`Select site action ${row.original.id}`}
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
			onClick={(event) => event.stopPropagation()}
		/>
	),
};

const dateColumn: Column = {
	id: "createdAt",
	header: "Date",
	accessorKey: "createdAt",
	...sizes.custom(150, 230, 170),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Date",
		sortField: "createdAt",
		className: sizeClass(
			sizes.custom(150, 230, 170),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<p className="truncate font-medium">{formatDate(row.original.createdAt)}</p>
			<p className="truncate text-xs text-muted-foreground">
				{formatTime(row.original.createdAt)}
			</p>
		</div>
	),
};

const eventColumn: Column = {
	id: "event",
	header: "Event",
	accessorKey: "event",
	...sizes.custom(130, 240, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Event",
		sortField: "event",
		className: sizeClass(sizes.custom(130, 240, 160)),
	},
	cell: ({ row }) => (
		<Badge variant="secondary" className="max-w-full rounded-full">
			<span className="truncate">{eventLabel(row.original)}</span>
		</Badge>
	),
};

const activityColumn: Column = {
	id: "activity",
	header: "Activity",
	accessorKey: "description",
	...sizes.custom(280, 680, 420),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-56" },
		headerLabel: "Activity",
		sortField: "description",
		className: sizeClass(sizes.custom(280, 680, 420)),
	},
	cell: ({ row }) => {
		const meta = getMeta(row.original);

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={row.original.description || "No activity description"}
				/>
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={meta.description || row.original.type || "No additional detail"}
				/>
			</div>
		);
	},
};

const authorColumn: Column = {
	id: "author",
	header: "Author",
	accessorFn: (row) => getMeta(row).authorName,
	...sizes.custom(150, 260, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Author",
		className: sizeClass(sizes.custom(150, 260, 180)),
	},
	cell: ({ row }) => {
		const meta = getMeta(row.original);

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={meta.authorName || "System"}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{row.original.type || "Notification"}
				</p>
			</div>
		);
	},
};

const referenceColumn: Column = {
	id: "reference",
	header: "Ref",
	accessorKey: "id",
	...sizes.custom(90, 140, 100),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Reference",
		className: sizeClass(sizes.custom(90, 140, 100)),
	},
	cell: ({ row }) => (
		<span className="truncate font-mono text-xs text-muted-foreground">
			#{row.original.id}
		</span>
	),
};

export const columns: Column[] = [
	selectColumn,
	dateColumn,
	eventColumn,
	activityColumn,
	authorColumn,
	referenceColumn,
];
