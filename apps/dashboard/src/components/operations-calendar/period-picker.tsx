"use client";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";

import {
	type OperationsCalendarView,
	formatOperationsCalendarPeriodLabel,
	getOperationsCalendarPeriodOptions,
} from "./range";

export function OperationsCalendarPeriodPicker({
	date,
	view,
	onSelect,
}: {
	date: Date;
	view: OperationsCalendarView;
	onSelect: (date: Date) => void;
}) {
	const [open, setOpen] = useState(false);
	const selectedOptionRef = useRef<HTMLButtonElement>(null);
	const options = getOperationsCalendarPeriodOptions(date, view);
	const periodLabel = formatOperationsCalendarPeriodLabel(date, view);

	useEffect(() => {
		if (!open) return;

		const frame = requestAnimationFrame(() => {
			selectedOptionRef.current?.scrollIntoView({ block: "center" });
		});

		return () => cancelAnimationFrame(frame);
	}, [open]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					aria-label={`Choose ${view}, ${periodLabel}`}
					className="h-9 min-w-44 justify-center gap-1.5 px-3 text-center font-medium"
				>
					<span className="whitespace-nowrap">{periodLabel}</span>
					<Icons.ChevronDown className="size-3.5 text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="center" className="w-72 p-1">
				<p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
					Select {view}
				</p>
				<div className="max-h-80 overflow-y-auto overscroll-contain">
					{options.map((option) => (
						<Button
							key={format(option.date, "yyyy-MM-dd")}
							ref={option.selected ? selectedOptionRef : undefined}
							type="button"
							variant="ghost"
							onClick={() => {
								onSelect(option.date);
								setOpen(false);
							}}
							className={cn(
								"h-9 w-full justify-between px-2 font-normal",
								option.selected && "bg-accent font-medium",
							)}
						>
							<span>{option.label}</span>
							{option.selected ? <Icons.Check className="size-4" /> : null}
						</Button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
