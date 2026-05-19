"use client";

import type { ReactNode } from "react";
import {
	ShelfSectionsPanel,
	type ShelfSectionsPanelProps,
} from "./shelf-sections-panel";

export type WorkflowShelfPanelProps<TSection> =
	ShelfSectionsPanelProps<TSection>;

export function WorkflowShelfPanel<TSection>(
	props: WorkflowShelfPanelProps<TSection>,
) {
	return (
		<div className="space-y-3 rounded-lg border p-3">
			<ShelfSectionsPanel
				sections={props.sections}
				onAddSection={props.onAddSection}
				renderSection={(section, index): ReactNode =>
					props.renderSection(section, index)
				}
			/>
		</div>
	);
}
