"use client";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { cn } from "@gnd/ui/cn";
import { Field, FieldDescription, FieldLabel } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useState } from "react";
import { formatDeliveryDate, toDateInput } from "./date-model";

export function DeliveryDatePicker({
	value,
	onChange,
	label,
	description,
	overrideValue,
	placeholder = "Set date",
	allowClear = false,
}: {
	value: string | null;
	onChange: (value: string | null) => void;
	label: string;
	description?: string;
	overrideValue?: string | null;
	placeholder?: string;
	allowClear?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;
	const overridden = Boolean(value && overrideValue);

	return (
		<div className="flex min-w-0 items-center gap-1">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="min-w-0 flex-1 justify-start"
						aria-label={label}
					>
						<Icons.Calendar data-icon="inline-start" aria-hidden="true" />
						<span
							className={cn(
								"truncate",
								overridden && "line-through opacity-60",
							)}
						>
							{value ? formatDeliveryDate(value) : placeholder}
						</span>
						{overrideValue ? (
							<span className="truncate font-medium">
								{formatDeliveryDate(overrideValue)}
							</span>
						) : null}
						<Icons.Edit data-icon="inline-end" aria-hidden="true" />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto">
					<Field>
						<FieldLabel>{label}</FieldLabel>
						{description ? (
							<FieldDescription>{description}</FieldDescription>
						) : null}
						<Calendar
							mode="single"
							aria-label={label}
							defaultMonth={selectedDate}
							selected={selectedDate}
							onSelect={(date) => {
								onChange(date ? toDateInput(date) : null);
								if (date) setOpen(false);
							}}
							className="p-0"
						/>
					</Field>
				</PopoverContent>
			</Popover>
			{allowClear && value ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={() => onChange(null)}
					aria-label={`Clear ${label.toLowerCase()}`}
				>
					<Icons.X aria-hidden="true" />
				</Button>
			) : null}
		</div>
	);
}
