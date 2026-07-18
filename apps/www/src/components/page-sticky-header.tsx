"use client";

import { useScrollHeader } from "@/hooks/use-scroll-header";
import { cn } from "@gnd/ui/cn";
import type { ReactNode } from "react";

type PageStickyHeaderProps = {
	children: ReactNode;
	className?: string;
};

export function PageStickyHeader({
	children,
	className,
}: PageStickyHeaderProps) {
	useScrollHeader();

	return (
		<div
			className={cn(
				"sticky top-0 z-30 flex flex-col gap-4 border-b bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85",
				className,
			)}
		>
			{children}
		</div>
	);
}
