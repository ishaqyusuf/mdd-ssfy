"use client";

import {
	LineInput,
	LineSwitch,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { useCtx } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/service-step/ctx";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { AnimatedNumber } from "@/components/animated-number";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { ColumnDef } from "@tanstack/react-table";

export type CleanCodeSalesFormServiceLineRow = {
	id: string;
	lineUid: string;
	sn: number;
};

type Column = ColumnDef<CleanCodeSalesFormServiceLineRow>;

export function getCleanCodeSalesFormServiceLineRowId(
	row: CleanCodeSalesFormServiceLineRow,
) {
	return row.id;
}

function useServiceLineControls() {
	const ctx = useCtx();

	return {
		ctx,
		valueChanged: () => {
			ctx.ctx.updateGroupedCost();
			ctx.ctx.calculateTotalPrice();
		},
	};
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
	cell: ({ row }) => `${row.original.sn}.`,
};

const descriptionColumn: Column = {
	id: "description",
	header: "Description",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Description",
		className: sizeClass(
			sizes.custom(220, 420, 280),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <DescriptionCell row={row.original} />,
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
	cell: ({ row }) => <TaxCell row={row.original} />,
};

const productionColumn: Column = {
	id: "production",
	header: "Prod",
	...sizes.custom(64, 88, 72),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-10" },
		headerLabel: "Production",
		className: sizeClass(sizes.custom(64, 88, 72), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => <ProductionCell row={row.original} />,
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
	cell: ({ row }) => <QtyCell row={row.original} />,
};

const priceColumn: Column = {
	id: "price",
	header: "Price",
	...sizes.custom(92, 132, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Unit Price",
		className: sizeClass(sizes.custom(92, 132, 104)),
		contentClassName: "text-right",
	},
	cell: ({ row }) => <PriceCell row={row.original} />,
};

const totalColumn: Column = {
	id: "total",
	header: "Total",
	...sizes.custom(90, 128, 104),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Line Total",
		className: sizeClass(sizes.custom(90, 128, 104)),
		contentClassName: "text-right text-xs font-semibold tabular-nums",
	},
	cell: ({ row }) => <TotalCell row={row.original} />,
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
	cell: ({ row }) => <ActionCell row={row.original} />,
};

function DescriptionCell({
	row,
}: {
	row: CleanCodeSalesFormServiceLineRow;
}) {
	const { ctx } = useServiceLineControls();

	return (
		<LineInput cls={ctx.ctx} name="meta.description" lineUid={row.lineUid} />
	);
}

function TaxCell({ row }: { row: CleanCodeSalesFormServiceLineRow }) {
	const { ctx, valueChanged } = useServiceLineControls();

	return (
		<LineSwitch
			cls={ctx.ctx}
			name="meta.taxxable"
			lineUid={row.lineUid}
			valueChanged={valueChanged}
		/>
	);
}

function ProductionCell({
	row,
}: {
	row: CleanCodeSalesFormServiceLineRow;
}) {
	const { ctx } = useServiceLineControls();

	return (
		<LineSwitch cls={ctx.ctx} name="meta.produceable" lineUid={row.lineUid} />
	);
}

function QtyCell({ row }: { row: CleanCodeSalesFormServiceLineRow }) {
	const { ctx, valueChanged } = useServiceLineControls();

	return (
		<LineInput
			cls={ctx.ctx}
			name="qty.total"
			lineUid={row.lineUid}
			type="number"
			valueChanged={valueChanged}
			mask
			qtyInputProps={{
				min: 1,
			}}
		/>
	);
}

function PriceCell({ row }: { row: CleanCodeSalesFormServiceLineRow }) {
	const { ctx, valueChanged } = useServiceLineControls();

	return (
		<LineInput
			cls={ctx.ctx}
			name="pricing.customPrice"
			lineUid={row.lineUid}
			type="number"
			valueChanged={valueChanged}
		/>
	);
}

function TotalCell({ row }: { row: CleanCodeSalesFormServiceLineRow }) {
	const { ctx } = useServiceLineControls();
	const mfd = ctx.itemForm?.groupItem?.form?.[row.lineUid];

	return <AnimatedNumber value={mfd?.pricing?.totalPrice || 0} />;
}

function ActionCell({ row }: { row: CleanCodeSalesFormServiceLineRow }) {
	const { ctx } = useServiceLineControls();

	return (
		<ConfirmBtn
			onClick={() => {
				ctx.ctx.removeGroupItem(row.lineUid);
			}}
			trash
			disabled={ctx.ctx.selectCount === 1}
			size="icon"
		/>
	);
}

export const columns: Column[] = [
	serialColumn,
	descriptionColumn,
	taxColumn,
	productionColumn,
	qtyColumn,
	priceColumn,
	totalColumn,
	actionsColumn,
];
