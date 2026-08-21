/** @jsxImportSource react */
"use client";

import { FilterOptionColor } from "./filter-option-color";

export function FilterOptionLabel({
	label,
	color,
	truncate = false,
}: {
	label: string;
	color?: string;
	truncate?: boolean;
}) {
	return (
		<span className="flex items-center gap-2">
			<FilterOptionColor color={color} />
			<span className={truncate ? "line-clamp-1" : undefined}>{label}</span>
		</span>
	);
}
