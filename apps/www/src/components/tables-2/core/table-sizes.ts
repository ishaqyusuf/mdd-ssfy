import type { ClassValue } from "clsx";
import type { CSSProperties } from "react";

import { cn } from "@gnd/ui/cn";

export type TableColumnSize = {
	size: number;
	minSize: number;
	maxSize: number;
};

export type TableLayoutColumn = {
	id: string;
	canResize: boolean;
};

type TableColumnLayoutStyleOptions = TableColumnSize & {
	isFillColumn: boolean;
	actionsFullWidth?: boolean;
	lockToSize?: boolean;
};

type TableHeaderLike = {
	column: {
		id: string;
		getSize: () => number;
		getCanResize: () => boolean;
		columnDef: {
			minSize?: number;
			maxSize?: number;
		};
	};
};

const UTILITY_COLUMN_IDS = new Set([
	"actions",
	"select",
	"selected",
	"handle",
	"draghandle",
	"rowdrag",
	"reorder",
]);

function makeSize(
	size: number,
	minSize = size,
	maxSize = size,
): TableColumnSize {
	return {
		size,
		minSize,
		maxSize,
	};
}

export const sizes = {
	xs: makeSize(50, 50, 50),
	sm: makeSize(120, 100, 180),
	md: makeSize(160, 130, 240),
	lg: makeSize(220, 150, 360),
	custom: (minSize: number, maxSize: number, size = minSize) =>
		makeSize(size, minSize, maxSize),
} as const;

export const tableColumnSizeClass =
	"w-[var(--table-column-size)] min-w-[var(--table-column-min-size)]";

export function sizeClass(_size: TableColumnSize, ...className: ClassValue[]) {
	return cn(tableColumnSizeClass, ...className);
}

export function getTableColumnSizeStyle(size: TableColumnSize): CSSProperties {
	return {
		"--table-column-size": `${size.size}px`,
		"--table-column-min-size": `${size.minSize}px`,
		"--table-column-max-size": `${size.maxSize}px`,
	} as CSSProperties;
}

function isUtilityColumn(columnId: string) {
	return UTILITY_COLUMN_IDS.has(
		columnId.toLowerCase().replace(/[^a-z0-9]/g, ""),
	);
}

export function resolveTableFillColumnId(
	columns: readonly TableLayoutColumn[],
	preferredId?: string | null,
): string | null {
	if (!preferredId) return null;

	const preferredColumn = columns.find((column) => column.id === preferredId);
	if (preferredColumn && !isUtilityColumn(preferredColumn.id)) {
		return preferredColumn.id;
	}

	const dataColumns = columns.filter((column) => !isUtilityColumn(column.id));
	return (
		dataColumns.findLast((column) => column.canResize)?.id ??
		dataColumns.at(-1)?.id ??
		null
	);
}

export function getTableColumnLayoutStyle({
	size,
	minSize,
	maxSize,
	isFillColumn,
	actionsFullWidth = false,
	lockToSize = false,
}: TableColumnLayoutStyleOptions): CSSProperties {
	if (actionsFullWidth) {
		return {
			width: undefined,
			minWidth: undefined,
			maxWidth: undefined,
			flexGrow: 1,
		};
	}

	return {
		...getTableColumnSizeStyle({ size, minSize, maxSize }),
		width: size,
		minWidth: lockToSize ? size : minSize,
		maxWidth: isFillColumn ? undefined : lockToSize ? size : maxSize,
		flexBasis: isFillColumn ? size : undefined,
		flexGrow: isFillColumn ? 1 : 0,
	};
}

export function getTableHeaderLayoutStyle({
	headers,
	header,
	isVisible,
	preferredFillColumnId,
	isSticky,
	actionsColumnId = "actions",
}: {
	headers: readonly TableHeaderLike[];
	header: TableHeaderLike;
	isVisible: (columnId: string) => boolean;
	preferredFillColumnId?: string | null;
	isSticky: boolean;
	actionsColumnId?: string;
}) {
	const resolvedFillColumnId = resolveTableFillColumnId(
		headers
			.filter((item) => isVisible(item.column.id))
			.map((item) => ({
				id: item.column.id,
				canResize: item.column.getCanResize(),
			})),
		preferredFillColumnId,
	);
	const columnId = header.column.id;
	const columnSize = header.column.getSize();
	const actionsFullWidth =
		columnId === actionsColumnId && !resolvedFillColumnId;

	return {
		actionsFullWidth,
		resolvedFillColumnId,
		style: getTableColumnLayoutStyle({
			size: columnSize,
			minSize: header.column.columnDef.minSize ?? columnSize,
			maxSize: header.column.columnDef.maxSize ?? columnSize,
			isFillColumn: columnId === resolvedFillColumnId,
			actionsFullWidth,
			lockToSize: isSticky,
		}),
	};
}
