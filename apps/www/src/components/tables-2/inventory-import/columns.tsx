"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { colorsObject, hexToRgba } from "@gnd/utils/colors";
import type { ColumnDef } from "@tanstack/react-table";

export type InventoryImportRow = {
	id: number;
	uid: string | null;
	title: string | null;
	totalProducts?: number | null;
	standardProducts?: number | null;
	customProducts?: number | null;
	categoryUid?: string | null;
	importedStandardCount?: number | null;
	importedCustomCount?: number | null;
	subCategory?: string | null;
	importCategoryId?: number | null;
	inScope?: boolean | null;
	isDependencyOnly?: boolean | null;
	isStaleImported?: boolean | null;
	scopeReason?: string | null;
};

type Column = ColumnDef<InventoryImportRow>;

export function getInventoryImportRowId(item: InventoryImportRow) {
	return String(item.id);
}

function ImportStatusBadge({ item }: { item: InventoryImportRow }) {
	const imported = Boolean(item.categoryUid);

	return (
		<Badge
			style={{
				backgroundColor: hexToRgba(
					imported ? colorsObject.emerald : colorsObject.orange,
					0.1,
				),
				color: imported ? colorsObject.emerald : colorsObject.orange,
			}}
			className="gap-1 px-1"
		>
			{imported ? (
				<Icons.CheckCircle className="size-3" />
			) : (
				<Icons.Clock className="size-3" />
			)}
			{imported ? "Imported" : "Pending"}
		</Badge>
	);
}

function CategoryCell({ item }: { item: InventoryImportRow }) {
	return (
		<div className="min-w-0 space-y-1">
			<TextWithTooltip
				className="block max-w-full truncate font-semibold"
				text={item.title || item.uid || "-"}
			/>
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">
				<Progress>
					<Progress.Status noDot>
						{item.subCategory || "configured"}
					</Progress.Status>
				</Progress>
				{item.uid ? (
					<Badge variant="outline" className="max-w-[160px] truncate">
						{item.uid}
					</Badge>
				) : null}
			</div>
			{item.scopeReason ? (
				<TextWithTooltip
					className="block max-w-full truncate text-xs text-muted-foreground"
					text={item.scopeReason}
				/>
			) : null}
		</div>
	);
}

function ScopeCell({ item }: { item: InventoryImportRow }) {
	return (
		<div className="flex min-w-0 flex-wrap gap-2">
			<Badge variant={item.inScope ? "secondary" : "outline"}>
				{item.inScope ? "Active" : "Excluded"}
			</Badge>
			{item.isDependencyOnly ? (
				<Badge variant="outline">Dependency</Badge>
			) : null}
			{item.isStaleImported ? (
				<Badge variant="destructive">Stale Import</Badge>
			) : null}
		</div>
	);
}

function ProductCountCell({ item }: { item: InventoryImportRow }) {
	return (
		<div className="text-center">
			<div className="font-mono font-semibold">{item.totalProducts ?? 0}</div>
			<div className="text-xs text-muted-foreground">
				{item.standardProducts ?? 0} standard / {item.customProducts ?? 0}{" "}
				custom
			</div>
		</div>
	);
}

function ImportedRowsCell({ item }: { item: InventoryImportRow }) {
	const standard = item.importedStandardCount ?? 0;
	const custom = item.importedCustomCount ?? 0;

	return (
		<div className="text-center">
			<div className="font-mono font-semibold">{standard + custom}</div>
			<div className="text-xs text-muted-foreground">
				{standard} standard / {custom} custom
			</div>
		</div>
	);
}

export const columns: Column[] = [
	{
		id: "category",
		header: "Category",
		accessorKey: "title",
		...sizes.custom(260, 540, 340),
		enableResizing: true,
		enableHiding: false,
		meta: {
			sticky: true,
			skeleton: { type: "icon-text" },
			headerLabel: "Category",
			className: sizeClass(
				sizes.custom(260, 540, 340),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => <CategoryCell item={row.original} />,
	},
	{
		id: "scope",
		header: "Scope",
		...sizes.custom(180, 280, 220),
		enableResizing: true,
		meta: {
			skeleton: { type: "tags" },
			headerLabel: "Scope",
			className: sizeClass(sizes.custom(180, 280, 220)),
		},
		cell: ({ row }) => <ScopeCell item={row.original} />,
	},
	{
		id: "importStatus",
		header: "Import Status",
		accessorKey: "categoryUid",
		...sizes.custom(130, 200, 160),
		enableResizing: true,
		meta: {
			skeleton: { type: "badge" },
			headerLabel: "Import Status",
			className: sizeClass(sizes.custom(130, 200, 160)),
		},
		cell: ({ row }) => <ImportStatusBadge item={row.original} />,
	},
	{
		id: "productCount",
		header: "Product Count",
		accessorKey: "totalProducts",
		...sizes.custom(150, 220, 170),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Product Count",
			className: sizeClass(sizes.custom(150, 220, 170), "text-center"),
		},
		cell: ({ row }) => <ProductCountCell item={row.original} />,
	},
	{
		id: "importedRows",
		header: "Imported Rows",
		accessorFn: (row) =>
			(row.importedStandardCount ?? 0) + (row.importedCustomCount ?? 0),
		...sizes.custom(150, 220, 170),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-20" },
			headerLabel: "Imported Rows",
			className: sizeClass(sizes.custom(150, 220, 170), "text-center"),
		},
		cell: ({ row }) => <ImportedRowsCell item={row.original} />,
	},
];
