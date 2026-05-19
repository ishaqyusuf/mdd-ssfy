"use client";

import type { ReactNode } from "react";
import { ComponentCardSkeletonGrid } from "./component-card-skeleton-grid";
import { WorkflowComponentGrid } from "./workflow-component-grid";

export type StepComponentPickerProps<TComponent> = {
	loading: boolean;
	hasComponents: boolean;
	filteredComponents: TComponent[];
	search: string;
	toolbarSlot: ReactNode;
	getKey: (component: TComponent, index: number) => string;
	renderComponent: (component: TComponent, index: number) => ReactNode;
};

export function StepComponentPicker<TComponent>(
	props: StepComponentPickerProps<TComponent>,
) {
	if (props.loading) {
		return <ComponentCardSkeletonGrid />;
	}

	if (!props.hasComponents) {
		return (
			<p className="text-sm text-muted-foreground">
				No components returned for this step.
			</p>
		);
	}

	return (
		<>
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
