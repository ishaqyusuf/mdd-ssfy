/** @jsxImportSource react */
"use client";

import type { ReactNode } from "react";
import { Button } from "@gnd/ui/button";
import { Icon } from "@gnd/ui/icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";

export type ShelfSectionsPanelProps<TSection> = {
	sections: TSection[];
	onAddSection: () => void;
	renderSection: (section: TSection, index: number) => ReactNode;
};

export function ShelfSectionsPanel<TSection>(
	props: ShelfSectionsPanelProps<TSection>,
) {
	return (
		<TooltipProvider delayDuration={120}>
			<div className="flex items-center gap-2">
				<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Shelf Items
				</p>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							size="icon-sm"
							variant="outline"
							className="ml-auto"
							aria-label="Add section"
							onClick={props.onAddSection}
						>
							<Icon name="Plus" className="size-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="left" className="px-2 py-1 text-xs">
						Add section
					</TooltipContent>
				</Tooltip>
			</div>
			{props.sections.length ? (
				<div className="space-y-2">
					{props.sections.map((section, index) =>
						props.renderSection(section, index),
					)}
				</div>
			) : (
				<p className="text-sm text-muted-foreground">No shelf sections yet.</p>
			)}
		</TooltipProvider>
	);
}
