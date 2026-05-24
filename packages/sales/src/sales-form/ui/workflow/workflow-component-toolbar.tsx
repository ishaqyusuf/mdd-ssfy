"use client";

import type { ReactNode } from "react";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Menu } from "@gnd/ui/custom/menu";

export type WorkflowComponentToolbarProps = {
	count: number;
	total: number;
	search: string;
	maxWidthClassName?: string;
	actionSlot?: ReactNode;
	menuSlot?: ReactNode;
	onSearchChange: (value: string) => void;
};

export function WorkflowComponentToolbar(props: WorkflowComponentToolbarProps) {
	return (
		<div className="sticky bottom-2 z-10 flex justify-center px-2 sm:bottom-4 sm:px-0">
			<div
				className={`flex w-full min-w-0 flex-col gap-2 rounded-lg border border-slate-200 bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center ${
					props.maxWidthClassName || "max-w-3xl"
				}`}
			>
				<div className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					<span>
						{props.count}
						{props.count !== props.total ? ` of ${props.total}` : ""} components
					</span>
				</div>
				<div className="min-w-0 flex-1">
					<Input
						value={props.search}
						onChange={(event) => props.onSearchChange(event.target.value)}
						placeholder="Search components..."
						className="h-9 w-full border-slate-200 bg-white"
					/>
				</div>
				{props.menuSlot ? (
					<Menu
						Trigger={
							<Button
								type="button"
								size="icon"
								variant="outline"
								className="size-9"
								aria-label="Workflow component options"
							>
								<Icons.Filter className="size-4" />
							</Button>
						}
					>
						{props.menuSlot}
					</Menu>
				) : null}
				{props.actionSlot ? (
					<div className="w-full sm:w-auto">{props.actionSlot}</div>
				) : null}
			</div>
		</div>
	);
}
