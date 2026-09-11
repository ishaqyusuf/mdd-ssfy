/** @jsxImportSource react */
"use client";

import { Menu } from "@gnd/ui/custom/menu";
import { useMediaQuery } from "@gnd/ui/hooks/use-media-query";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@gnd/ui/sheet";
import type { ReactNode } from "react";

type ResponsiveEstimateBreakdownProps = {
	label: ReactNode;
	title: string;
	children: ReactNode;
};

export function ResponsiveEstimateBreakdown(
	props: ResponsiveEstimateBreakdownProps,
) {
	const isCompact = useMediaQuery("(max-width: 1023px)");

	if (!isCompact) {
		return (
			<Menu noSize Icon={null} label={props.label}>
				{props.children}
			</Menu>
		);
	}

	return (
		<Sheet>
			<SheetTrigger asChild>
				<button type="button" className="min-h-10 text-right">
					{props.label}
				</button>
			</SheetTrigger>
			<SheetContent
				side="bottom"
				className="max-h-[85dvh] w-full overflow-y-auto rounded-t-xl p-3"
			>
				<SheetHeader className="sr-only">
					<SheetTitle>{props.title}</SheetTitle>
				</SheetHeader>
				{props.children}
			</SheetContent>
		</Sheet>
	);
}
