"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";

import type { ItemWorkflowOption } from "./use-item-workflow-controller";

export function ItemWorkflowHeader(props: {
	value: string;
	options: ItemWorkflowOption[];
	onValueChange: (value: string) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				Item Workflow
			</h3>
			<div className="w-full max-w-[260px] lg:hidden">
				<Select
					value={props.value}
					onValueChange={props.onValueChange}
					disabled={props.options.length <= 1}
				>
					<SelectTrigger className="h-9">
						<SelectValue placeholder="Select item" />
					</SelectTrigger>
					<SelectContent>
						{props.options.map((option) => (
							<SelectItem key={`item-picker-${option.uid}`} value={option.uid}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
