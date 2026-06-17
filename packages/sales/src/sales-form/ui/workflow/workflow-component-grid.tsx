/** @jsxImportSource react */
"use client";

import type { ReactNode } from "react";

export type WorkflowComponentGridProps<TComponent> = {
	components: TComponent[];
	search: string;
	getKey: (component: TComponent, index: number) => string;
	renderComponent: (component: TComponent, index: number) => ReactNode;
};

export function WorkflowComponentGrid<TComponent>(
	props: WorkflowComponentGridProps<TComponent>,
) {
	return (
		<>
			<div className="grid gap-3 pb-24 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
				{props.components.map((component, index) => (
					<div key={props.getKey(component, index)} className="min-w-0">
						{props.renderComponent(component, index)}
					</div>
				))}
			</div>
			{!props.components.length ? (
				<div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
					No components match "{props.search.trim()}".
				</div>
			) : null}
		</>
	);
}
