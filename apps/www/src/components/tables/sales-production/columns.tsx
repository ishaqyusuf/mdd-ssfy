"use client";

import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Menu } from "@gnd/ui/custom/menu";
import { Progress } from "@gnd/ui/custom/progress";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/types/type";
import type { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export type Item = RouterOutputs["sales"]["productions"]["data"][number];
interface ItemProps {
	item: Item;
}
type Column = ColumnDef<Item>;
const dueDateColumn: Column = {
	header: "Due Date",
	accessorKey: "salesDate",
	meta: {},
	cell: ({ row: { original: item } }) => <DueDateCell item={item} />,
};
const assignedToColumn: Column = {
	header: "Assigned To",
	accessorKey: "assignedTo",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<TCell.Primary className="flex gap-4 font-mono$">
			{item.assignedTo}
		</TCell.Primary>
	),
};
const customerColumn: Column = {
	header: "Customer",
	accessorKey: "Customer",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<TCell.Primary>{item.customer}</TCell.Primary>
	),
};
const salesColumn: Column = {
	header: "Sales",
	accessorKey: "Sales",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<>
			<TCell.Primary>{item.customer}</TCell.Primary>
			<TCell.Secondary>{item.orderId}</TCell.Secondary>
		</>
	),
};
const salesRepColumn: Column = {
	header: "Sales Rep",
	accessorKey: "Sales Rep",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<TCell.Primary className="whitespace-nowrap uppercase">
			<TextWithTooltip className="max-w-[85px]" text={item.salesRep} />
		</TCell.Primary>
	),
};
const salesRepColumn2: Column = {
	header: "Sales Rep",
	accessorKey: "Sales Rep",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<TCell.Primary className="whitespace-nowrap uppercase">
			<TextWithTooltip
				className="max-w-[80px] sm:max-w-[150px]"
				text={item.salesRep}
			/>
		</TCell.Primary>
	),
};
const orderColumn: Column = {
	header: "Order #",
	accessorKey: "orderId",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<TCell.Primary className="font-mono$">{item.orderId}</TCell.Primary>
	),
};
const statusColumn: Column = {
	header: "Status",
	accessorKey: "statusColumn",
	meta: {},
	cell: ({ row: { original: item } }) => {
		const production = item.status?.production;
		return (
			<Progress>
				<Progress.Status badge>
					{production?.scoreStatus || production?.status}
				</Progress.Status>
			</Progress>
		);
	},
};
const progressColumn: Column = {
	header: "Progress",
	accessorKey: "statusColumn",
	meta: {},
	cell: ({ row: { original: item } }) => {
		const production = item.status?.production;
		return (
			<div className="">
				<Progress>
					<Progress.ProgressBar
						className="w-16"
						showPercent
						score={production.score}
						total={production.total}
					/>
				</Progress>
			</div>
		);
	},
};
export const columns: Column[] = [
	dueDateColumn,
	assignedToColumn,
	customerColumn,
	orderColumn,
	salesRepColumn,
	statusColumn,
	progressColumn,
];

export const workerColumns: ColumnDef<Item>[] = [
	dueDateColumn,
	// assignedToColumn,
	salesColumn,
	// orderColumn,
	salesRepColumn2,
	statusColumn,
	progressColumn,
];
function DueDateCell({ item }: ItemProps) {
	return (
		<>
			<TCell.Primary className="">
				{item.alert.date ? (
					<TCell.Secondary>{item.alert.dateString}</TCell.Secondary>
				) : (
					<>N/A</>
				)}
			</TCell.Primary>
			<TCell.Secondary className="flex gap-4 font-semibold">
				{item.completed ? (
					<></>
				) : (
					<TCell.Status noDot status={item.alert.text} />
				)}
			</TCell.Secondary>
		</>
	);
}
function Actions({ item }: { item: Item }) {
	const produceable = !!item.stats?.prodCompleted?.total;
	const batchSales = useBatchSales();
	const isMobile = useIsMobile();
	return (
		<div className="relative z-10">
			<Menu
				triggerSize={isMobile ? "default" : "xs"}
				Trigger={
					<Button className={cn(isMobile || "size-4 p-0")} variant="ghost">
						<Icons.MoreHoriz className="" />
					</Button>
				}
			>
				<Menu.Item
					SubMenu={
						<>
							<Menu.Item
								disabled={!produceable}
								onClick={(e) => {
									e.preventDefault();
									batchSales.markAsProductionCompleted(item.id);
								}}
							>
								Production Complete
							</Menu.Item>
							<Menu.Item
								onClick={(e) => {
									e.preventDefault();
									batchSales.markAsFulfilled(item.id);
								}}
							>
								Fulfillment Complete
							</Menu.Item>
						</>
					}
				>
					Mark as
				</Menu.Item>
			</Menu>
		</div>
	);
}
export const mobileColumn: ColumnDef<Item>[] = [
	{
		header: "",
		accessorKey: "row",
		meta: {
			className: "flex-1 p-0",
		},
		cell: ({ row: { original: item } }) => {
			return <ItemCard item={item} />;
		},
	},
];
function ItemCard({ item }: ItemProps) {
	return (
		<div className="flex flex-col space-y-2 p-3 border-b">
			<div className="flex justify-between items-start">
				<div className="flex flex-col">
					<TCell.Primary className="font-mono$">{item.orderId}</TCell.Primary>
					<TCell.Secondary>{item.customer}</TCell.Secondary>
				</div>
				<Progress>
					<Progress.Status badge>
						{item.status?.production?.scoreStatus ||
							item.status?.production?.status}
					</Progress.Status>
				</Progress>
			</div>
			<div className="flex justify-between items-center text-sm">
				<TCell.Secondary className="uppercase">
					<TextWithTooltip className="max-w-[150px]" text={item.salesRep} />
				</TCell.Secondary>
				{item.alert?.date && (
					<TCell.Secondary className="font-mono$">
						{item.alert.dateString}
					</TCell.Secondary>
				)}
			</div>
			{item.assignedTo && (
				<TCell.Secondary className="text-xs">
					Assigned: {item.assignedTo}
				</TCell.Secondary>
			)}
		</div>
	);
}
