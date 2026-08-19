/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import type { KeyboardEventHandler, RefObject } from "react";

export type SalesFormQuantityStepperProps = {
	value?: number | null;
	label: string;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	className?: string;
	inputRef?: RefObject<HTMLInputElement | null>;
	onInputKeyDown?: KeyboardEventHandler<HTMLInputElement>;
	onChange: (value: number) => void;
};

export function normalizeSalesFormQuantity(
	value: unknown,
	min = 0,
	max = Number.MAX_SAFE_INTEGER,
) {
	const parsed = Number(value);
	const finite = Number.isFinite(parsed) ? parsed : min;
	return Math.min(Math.max(finite, min), max);
}

export function stepSalesFormQuantity(
	value: unknown,
	direction: -1 | 1,
	options: { min?: number; max?: number; step?: number } = {},
) {
	const min = options.min ?? 0;
	const max = options.max ?? Number.MAX_SAFE_INTEGER;
	const step = options.step ?? 1;
	return normalizeSalesFormQuantity(
		normalizeSalesFormQuantity(value, min, max) + direction * step,
		min,
		max,
	);
}

export function SalesFormQuantityStepper(props: SalesFormQuantityStepperProps) {
	const min = props.min ?? 0;
	const max = props.max ?? Number.MAX_SAFE_INTEGER;
	const step = props.step ?? 1;
	const value = normalizeSalesFormQuantity(props.value, min, max);

	return (
		<fieldset
			className={cn(
				"flex h-9 w-28 items-stretch overflow-hidden rounded-lg border border-border bg-background shadow-xs transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15",
				props.disabled && "bg-muted/40 opacity-60",
				props.className,
			)}
		>
			<legend className="sr-only">{props.label}</legend>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label={`Decrease ${props.label}`}
				className="h-full w-9 shrink-0 rounded-none border-r text-muted-foreground hover:bg-muted hover:text-foreground"
				disabled={props.disabled || value <= min}
				onClick={() =>
					props.onChange(stepSalesFormQuantity(value, -1, { min, max, step }))
				}
			>
				<Icons.Minus className="size-3.5" />
			</Button>
			<Input
				ref={props.inputRef}
				type="number"
				inputMode="numeric"
				aria-label={props.label}
				min={min}
				max={max}
				step={step}
				value={value}
				disabled={props.disabled}
				className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-1 text-center text-sm font-semibold shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
				onChange={(event) =>
					props.onChange(
						normalizeSalesFormQuantity(event.target.value, min, max),
					)
				}
				onKeyDown={props.onInputKeyDown}
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				aria-label={`Increase ${props.label}`}
				className="h-full w-9 shrink-0 rounded-none border-l text-muted-foreground hover:bg-muted hover:text-foreground"
				disabled={props.disabled || value >= max}
				onClick={() =>
					props.onChange(stepSalesFormQuantity(value, 1, { min, max, step }))
				}
			>
				<Icons.Plus className="size-3.5" />
			</Button>
		</fieldset>
	);
}
