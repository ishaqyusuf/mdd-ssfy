"use client";

import {
	LineInput,
	LineSwitch,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { AnimatedNumber } from "@/components/animated-number";
import {
	HptLineContextProvider,
	useHpt,
	useHptLine,
} from "@/components/forms/sales-form/context";
import { PriceEstimateCell } from "@/components/forms/sales-form/hpt/price-estimate-cell";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

export type SalesFormHptLineRow = {
	id: string;
	lineUid: string;
	sn: number;
};

type Column = ColumnDef<SalesFormHptLineRow>;

function HptLineProvider({
	children,
	row,
}: {
	children: ReactNode;
	row: SalesFormHptLineRow;
}) {
	return (
		<HptLineContextProvider
			args={[
				{
					lineUid: row.lineUid,
					sn: row.sn,
				},
			]}
		>
			{children}
		</HptLineContextProvider>
	);
}

export function getSalesFormHptLineRowId(row: SalesFormHptLineRow) {
	return row.id;
}

const serialColumn: Column = {
	id: "sn",
	header: "#",
	...sizes.custom(42, 56, 46),
	enableResizing: true,
	enableHiding: false,
	meta: {
		skeleton: { type: "text", width: "w-8" },
		headerLabel: "Serial number",
		className: sizeClass(sizes.custom(42, 56, 46), "justify-center"),
		contentClassName: "text-center font-mono text-xs text-muted-foreground",
	},
	cell: ({ row }) => row.original.sn,
};

const sizeColumn: Column = {
	id: "size",
	header: "Size",
	...sizes.custom(112, 190, 132),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Size",
		className: sizeClass(
			sizes.custom(112, 190, 132),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "font-mono text-sm font-semibold text-foreground",
	},
	cell: ({ row }) => (
		<HptLineProvider row={row.original}>
			<SizeCell />
		</HptLineProvider>
	),
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
	cell: ({ row }) => (
		<HptLineProvider row={row.original}>
			<ProductionCell />
		</HptLineProvider>
	),
};

const swingColumn: Column = {
	id: "swing",
	header: "Swing",
	...sizes.custom(96, 146, 112),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Swing",
		className: sizeClass(sizes.custom(96, 146, 112)),
	},
	cell: ({ row }) => (
		<HptLineProvider row={row.original}>
			<SwingCell />
		</HptLineProvider>
	),
};

const qtyColumn: Column = {
	id: "qty",
	header: "Qty",
	...sizes.custom(84, 120, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Quantity",
		className: sizeClass(sizes.custom(84, 120, 96), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => (
		<HptLineProvider row={row.original}>
			<QuantityCell name="qty.total" min={0} />
		</HptLineProvider>
	),
};

const leftHandColumn: Column = {
	id: "lh",
	header: "Lh",
	...sizes.custom(84, 120, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Left hand quantity",
		className: sizeClass(sizes.custom(84, 120, 96), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => (
		<HptLineProvider row={row.original}>
			<QuantityCell name="qty.lh" min={0} />
		</HptLineProvider>
	),
};

const rightHandColumn: Column = {
	id: "rh",
	header: "Rh",
	...sizes.custom(84, 120, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Right hand quantity",
		className: sizeClass(sizes.custom(84, 120, 96), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => (
		<HptLineProvider row={row.original}>
			<QuantityCell name="qty.rh" min={1} />
		</HptLineProvider>
	),
};

const estimateColumn: Column = {
	id: "estimate",
	header: "Estimate",
	...sizes.custom(92, 132, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Estimate",
		className: sizeClass(sizes.custom(92, 132, 104)),
		contentClassName: "text-right text-xs tabular-nums",
	},
	cell: ({ row }) => (
		<HptLineProvider row={row.original}>
			<PriceEstimateCell />
		</HptLineProvider>
	),
};

const totalColumn: Column = {
	id: "total",
	header: "Line Total",
	...sizes.custom(96, 136, 112),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Line total",
		className: sizeClass(sizes.custom(96, 136, 112)),
		contentClassName: "text-right text-xs font-semibold tabular-nums",
	},
	cell: ({ row }) => (
		<HptLineProvider row={row.original}>
			<TotalCell />
		</HptLineProvider>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(76, 108, 88),
	enableResizing: true,
	enableHiding: false,
	meta: {
		skeleton: { type: "button", width: "w-16" },
		headerLabel: "Actions",
		className: sizeClass(sizes.custom(76, 108, 88), "justify-end"),
		contentClassName: "flex justify-end",
	},
	cell: ({ row }) => (
		<HptLineProvider row={row.original}>
			<ActionsCell />
		</HptLineProvider>
	),
};

function SizeCell() {
	const { size } = useHptLine();
	return <>{size?.size}</>;
}

function ProductionCell() {
	const ctx = useHpt();
	const { lineUid } = useHptLine();

	return (
		<LineSwitch
			cls={ctx.hpt}
			name="prodOverride.production"
			lineUid={lineUid}
		/>
	);
}

function SwingCell() {
	const ctx = useHpt();
	const { lineUid } = useHptLine();

	return <LineInput cls={ctx.hpt} name="swing" lineUid={lineUid} />;
}

function QuantityCell({
	name,
	min,
}: {
	name: "qty.total" | "qty.lh" | "qty.rh";
	min: number;
}) {
	const ctx = useHpt();
	const { lineUid, valueChanged } = useHptLine();

	return (
		<LineInput
			cls={ctx.hpt}
			name={name}
			lineUid={lineUid}
			className="w-16 text-center"
			type="number"
			valueChanged={valueChanged}
			mask
			qtyInputProps={{ min }}
		/>
	);
}

function TotalCell() {
	const { zDoor } = useHptLine();
	return <AnimatedNumber value={zDoor?.pricing?.totalPrice || 0} />;
}

function ActionsCell() {
	const ctx = useHpt();
	const { size } = useHptLine();
	const { showNote, setShowNote } = ctx;

	return (
		<div className="flex items-center justify-end gap-2">
			<Button
				variant={showNote ? "default" : "outline"}
				size="xs"
				className="rounded-full"
				onClick={() => {
					setShowNote(!showNote);
				}}
			>
				<Icons.Notebook className="size-4" />
			</Button>
			<ConfirmBtn
				disabled={ctx.hpt.selectCount === 1}
				onClick={() => {
					ctx.hpt.removeGroupItem(size.path);
				}}
				trash
				size="icon"
			/>
		</div>
	);
}

export const columns: Column[] = [
	serialColumn,
	sizeColumn,
	productionColumn,
	swingColumn,
	qtyColumn,
	leftHandColumn,
	rightHandColumn,
	estimateColumn,
	totalColumn,
	actionsColumn,
];
