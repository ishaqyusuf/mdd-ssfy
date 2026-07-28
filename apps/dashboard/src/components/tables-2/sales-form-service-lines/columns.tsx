"use client";

import {
	LineInput,
	LineSwitch,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { AnimatedNumber } from "@/components/animated-number";
import ConfirmBtn from "@/components/confirm-button";
import {
	LineItemProvider,
	useGroupedItem,
	useLineItem,
} from "@/components/forms/sales-form/context";
import { QtyInput } from "@/components/forms/sales-form/moulding-and-service/qty-input";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

export type SalesFormServiceLineRow = {
	id: string;
	itemId: string;
	index: number;
};

export type SalesFormServiceLinesTableMeta = {
	groupClass: unknown;
	valueChanged: () => void;
};

type Column = ColumnDef<SalesFormServiceLineRow>;

function getMeta(table: unknown): SalesFormServiceLinesTableMeta | undefined {
	return (
		table as {
			options?: { meta?: SalesFormServiceLinesTableMeta };
		}
	).options?.meta;
}

function ServiceLineProvider({
	children,
	row,
}: {
	children: ReactNode;
	row: SalesFormServiceLineRow;
}) {
	return (
		<LineItemProvider
			args={[
				{
					uid: row.itemId,
					index: row.index,
				},
			]}
		>
			{children}
		</LineItemProvider>
	);
}

export function getSalesFormServiceLineRowId(row: SalesFormServiceLineRow) {
	return row.id;
}

const serialColumn: Column = {
	id: "sn",
	header: "Sn.",
	...sizes.custom(44, 60, 48),
	enableResizing: true,
	enableHiding: false,
	meta: {
		skeleton: { type: "text", width: "w-8" },
		headerLabel: "Serial number",
		className: sizeClass(sizes.custom(44, 60, 48), "justify-center"),
		contentClassName: "text-center font-mono text-xs text-muted-foreground",
	},
	cell: ({ row }) => `${row.original.index + 1}.`,
};

const serviceColumn: Column = {
	id: "service",
	header: "Service",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Service",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<ServiceLineProvider row={row.original}>
				<LineInput
					cls={meta?.groupClass}
					name="meta.description"
					lineUid={row.original.itemId}
				/>
			</ServiceLineProvider>
		);
	},
};

const taxColumn: Column = {
	id: "tax",
	header: "Tax",
	...sizes.custom(56, 76, 64),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-10" },
		headerLabel: "Tax",
		className: sizeClass(sizes.custom(56, 76, 64), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<ServiceLineProvider row={row.original}>
				<LineSwitch
					cls={meta?.groupClass}
					name="meta.taxxable"
					lineUid={row.original.itemId}
					valueChanged={meta?.valueChanged}
				/>
			</ServiceLineProvider>
		);
	},
};

const productionColumn: Column = {
	id: "production",
	header: "Prod",
	...sizes.custom(64, 84, 70),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-10" },
		headerLabel: "Production",
		className: sizeClass(sizes.custom(64, 84, 70), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<ServiceLineProvider row={row.original}>
				<LineSwitch
					cls={meta?.groupClass}
					name="meta.produceable"
					lineUid={row.original.itemId}
				/>
			</ServiceLineProvider>
		);
	},
};

const qtyColumn: Column = {
	id: "qty",
	header: "Qty",
	...sizes.custom(92, 128, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Quantity",
		className: sizeClass(sizes.custom(92, 128, 104), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => (
		<ServiceLineProvider row={row.original}>
			<QtyInput />
		</ServiceLineProvider>
	),
};

const priceColumn: Column = {
	id: "price",
	header: "Price",
	...sizes.custom(92, 132, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Price",
		className: sizeClass(sizes.custom(92, 132, 104)),
		contentClassName: "text-right",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<ServiceLineProvider row={row.original}>
				<LineInput
					cls={meta?.groupClass}
					name="pricing.customPrice"
					lineUid={row.original.itemId}
					type="number"
					prefix="$"
					numberProps={{
						prefix: "$",
					}}
					valueChanged={meta?.valueChanged}
				/>
			</ServiceLineProvider>
		);
	},
};

const totalColumn: Column = {
	id: "total",
	header: "Total",
	...sizes.custom(90, 128, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Total",
		className: sizeClass(sizes.custom(90, 128, 104)),
		contentClassName: "text-right text-xs font-semibold tabular-nums",
	},
	cell: ({ row }) => (
		<ServiceLineProvider row={row.original}>
			<ServiceTotalCell />
		</ServiceLineProvider>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(52, 64, 56),
	enableResizing: true,
	enableHiding: false,
	meta: {
		skeleton: { type: "button", width: "w-8" },
		headerLabel: "Actions",
		className: sizeClass(sizes.custom(52, 64, 56), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => (
		<ServiceLineProvider row={row.original}>
			<ServiceLineAction />
		</ServiceLineProvider>
	),
};

function ServiceTotalCell() {
	const line = useLineItem();
	return <AnimatedNumber value={line?.lineForm?.pricing?.totalPrice || 0} />;
}

function ServiceLineAction() {
	const ctx = useGroupedItem();
	const { lineUid } = useLineItem();

	return (
		<ConfirmBtn
			disabled={ctx?.groupClass?.selectCount === 1}
			onClick={() => {
				ctx?.removeItem(lineUid);
			}}
			trash
			size="icon"
		/>
	);
}

export const columns: Column[] = [
	serialColumn,
	serviceColumn,
	taxColumn,
	productionColumn,
	qtyColumn,
	priceColumn,
	totalColumn,
	actionsColumn,
];
