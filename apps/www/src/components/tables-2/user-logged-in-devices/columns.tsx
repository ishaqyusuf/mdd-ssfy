"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { formatDate } from "@/lib/use-day";
import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type UserLoggedInDeviceRow = {
	id: string;
	device: string;
	location: string;
	ipAddress: string;
	lastLogin: Date;
};

export type UserLoggedInDevicesTableMeta = {
	loggingOutDeviceId?: string | null;
	onLogOutDevice: (row: UserLoggedInDeviceRow) => void | Promise<void>;
};

type Column = ColumnDef<UserLoggedInDeviceRow>;

function getMeta(table: unknown): UserLoggedInDevicesTableMeta | undefined {
	return (
		table as {
			options?: { meta?: UserLoggedInDevicesTableMeta };
		}
	).options?.meta;
}

export function getUserLoggedInDeviceRowId(row: UserLoggedInDeviceRow) {
	return row.id;
}

const deviceColumn: Column = {
	id: "device",
	header: "Device",
	accessorKey: "device",
	...sizes.custom(180, 320, 220),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Device",
		className: sizeClass(
			sizes.custom(180, 320, 220),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-2">
			<Icons.laptop className="size-4 shrink-0 text-muted-foreground" />
			<TextWithTooltip
				className="min-w-0 truncate font-medium"
				text={row.original.device}
			/>
		</div>
	),
};

const locationColumn: Column = {
	id: "location",
	header: "Location",
	accessorKey: "location",
	...sizes.custom(140, 240, 170),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Location",
		className: sizeClass(sizes.custom(140, 240, 170)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={row.original.location || "-"}
		/>
	),
};

const ipAddressColumn: Column = {
	id: "ipAddress",
	header: "IP Address",
	accessorKey: "ipAddress",
	...sizes.custom(120, 190, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "IP Address",
		className: sizeClass(sizes.custom(120, 190, 140)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-mono text-xs"
			text={row.original.ipAddress || "-"}
		/>
	),
};

const lastLoginColumn: Column = {
	id: "lastLogin",
	header: "Last Login",
	accessorKey: "lastLogin",
	...sizes.custom(132, 210, 154),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-28" },
		headerLabel: "Last Login",
		className: sizeClass(sizes.custom(132, 210, 154)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-sm"
			text={formatDate(row.original.lastLogin)}
		/>
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
		const isLoggingOut = meta?.loggingOutDeviceId === row.original.id;

		if (isLoggingOut) {
			return (
				<Button
					size="icon-sm"
					variant="ghost"
					disabled
					aria-label="Logging out"
				>
					<Icons.Loader2 className="size-4 animate-spin" />
				</Button>
			);
		}

		return (
			<Menu>
				<Menu.Item
					icon="logout"
					onClick={() => {
						void meta?.onLogOutDevice(row.original);
					}}
				>
					Log out
				</Menu.Item>
			</Menu>
		);
	},
};

export const columns: Column[] = [
	deviceColumn,
	locationColumn,
	ipAddressColumn,
	lastLoginColumn,
	actionsColumn,
];
