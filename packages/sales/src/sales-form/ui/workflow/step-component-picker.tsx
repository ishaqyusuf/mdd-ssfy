/** @jsxImportSource react */
"use client";

import type { ReactNode } from "react";
import { ComponentCardSkeletonGrid } from "./component-card-skeleton-grid";
import { WorkflowComponentGrid } from "./workflow-component-grid";

export type StepComponentPickerProps<TComponent> = {
	loading: boolean;
	hasComponents: boolean;
	filteredComponents: TComponent[];
	search: string;
	noticeSlot?: ReactNode;
	toolbarSlot: ReactNode;
	leadingSlot?: ReactNode;
	getKey: (component: TComponent, index: number) => string;
	renderComponent: (component: TComponent, index: number) => ReactNode;
};

export function StepComponentPicker<TComponent>(
	props: StepComponentPickerProps<TComponent>,
) {
	return (
		<div className="relative" data-workflow-component-boundary="true">
			{props.noticeSlot}
			{props.loading ? (
				<ComponentCardSkeletonGrid />
			) : !props.hasComponents && !props.leadingSlot ? (
				<p className="pb-24 text-sm text-muted-foreground">
					No components returned for this step.
				</p>
			) : (
				<WorkflowComponentGrid
					components={props.filteredComponents}
					search={props.search}
					getKey={props.getKey}
					renderComponent={props.renderComponent}
					leadingSlot={props.leadingSlot}
				/>
			)}
			{props.toolbarSlot}
		</div>
	);
}
