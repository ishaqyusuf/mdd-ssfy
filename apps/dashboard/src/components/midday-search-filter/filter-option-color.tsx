"use client";

import { cn } from "@gnd/ui/cn";

export function FilterOptionColor({
	color,
	className,
	size = 12,
}: {
	color?: string | null;
	className?: string;
	size?: number;
}) {
	if (!color) return null;

	return (
		<div
			className={cn("flex-shrink-0", className)}
			style={{
				backgroundColor: color,
				height: size,
				width: size,
			}}
		/>
	);
}
