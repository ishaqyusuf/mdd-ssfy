/** @jsxImportSource react */
"use client";

import type { ReactNode } from "react";
import { ComponentCardSkeletonGrid } from "./component-card-skeleton-grid";
import { WorkflowComponentGrid } from "./workflow-component-grid";

export type RootComponentPickerProps<TComponent> = {
	loading: boolean;
	components: TComponent[];
	filteredComponents: TComponent[];
	search: string;
	noticeSlot?: ReactNode;
	toolbarSlot: ReactNode;
	getKey: (component: TComponent, index: number) => string;
	renderComponent: (component: TComponent, index: number) => ReactNode;
};

export function RootComponentPicker<TComponent>(
	props: RootComponentPickerProps<TComponent>,
) {
	return (
		<div
			className="relative w-full space-y-3"
			data-workflow-component-boundary="true"
		>
			<p className="mb-3 hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">
				Root Step Components
			</p>
			{props.toolbarSlot}
			{props.noticeSlot}
			{props.loading ? (
				<ComponentCardSkeletonGrid />
			) : !props.components.length ? (
				<p className="text-sm text-muted-foreground">
					No root components found in sales settings route.
				</p>
			) : (
				<>
					<WorkflowComponentGrid
						components={props.filteredComponents}
						search={props.search}
						getKey={props.getKey}
						renderComponent={props.renderComponent}
					/>
				</>
			)}
		</div>
	);
}
