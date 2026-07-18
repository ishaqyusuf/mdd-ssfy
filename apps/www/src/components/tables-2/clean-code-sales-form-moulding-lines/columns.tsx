"use client";

import { LineInput } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { useCtx } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/moulding-step/ctx";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { MoneyBadge } from "@/components/(clean-code)/money-badge";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import Money from "@/components/_v1/money";
import { AnimatedNumber } from "@/components/animated-number";
import { MouldingCalculator } from "@/components/moulding-calculator";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Menu } from "@gnd/ui/custom/menu";
import { Label } from "@gnd/ui/label";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

export type CleanCodeSalesFormMouldingLineRow = {
	id: string;
	lineUid: string;
	sn: number;
	title: string;
	basePrice?: ReactNode;
	unitPrice?: number;
};

export type CleanCodeSalesFormMouldingLinesTableMeta = {
	itemType?: string;
};

type Column = ColumnDef<CleanCodeSalesFormMouldingLineRow>;
type PricedStep = {
	title?: string;
	value?: ReactNode;
	price?: ReactNode;
};

function getMeta(
	table: unknown,
): CleanCodeSalesFormMouldingLinesTableMeta | undefined {
	return (
		table as {
			options?: { meta?: CleanCodeSalesFormMouldingLinesTableMeta };
		}
	).options?.meta;
}

export function getCleanCodeSalesFormMouldingLineRowId(
	row: CleanCodeSalesFormMouldingLineRow,
) {
	return row.id;
}

function useMouldingLineControls() {
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

const mouldingColumn: Column = {
	id: "moulding",
	header: ({ table }) => getMeta(table)?.itemType || "Moulding",
	...sizes.custom(200, 380, 260),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Moulding",
		className: sizeClass(
			sizes.custom(200, 380, 260),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "uppercase text-xs font-medium",
	},
	cell: ({ row }) => row.original.title,
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
	cell: ({ row }) => <EstimateCell row={row.original} />,
};

const addonColumn: Column = {
	id: "addon",
	header: "Addon/Qty",
	...sizes.custom(96, 136, 112),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Addon per quantity",
		className: sizeClass(sizes.custom(96, 136, 112)),
		contentClassName: "text-right",
	},
	cell: ({ row }) => <AddonCell row={row.original} />,
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

function QtyCell({ row }: { row: CleanCodeSalesFormMouldingLineRow }) {
	const { ctx, valueChanged } = useMouldingLineControls();

	return (
		<div className="flex items-center gap-1">
			<MouldingCalculator
				title={row.title}
				unitPrice={row.unitPrice}
				onCalculate={(qty) => {
					ctx.ctx.dotUpdateGroupItemFormPath(row.lineUid, "qty.total", qty);
					valueChanged();
				}}
			/>
			<LineInput
				cls={ctx.ctx}
				name="qty.total"
				lineUid={row.lineUid}
				type="number"
				valueChanged={valueChanged}
				mask
				qtyInputProps={{
					min: 0,
				}}
			/>
		</div>
	);
}

function EstimateCell({ row }: { row: CleanCodeSalesFormMouldingLineRow }) {
	const { ctx, valueChanged } = useMouldingLineControls();
	const mfd = ctx.itemForm?.groupItem?.form?.[row.lineUid];
	const pricedSteps = ctx.pricedSteps as PricedStep[] | undefined;

	return (
		<Menu noSize Icon={null} label={<Money value={mfd?.pricing?.unitPrice} />}>
			<div className="min-w-[300px] p-2">
				<div>
					<Label>Price Summary</Label>
				</div>
				<dl>
					{pricedSteps?.map((step, index) => (
						<DataLine
							size="sm"
							key={`${String(step.title)}-${index}`}
							label={step.title}
							value={
								<div className="flex items-center justify-end gap-4">
									<span>{step.value}</span>
									<MoneyBadge>{step.price}</MoneyBadge>
								</div>
							}
						/>
					))}
					<DataLine
						size="sm"
						label="Moulding"
						value={
							<div className="flex items-center justify-end gap-4">
								<span className="line-clamp-2 max-w-xs">{row.title}</span>
								<MoneyBadge>{row.basePrice}</MoneyBadge>
							</div>
						}
					/>
					<DataLine
						size="sm"
						label="Custom Price"
						value={
							<LineInput
								className="w-28"
								cls={ctx.ctx}
								name="pricing.customPrice"
								lineUid={row.lineUid}
								type="number"
								allowZero
								valueChanged={valueChanged}
							/>
						}
					/>
				</dl>
			</div>
		</Menu>
	);
}

function AddonCell({ row }: { row: CleanCodeSalesFormMouldingLineRow }) {
	const { ctx, valueChanged } = useMouldingLineControls();

	return (
		<LineInput
			cls={ctx.ctx}
			name="pricing.addon"
			lineUid={row.lineUid}
			type="number"
			valueChanged={valueChanged}
		/>
	);
}

function TotalCell({ row }: { row: CleanCodeSalesFormMouldingLineRow }) {
	const { ctx } = useMouldingLineControls();
	const mfd = ctx.itemForm?.groupItem?.form?.[row.lineUid];

	return <AnimatedNumber value={mfd?.pricing?.totalPrice || 0} />;
}

function ActionCell({ row }: { row: CleanCodeSalesFormMouldingLineRow }) {
	const { ctx } = useMouldingLineControls();

	return (
		<ConfirmBtn
			disabled={ctx.ctx.selectCount === 1}
			onClick={() => {
				ctx.ctx.removeGroupItem(row.lineUid);
			}}
			trash
			size="icon"
		/>
	);
}

export const columns: Column[] = [
	serialColumn,
	mouldingColumn,
	qtyColumn,
	estimateColumn,
	addonColumn,
	totalColumn,
	actionsColumn,
];
