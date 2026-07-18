"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { toast } from "@gnd/ui/use-toast";
import type { ColumnDef } from "@tanstack/react-table";

export type ShortLinkRow =
	RouterOutputs["shortLinks"]["list"]["data"][number];

export type ShortLinksTableActions = {
	onEdit: (link: ShortLinkRow) => void;
	onDeactivate: (link: ShortLinkRow) => void;
	isDeactivating?: boolean;
};

type Column = ColumnDef<ShortLinkRow>;

function toDate(value?: string | Date | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value?: string | Date | null) {
	const date = toDate(value);
	if (!date) return "Not set";

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getStatus(link: ShortLinkRow) {
	if (link.deletedAt || !link.active) {
		return {
			label: "Inactive",
			variant: "secondary" as const,
		};
	}

	const expiresAt = toDate(link.expiresAt);
	if (expiresAt && expiresAt.getTime() <= Date.now()) {
		return {
			label: "Expired",
			variant: "destructive" as const,
		};
	}

	return {
		label: "Active",
		variant: "outline" as const,
	};
}

async function copyToClipboard(value: string) {
	await navigator.clipboard.writeText(value);
	toast({
		title: "Short link copied",
		description: value,
		variant: "success",
	});
}

export function getShortLinkRowId(row: ShortLinkRow) {
	return row.id;
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
			aria-label={`Select short link ${row.original.slug}`}
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

const shortLinkColumn: Column = {
	id: "shortLink",
	header: "Short Link",
	accessorKey: "slug",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Short Link",
		sortField: "slug",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.slug}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.shortUrl}
			/>
			{row.original.title ? (
				<TextWithTooltip
					className="max-w-full truncate text-xs text-muted-foreground"
					text={row.original.title}
				/>
			) : null}
		</div>
	),
};

const targetColumn: Column = {
	id: "target",
	header: "Target",
	accessorKey: "targetUrl",
	...sizes.custom(240, 560, 360),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-56" },
		headerLabel: "Target",
		sortField: "targetUrl",
		className: sizeClass(sizes.custom(240, 560, 360)),
	},
	cell: ({ row }) => {
		const source = [row.original.sourceType, row.original.sourceId]
			.filter(Boolean)
			.join(" / ");

		return (
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate text-sm"
					text={row.original.targetUrl}
				/>
				{source ? (
					<TextWithTooltip
						className="max-w-full truncate text-xs text-muted-foreground"
						text={source}
					/>
				) : null}
			</div>
		);
	},
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "active",
	...sizes.custom(150, 240, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Status",
		sortField: "active",
		className: sizeClass(sizes.custom(150, 240, 180)),
	},
	cell: ({ row }) => {
		const status = getStatus(row.original);

		return (
			<div className="min-w-0 space-y-1">
				<Badge variant={status.variant}>{status.label}</Badge>
				<p className="truncate text-xs text-muted-foreground">
					Expires {formatDateTime(row.original.expiresAt)}
				</p>
			</div>
		);
	},
};

const clicksColumn: Column = {
	id: "clicks",
	header: "Clicks",
	accessorKey: "clickCount",
	...sizes.custom(80, 130, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-12" },
		headerLabel: "Clicks",
		sortField: "clickCount",
		className: sizeClass(sizes.custom(80, 130, 96), "text-right"),
		contentClassName: "text-right",
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono font-medium">
			{row.original.clickCount}
		</span>
	),
};

const lastClickColumn: Column = {
	id: "lastClick",
	header: "Last Click",
	accessorKey: "lastClickedAt",
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Last Click",
		sortField: "lastClickedAt",
		className: sizeClass(sizes.custom(140, 220, 160)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{formatDateTime(row.original.lastClickedAt)}
		</span>
	),
};

function getActionsColumn(actions: ShortLinksTableActions): Column {
	return {
		id: "actions",
		header: "",
		...sizes.custom(154, 190, 170),
		enableResizing: false,
		enableHiding: false,
		meta: {
			actionCell: true,
			preventDefault: true,
			headerLabel: "Actions",
			skeleton: { type: "button", width: "w-24" },
			className: sizeClass(
				sizes.custom(154, 190, 170),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
			contentClassName: "flex justify-end",
		},
		cell: ({ row }) => <Actions item={row.original} actions={actions} />,
	};
}

function Actions({
	item,
	actions,
}: {
	item: ShortLinkRow;
	actions: ShortLinksTableActions;
}) {
	return (
		<div className="relative z-10 flex justify-end gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={(event) => {
					event.stopPropagation();
					void copyToClipboard(item.shortUrl);
				}}
				aria-label={`Copy ${item.slug}`}
			>
				<Icons.Copy className="size-4" />
			</Button>
			<Button asChild type="button" variant="ghost" size="icon">
				<a
					href={item.shortUrl}
					target="_blank"
					rel="noreferrer"
					aria-label={`Open ${item.slug}`}
					onClick={(event) => event.stopPropagation()}
				>
					<Icons.ExternalLink className="size-4" />
				</a>
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={(event) => {
					event.stopPropagation();
					actions.onEdit(item);
				}}
				aria-label={`Edit ${item.slug}`}
			>
				<Icons.Edit className="size-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				disabled={!item.active || actions.isDeactivating}
				onClick={(event) => {
					event.stopPropagation();
					actions.onDeactivate(item);
				}}
				aria-label={`Deactivate ${item.slug}`}
			>
				<Icons.LinkOff className="size-4" />
			</Button>
		</div>
	);
}

const noopActions: ShortLinksTableActions = {
	onEdit() {},
	onDeactivate() {},
};

export function getShortLinksColumns(actions: ShortLinksTableActions = noopActions) {
	return [
		selectColumn,
		shortLinkColumn,
		targetColumn,
		statusColumn,
		clicksColumn,
		lastClickColumn,
		getActionsColumn(actions),
	] satisfies Column[];
}

export const columns = getShortLinksColumns();
