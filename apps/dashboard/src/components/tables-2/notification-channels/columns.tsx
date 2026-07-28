"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type NotificationChannelRow =
	RouterOutputs["notes"]["getNotificationChannels"]["data"][number];

export type NotificationChannelsTableMeta = {
	selectedId?: number | null;
	onSelectChannel: (row: NotificationChannelRow) => void | Promise<void>;
};

type Column = ColumnDef<NotificationChannelRow>;

function getMeta(table: unknown): NotificationChannelsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: NotificationChannelsTableMeta };
		}
	).options?.meta;
}

export function getNotificationChannelRowId(row: NotificationChannelRow) {
	return String(row.id);
}

function DeliveryMethod({
	active,
	icon,
	label,
}: {
	active: boolean;
	icon: "Mail" | "Smartphone" | "WhatsApp";
	label: string;
}) {
	const Icon = Icons[icon];

	return (
		<span
			className={cn(
				"flex size-7 items-center justify-center rounded-md border",
				active
					? "border-primary/20 bg-primary/10 text-primary"
					: "border-border bg-muted/40 text-muted-foreground/60",
			)}
			title={label}
		>
			<Icon className="size-3.5" />
		</span>
	);
}

const channelColumn: Column = {
	id: "channel",
	header: "Channel",
	accessorFn: (row) => row.title || row.name,
	...sizes.custom(240, 420, 300),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-52" },
		headerLabel: "Channel",
		className: sizeClass(
			sizes.custom(240, 420, 300),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="min-w-0 space-y-0.5">
			<TextWithTooltip
				className="max-w-full truncate font-medium"
				text={row.original.title || row.original.name}
			/>
			<TextWithTooltip
				className="max-w-full truncate text-xs text-muted-foreground"
				text={row.original.description || row.original.name}
			/>
		</div>
	),
};

const priorityColumn: Column = {
	id: "priority",
	header: "Priority",
	accessorKey: "priority",
	...sizes.custom(92, 132, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-16" },
		headerLabel: "Priority",
		className: sizeClass(sizes.custom(92, 132, 104)),
	},
	cell: ({ row }) => (
		<Badge variant="secondary" className="rounded-full text-[10px]">
			{row.original.priority || "Low"}
		</Badge>
	),
};

const deliveryColumn: Column = {
	id: "delivery",
	header: "Delivery",
	accessorFn: (row) =>
		[row.emailSupport, row.inAppSupport, row.whatsappSupport].filter(Boolean)
			.length,
	...sizes.custom(118, 164, 132),
	enableResizing: true,
	meta: {
		skeleton: { type: "icon-text", width: "w-24" },
		headerLabel: "Delivery",
		className: sizeClass(sizes.custom(118, 164, 132)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-1.5">
			<DeliveryMethod
				active={!!row.original.emailSupport}
				icon="Mail"
				label="Email"
			/>
			<DeliveryMethod
				active={!!row.original.inAppSupport}
				icon="Smartphone"
				label="In-App"
			/>
			<DeliveryMethod
				active={!!row.original.whatsappSupport}
				icon="WhatsApp"
				label="WhatsApp"
			/>
		</div>
	),
};

const audienceColumn: Column = {
	id: "audience",
	header: "Audience",
	accessorFn: (row) => row.roles.length + row.subscriberIds.length,
	...sizes.custom(126, 170, 142),
	enableResizing: true,
	meta: {
		skeleton: { type: "icon-text", width: "w-24" },
		headerLabel: "Audience",
		className: sizeClass(sizes.custom(126, 170, 142)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-3 text-sm">
			<span className="flex items-center gap-1">
				<Icons.Shield className="size-3.5 text-muted-foreground" />
				{row.original.roles.length}
			</span>
			<span className="flex items-center gap-1">
				<Icons.Users className="size-3.5 text-muted-foreground" />
				{row.original.subscriberIds.length}
			</span>
		</div>
	),
};

const categoryColumn: Column = {
	id: "category",
	header: "Category",
	accessorKey: "category",
	...sizes.custom(120, 180, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Category",
		className: sizeClass(sizes.custom(120, 180, 140)),
	},
	cell: ({ row }) => (
		<Badge variant="outline" className="max-w-full rounded-full">
			<TextWithTooltip
				className="max-w-full truncate"
				text={row.original.category || "General"}
			/>
		</Badge>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorFn: (row) => (row.published ? "Published" : "Draft"),
	...sizes.custom(118, 164, 132),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(118, 164, 132)),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 flex-col gap-0.5">
			<span
				className={cn(
					"text-sm font-medium",
					row.original.published ? "text-emerald-700" : "text-muted-foreground",
				)}
			>
				{row.original.published ? "Published" : "Draft"}
			</span>
			<span className="truncate text-xs text-muted-foreground">
				{row.original.deletable ? "Custom" : "Built-in"}
			</span>
		</div>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(56, 80, 64),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(56, 80, 64),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);
		const selected = meta?.selectedId === row.original.id;

		return (
			<Button
				type="button"
				size="icon-sm"
				variant={selected ? "default" : "ghost"}
				aria-label="Open notification channel"
				onClick={() => {
					void meta?.onSelectChannel(row.original);
				}}
			>
				<Icons.Eye className="size-4" />
			</Button>
		);
	},
};

export const columns: Column[] = [
	channelColumn,
	priorityColumn,
	deliveryColumn,
	audienceColumn,
	categoryColumn,
	statusColumn,
	actionsColumn,
];
