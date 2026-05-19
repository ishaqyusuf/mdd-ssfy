"use client";

import type { ReactNode } from "react";
import { Button } from "@gnd/ui/button";

export type ShelfSectionsPanelProps<TSection> = {
	sections: TSection[];
	onAddSection: () => void;
	renderSection: (section: TSection, index: number) => ReactNode;
};

export function ShelfSectionsPanel<TSection>(
	props: ShelfSectionsPanelProps<TSection>,
) {
	return (
		<>
			<div className="flex items-center gap-2">
				<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Shelf Items
				</p>
				<Button
					size="sm"
					variant="outline"
					className="ml-auto"
					onClick={props.onAddSection}
				>
					Add Section
				</Button>
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
		</>
	);
}
