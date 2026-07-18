"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { env } from "@/env.mjs";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { FormatAmount } from "@gnd/ui/custom/format-amount";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import type { ColumnDef } from "@tanstack/react-table";

export type SalesStatistic =
	RouterOutputs["sales"]["getProductReport"]["data"][number];

type Column = ColumnDef<SalesStatistic>;

export function resolveProductImageSrc(src?: string | null) {
	if (!src) return null;
	if (src.startsWith("http") || src.startsWith("/")) return src;

	return `${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/dyke/${src}`;
}

export function getSalesStatisticRowId(item: SalesStatistic, index?: number) {
	return (
		item.id?.toString() ??
		item.productCode ??
		`${item.name ?? "sales-statistic"}-${index ?? "unknown"}`
	);
}

function ProductCell({ item }: { item: SalesStatistic }) {
	const title = item.name || "-";
	const imageSrc = resolveProductImageSrc(item.img);

	return (
		<div className="flex min-w-0 items-center gap-2">
			<div className="size-8 shrink-0 overflow-hidden rounded border bg-muted">
				{imageSrc ? (
					<img
						src={imageSrc}
						alt={title}
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-muted-foreground">
						{title.slice(0, 1)}
					</div>
				)}
			</div>
			<div className="min-w-0 space-y-0.5">
				<TextWithTooltip
					className="max-w-full truncate font-semibold uppercase"
					text={title}
				/>
				{item.productCode ? (
					<div className="truncate font-mono text-[11px] text-muted-foreground">
						{item.productCode}
					</div>
				) : null}
			</div>
		</div>
	);
}

function MoneyCell({ value }: { value?: number | null }) {
	return (
		<span className="block text-right font-mono font-medium">
			<FormatAmount amount={value ?? 0} maximumFractionDigits={0} />
		</span>
	);
}

function MarginCell({ item }: { item: SalesStatistic }) {
	const salesPrice = Number(item.salesPrice || 0);
	const costPrice = Number(item.costPrice || 0);
	const margin =
		salesPrice > 0 ? ((salesPrice - costPrice) / salesPrice) * 100 : 0;

	return (
		<span
			className={cn(
				"block text-right font-mono font-medium",
				margin >= 25
					? "text-emerald-700"
					: margin > 0
						? "text-amber-700"
						: "text-muted-foreground",
			)}
		>
			{margin.toFixed(1)}%
		</span>
	);
}

export const columns: Column[] = [
	{
		id: "productName",
		header: "Product",
		accessorKey: "name",
		...sizes.custom(200, 380, 240),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			skeleton: { type: "avatar-text" },
			headerLabel: "Product",
			className: sizeClass(
				sizes.custom(200, 380, 240),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => <ProductCell item={row.original} />,
	},
	{
		id: "category",
		header: "Category",
		accessorKey: "category",
		...sizes.custom(116, 220, 140),
		enableResizing: true,
		meta: {
			skeleton: { type: "badge" },
			headerLabel: "Category",
			className: sizeClass(sizes.custom(116, 220, 140)),
		},
		cell: ({ row }) =>
			row.original.category ? (
				<Badge variant="secondary" className="max-w-full truncate">
					{row.original.category}
				</Badge>
			) : (
				<span className="text-muted-foreground">-</span>
			),
	},
	{
		id: "units",
		header: "Units Sold",
		accessorKey: "units",
		...sizes.custom(88, 132, 100),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-16" },
			headerLabel: "Units Sold",
			className: sizeClass(sizes.custom(88, 132, 100), "text-right"),
		},
		cell: ({ row }) => (
			<span className="block text-right font-mono font-medium">
				{row.original.units ?? 0}
			</span>
		),
	},
	{
		id: "revenue",
		header: "Revenue",
		accessorKey: "revenue",
		...sizes.custom(104, 150, 118),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Revenue",
			className: sizeClass(sizes.custom(104, 150, 118), "text-right"),
		},
		cell: ({ row }) => <MoneyCell value={row.original.revenue} />,
	},
	{
		id: "costPrice",
		header: "Cost Price",
		accessorKey: "costPrice",
		...sizes.custom(104, 150, 118),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Cost Price",
			className: sizeClass(sizes.custom(104, 150, 118), "text-right"),
		},
		cell: ({ row }) => <MoneyCell value={row.original.costPrice} />,
	},
	{
		id: "salesPrice",
		header: "Sales Price",
		accessorKey: "salesPrice",
		...sizes.custom(104, 150, 118),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Sales Price",
			className: sizeClass(sizes.custom(104, 150, 118), "text-right"),
		},
		cell: ({ row }) => <MoneyCell value={row.original.salesPrice} />,
	},
	{
		id: "margin",
		header: "Margin",
		...sizes.custom(92, 132, 104),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-16" },
			headerLabel: "Margin",
			className: sizeClass(sizes.custom(92, 132, 104), "text-right"),
		},
		cell: ({ row }) => <MarginCell item={row.original} />,
	},
];
