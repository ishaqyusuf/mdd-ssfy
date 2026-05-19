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
		<div className="sticky bottom-4 z-10 flex justify-center">
			<div
				className={`flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-background/95 p-3 shadow-lg backdrop-blur md:flex-row md:items-center ${
					props.maxWidthClassName || "max-w-3xl"
				}`}
			>
				<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					<span>
						{props.count}
						{props.count !== props.total ? ` of ${props.total}` : ""}{" "}
						components
					</span>
				</div>
				<div className="flex-1">
					<Input
						value={props.search}
						onChange={(event) => props.onSearchChange(event.target.value)}
						placeholder="Search components..."
						className="h-9 border-slate-200 bg-white"
					/>
				</div>
				<Menu
					Trigger={
						<Button size="icon" variant="outline" className="size-9">
							<Icons.Filter className="size-4" />
						</Button>
					}
				>
					{props.menuSlot}
				</Menu>
				{props.actionSlot}
			</div>
		</div>
	);
}
