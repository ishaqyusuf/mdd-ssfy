"use client";

import Money from "@/components/_v1/money";
import { useContractorPayoutParams } from "@/hooks/use-contractor-payout-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Badge } from "@gnd/ui/badge";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { formatDate } from "@gnd/utils/dayjs";
import type { ColumnDef } from "@tanstack/react-table";
import { ReceiptText } from "lucide-react";

export type Item = RouterOutputs["jobs"]["contractorPayouts"]["data"][number];
type Column = ColumnDef<Item>;

export const columns: Column[] = [
	{
		header: "Payout",
		accessorKey: "date",
		meta: {
			sortable: true,
		},
		cell: ({ row: { original: item } }) => (
			<>
				<TCell.Primary>#{item.id}</TCell.Primary>
				<TCell.Secondary>{formatDate(item.createdAt)}</TCell.Secondary>
			</>
		),
	},
	{
		header: "Paid To",
		accessorKey: "paidTo",
		meta: {
			sortable: true,
		},
		cell: ({ row: { original: item } }) => (
			<TCell.Primary>{item.paidTo}</TCell.Primary>
		),
	},
	{
		header: "Authorized By",
		accessorKey: "authorizedBy",
		meta: {
			sortable: true,
		},
		cell: ({ row: { original: item } }) => (
			<TCell.Primary>{item.authorizedBy}</TCell.Primary>
		),
	},
	{
		header: "Jobs",
		accessorKey: "jobCount",
		cell: ({ row: { original: item } }) => (
			<Badge variant="secondary">{item.jobCount} jobs</Badge>
		),
	},
	{
		header: "Amount",
		accessorKey: "amount",
		meta: {
			sortable: true,
		},
		cell: ({ row: { original: item } }) => (
			<div className="text-right">
				<Money className="font-semibold" value={item.amount} />
			</div>
		),
	},
	{
		header: "",
		accessorKey: "actions",
		meta: {
			actionCell: true,
			preventDefault: true,
			className: "w-[120px]",
		},
		cell: ({ row: { original: item } }) => <Actions item={item} />,
	},
];

function Actions({ item }: { item: Item }) {
	const { setParams } = useContractorPayoutParams();

	return (
		<div className="relative z-10 flex justify-end">
			<Button
				size="sm"
				variant="outline"
				onClick={() => {
					setParams({
						openContractorPayoutId: item.id,
					});
				}}
			>
				View
			</Button>
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
		cell: ({ row: { original: item } }) => <ItemCard item={item} />,
	},
];

function ItemCard({ item }: { item: Item }) {
	const { setParams } = useContractorPayoutParams();

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-start gap-3">
				<div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
					<ReceiptText className="size-4" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-base font-semibold text-slate-900">#{item.id}</p>
					<p className="text-sm text-slate-600">{formatDate(item.createdAt)}</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={() => {
						setParams({
							openContractorPayoutId: item.id,
						});
					}}
				>
					View
				</Button>
			</div>

			<div className="mt-4 grid grid-cols-2 gap-2">
				<InfoCard label="Paid To" value={item.paidTo} />
				<InfoCard label="Authorized By" value={item.authorizedBy} />
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2">
				<div className="rounded-2xl border border-slate-200 px-3 py-3">
					<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						Jobs
					</p>
					<p className="mt-1 text-sm font-semibold text-slate-900">
						{item.jobCount}
					</p>
				</div>
				<div className="rounded-2xl bg-emerald-50 px-3 py-3">
					<p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/80">
						Payout
					</p>
					<Money className="mt-1 text-lg font-semibold text-emerald-700" value={item.amount} />
				</div>
			</div>
		</div>
	);
}

function InfoCard({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-2xl border border-slate-200 px-3 py-3">
			<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
		</div>
	);
}
