"use client";

import type { ReactNode, RefObject } from "react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

export type MouldingSelectionPopoverProps = {
	open: boolean;
	title: string;
	qty: string;
	inputRef?: RefObject<HTMLInputElement | null>;
	trigger: ReactNode;
	calculatorSlot?: ReactNode;
	onOpenChange: (open: boolean) => void;
	onQtyChange: (qty: string) => void;
	onCancel: () => void;
	onAdd: () => void;
};

export function MouldingSelectionPopover(props: MouldingSelectionPopoverProps) {
	return (
		<Popover open={props.open} onOpenChange={props.onOpenChange}>
			<PopoverTrigger asChild>{props.trigger}</PopoverTrigger>
			<PopoverContent
				align="center"
				side="bottom"
				className="w-72 space-y-3 p-4"
			>
				<div className="space-y-1">
					<p className="text-sm font-semibold">{props.title}</p>
					<p className="text-xs text-muted-foreground">
						Enter moulding qty or use the calculator.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Input
						ref={props.inputRef}
						aria-label={`Quantity for ${props.title}`}
						type="number"
						min="1"
						value={props.qty}
						onChange={(event) => props.onQtyChange(event.target.value)}
						className="h-9 text-right"
						onKeyDown={(event) => {
							if (event.key !== "Enter") return;
							event.preventDefault();
							props.onAdd();
						}}
					/>
					{props.calculatorSlot}
				</div>
				<div className="flex items-center justify-end gap-2">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={props.onCancel}
					>
						Cancel
					</Button>
					<Button type="button" size="sm" onClick={props.onAdd}>
						Add
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
