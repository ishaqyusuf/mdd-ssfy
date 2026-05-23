"use client";

import type { ReactNode } from "react";

export type WorkflowComponentCardProps = {
	selected?: boolean;
	badgesSlot?: ReactNode;
	actionsSlot?: ReactNode;
	children: ReactNode;
};

export function WorkflowComponentCard(props: WorkflowComponentCardProps) {
	return (
		<div
			className={`relative overflow-hidden rounded-lg border text-left transition ${
				props.selected
					? "border-primary bg-primary/5 ring-1 ring-primary/20 hover:border-primary"
					: "bg-card hover:border-primary"
			}`}
		>
			{props.badgesSlot}
			{props.actionsSlot ? (
				<div className="absolute right-2 top-2 z-[2]">{props.actionsSlot}</div>
			) : null}
			{props.children}
		</div>
	);
}
