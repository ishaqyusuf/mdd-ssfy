import type { ColumnDef } from "@tanstack/react-table";
import type { RefObject } from "react";

export type SkeletonType =
	| "checkbox"
	| "text"
	| "avatar-text"
	| "icon-text"
	| "badge"
	| "tags"
	| "icon";

export interface TableScrollState {
	containerRef: RefObject<HTMLDivElement | null>;
	canScrollLeft: boolean;
	canScrollRight: boolean;
	isScrollable: boolean;
	scrollLeft: () => void;
	scrollRight: () => void;
}

export interface StickyColumnConfig {
	id: string;
	width: number;
}

export type TableStyle = "default" | "compact";

export interface TableConfig {
	tableId: string;
	stickyColumns: StickyColumnConfig[];
	sortFieldMap: Record<string, string>;
	nonReorderableColumns: Set<string>;
	rowHeight: number;
	headerHeight: number;
	style: TableStyle;
	summaryGridHeight?: number;
}

export interface SkeletonConfig {
	type: SkeletonType;
	width?: string;
}

export interface TableColumnMeta {
	className?: string;
	contentClassName?: string;
	sticky?: boolean;
	sortField?: string;
	defaultSortDirection?: "asc" | "desc";
	skeleton?: SkeletonConfig;
	headerLabel?: string;
}

export function getColumnId<TData>(col: ColumnDef<TData>): string {
	return (
		col.id ||
		(col as ColumnDef<TData> & { accessorKey?: string }).accessorKey ||
		""
	);
}

export function getHeaderLabel<TData>(col: ColumnDef<TData>): string {
	const meta = col.meta as TableColumnMeta | undefined;
	if (meta?.headerLabel) return meta.headerLabel;

	return getColumnId(col)
		.replace(/_/g, " ")
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (str) => str.toUpperCase())
		.trim();
}

export const ACTIONS_FULL_WIDTH_HEADER_CLASS =
	"group/header relative h-full px-4 !border-t border-border flex items-center justify-center bg-background z-10";

export const ACTIONS_STICKY_HEADER_CLASS =
	"group/header relative h-full px-4 !border-t !border-l !border-border flex items-center justify-center md:sticky md:right-0 bg-background z-10";

export const ACTIONS_FULL_WIDTH_CELL_CLASS =
	"bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary";
