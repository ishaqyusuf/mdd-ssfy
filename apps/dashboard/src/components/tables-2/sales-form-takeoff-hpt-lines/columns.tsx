"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { useHptLine } from "@/components/forms/sales-form/context";
import { PriceEstimateCell } from "@/components/forms/sales-form/hpt/price-estimate-cell";
import { WageInput } from "@/components/forms/sales-form/hpt/wage-input";
import { DoorQtyInput } from "@/components/forms/sales-form/take-off/door-qty-input";
import { DoorSizeSelect } from "@/components/forms/sales-form/take-off/door-size-select";
import { DoorSwingSelect } from "@/components/forms/sales-form/take-off/door-swing-select";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesFormTakeoffHptLineRow = {
	id: string;
};

type Column = ColumnDef<SalesFormTakeoffHptLineRow>;

export function getSalesFormTakeoffHptLineRowId(
	row: SalesFormTakeoffHptLineRow,
) {
	return row.id;
}

const sizeColumn: Column = {
	id: "size",
	header: "Size",
	...sizes.custom(128, 220, 150),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Size",
		className: sizeClass(
			sizes.custom(128, 220, 150),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: () => <DoorSizeSelect />,
};

const swingColumn: Column = {
	id: "swing",
	header: "Swing",
	...sizes.custom(104, 150, 116),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Swing",
		className: sizeClass(sizes.custom(104, 150, 116)),
		contentClassName: "flex justify-center",
	},
	cell: () => <DoorSwingSelect />,
};

const qtyColumn: Column = {
	id: "qty",
	header: "Qty",
	...sizes.custom(84, 118, 94),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Quantity",
		className: sizeClass(sizes.custom(84, 118, 94), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: () => <DoorQtyInput name="total" suffix="QTY" />,
};

const leftHandColumn: Column = {
	id: "lh",
	header: "LH",
	...sizes.custom(84, 118, 94),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Left hand quantity",
		className: sizeClass(sizes.custom(84, 118, 94), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: () => <DoorQtyInput name="lh" suffix="LH" />,
};

const rightHandColumn: Column = {
	id: "rh",
	header: "RH",
	...sizes.custom(84, 118, 94),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Right hand quantity",
		className: sizeClass(sizes.custom(84, 118, 94), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: () => <DoorQtyInput name="rh" suffix="RH" />,
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
	cell: () => <PriceEstimateCell />,
};

const laborColumn: Column = {
	id: "labor",
	header: "Labor/Qty",
	...sizes.custom(88, 128, 100),
	enableResizing: true,
	meta: {
		skeleton: { type: "button", width: "w-16" },
		headerLabel: "Labor per quantity",
		className: sizeClass(sizes.custom(88, 128, 100), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: () => <WageInput />,
};

const totalColumn: Column = {
	id: "total",
	header: "Line Total",
	...sizes.custom(96, 140, 112),
	enableResizing: true,
	enableHiding: false,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Line total",
		className: sizeClass(sizes.custom(96, 140, 112)),
		contentClassName: "text-right text-xs font-semibold tabular-nums",
	},
	cell: () => <TotalCell />,
};

function TotalCell() {
	const { sizeForm } = useHptLine();

	return <AnimatedNumber value={sizeForm?.pricing?.totalPrice || 0} />;
}

export const columns: Column[] = [
	sizeColumn,
	swingColumn,
	qtyColumn,
	leftHandColumn,
	rightHandColumn,
	estimateColumn,
	laborColumn,
	totalColumn,
];
