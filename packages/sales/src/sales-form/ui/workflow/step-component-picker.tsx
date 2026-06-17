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
	getKey: (component: TComponent, index: number) => string;
	renderComponent: (component: TComponent, index: number) => ReactNode;
};

export function StepComponentPicker<TComponent>(
	props: StepComponentPickerProps<TComponent>,
) {
	if (props.loading) {
		return (
			<>
				{props.noticeSlot}
				<ComponentCardSkeletonGrid />
			</>
		);
	}

	if (!props.hasComponents) {
		return (
			<div className="space-y-3">
				{props.noticeSlot}
				<p className="text-sm text-muted-foreground">
					No components returned for this step.
				</p>
			</div>
		);
	}

	return (
		<>
			{props.noticeSlot}
			<WorkflowComponentGrid
				components={props.filteredComponents}
				search={props.search}
				getKey={props.getKey}
				renderComponent={props.renderComponent}
			/>
			{props.toolbarSlot}
		</>
	);
}
