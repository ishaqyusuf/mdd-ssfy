"use client";

import { LineInput } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { MouldingClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/moulding-class";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { MoneyBadge } from "@/components/(clean-code)/money-badge";
import Money from "@/components/_v1/money";
import { AnimatedNumber } from "@/components/animated-number";
import ConfirmBtn from "@/components/confirm-button";
import {
	LineItemProvider,
	useGroupedItem,
	useLineItem,
} from "@/components/forms/sales-form/context";
import { QtyInput } from "@/components/forms/sales-form/moulding-and-service/qty-input";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Menu } from "@gnd/ui/custom/menu";
import { Label } from "@gnd/ui/label";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";

export type SalesFormMouldingLineRow = {
	id: string;
	itemId: string;
	index: number;
};

type Column = ColumnDef<SalesFormMouldingLineRow>;
type MouldingOption = {
	productId?: unknown;
	title?: ReactNode;
	salesPrice?: ReactNode;
};
type PricedStep = {
	title?: string;
	value?: ReactNode;
	price?: ReactNode;
};

function MouldingLineProvider({
	children,
	row,
}: {
	children: ReactNode;
	row: SalesFormMouldingLineRow;
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

export function getSalesFormMouldingLineRowId(row: SalesFormMouldingLineRow) {
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

const mouldingColumn: Column = {
	id: "moulding",
	header: "Moulding",
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
	cell: ({ row }) => (
		<MouldingLineProvider row={row.original}>
			<MouldingDescriptionCell />
		</MouldingLineProvider>
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
		<MouldingLineProvider row={row.original}>
			<QtyInput />
		</MouldingLineProvider>
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
		<MouldingLineProvider row={row.original}>
			<MouldingEstimateCell />
		</MouldingLineProvider>
	),
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
	cell: ({ row }) => (
		<MouldingLineProvider row={row.original}>
			<MouldingAddonCell />
		</MouldingLineProvider>
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
		<MouldingLineProvider row={row.original}>
			<MouldingTotalCell />
		</MouldingLineProvider>
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
		<MouldingLineProvider row={row.original}>
			<MouldingLineAction />
		</MouldingLineProvider>
	),
};

function MouldingDescriptionCell() {
	const line = useLineItem();
	return <>{line?.lineForm?.meta?.description}</>;
}

function MouldingTotalCell() {
	const line = useLineItem();
	return <AnimatedNumber value={line?.lineForm?.pricing?.totalPrice || 0} />;
}

function MouldingAddonCell() {
	const { mouldingItemStepUid, valueChanged } = useGroupedItem();
	const { lineUid } = useLineItem();
	const moulding = new MouldingClass(mouldingItemStepUid);

	return (
		<LineInput
			cls={moulding}
			name="pricing.addon"
			lineUid={lineUid}
			type="number"
			valueChanged={valueChanged}
		/>
	);
}

function MouldingLineAction() {
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

function MouldingEstimateCell() {
	const lineCtx = useLineItem();
	const ctx = useGroupedItem();
	const { lineForm, lineUid } = lineCtx;
	const moulding = new MouldingClass(ctx.mouldingItemStepUid);
	const lineItem = moulding.getMouldingLineItemForm() as {
		pricedSteps?: PricedStep[];
	};
	const mouldingProductId = lineForm?.mouldingProductId;
	const selectedMoulding = (
		ctx?.mouldings as MouldingOption[] | undefined
	)?.find((item) => String(item.productId) === String(mouldingProductId));

	return (
		<Menu
			noSize
			Icon={null}
			label={<Money value={lineForm?.pricing?.unitPrice} />}
		>
			<div className="min-w-[300px] p-2">
				<div>
					<Label>Price Summary</Label>
				</div>
				<dl>
					{lineItem?.pricedSteps?.map((step, index) => (
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
								<span className="line-clamp-2 max-w-xs">
									{selectedMoulding?.title}
								</span>
								<MoneyBadge>{selectedMoulding?.salesPrice}</MoneyBadge>
							</div>
						}
					/>
					<DataLine
						size="sm"
						label="Custom Price"
						value={
							<LineInput
								className="w-28"
								cls={moulding}
								name="pricing.customPrice"
								lineUid={lineUid}
								type="number"
								allowZero
								valueChanged={ctx.valueChanged}
							/>
						}
					/>
				</dl>
			</div>
		</Menu>
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
