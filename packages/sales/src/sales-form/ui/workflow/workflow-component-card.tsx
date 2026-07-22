/** @jsxImportSource react */
"use client";

import type { ReactNode } from "react";

export type WorkflowComponentCardProps = {
	selected?: boolean;
	selectedCustom?: boolean;
	badgesSlot?: ReactNode;
	actionsSlot?: ReactNode;
	selectionSlot?: ReactNode;
	children: ReactNode;
};

export function WorkflowComponentCard(props: WorkflowComponentCardProps) {
	return (
		<div
			className={`relative overflow-hidden rounded-lg border text-left transition ${
				props.selectedCustom
					? "border-destructive bg-destructive/5 ring-1 ring-destructive/30 hover:border-destructive"
					: props.selected
						? "border-primary bg-primary/5 ring-1 ring-primary/20 hover:border-primary"
						: "bg-card hover:border-primary"
			}`}
		>
			{props.selectionSlot ? (
				<div className="absolute left-2 top-2 z-[3] rounded bg-background p-1 shadow-sm">
					{props.selectionSlot}
				</div>
			) : null}
			{props.badgesSlot}
			{props.actionsSlot ? (
				<div className="absolute right-2 top-2 z-[2]">{props.actionsSlot}</div>
			) : null}
			{props.children}
		</div>
	);
}
