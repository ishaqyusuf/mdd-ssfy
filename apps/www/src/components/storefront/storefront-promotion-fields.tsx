"use client";

import { Input } from "@gnd/ui/input";
import { useId } from "react";

export function TextField(props: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	const id = useId();
	return (
		<label className="grid gap-1 text-sm" htmlFor={id}>
			{props.label}
			<Input
				id={id}
				value={props.value}
				onChange={(event) => props.onChange(event.target.value)}
				placeholder={props.placeholder}
			/>
		</label>
	);
}

export function NumberField(props: {
	label: string;
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
}) {
	const id = useId();
	return (
		<label className="grid gap-1 text-sm" htmlFor={id}>
			{props.label}
			<Input
				id={id}
				type="number"
				min={props.min}
				max={props.max}
				step="0.01"
				value={props.value}
				onChange={(event) => props.onChange(Number(event.target.value))}
			/>
		</label>
	);
}

export function DateTimeField(props: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const id = useId();
	return (
		<label className="grid gap-1 text-sm" htmlFor={id}>
			{props.label}
			<Input
				id={id}
				type="datetime-local"
				value={props.value}
				onChange={(event) => props.onChange(event.target.value)}
			/>
		</label>
	);
}

export function TargetSection<T extends "EVERYONE" | "ALL_OFFERS">(props: {
	title: string;
	mode: T | "TARGETED";
	allValue: T;
	allLabel: string;
	targetedLabel: string;
	onModeChange: (value: T | "TARGETED") => void;
	children: React.ReactNode;
}) {
	return (
		<fieldset className="space-y-3 rounded-md border p-4">
			<legend className="px-1 text-sm font-medium">{props.title}</legend>
			<div className="flex flex-wrap gap-4 text-sm">
				<label className="flex items-center gap-2">
					<input
						type="radio"
						checked={props.mode === props.allValue}
						onChange={() => props.onModeChange(props.allValue)}
					/>
					{props.allLabel}
				</label>
				<label className="flex items-center gap-2">
					<input
						type="radio"
						checked={props.mode === "TARGETED"}
						onChange={() => props.onModeChange("TARGETED")}
					/>
					{props.targetedLabel}
				</label>
			</div>
			{props.children}
		</fieldset>
	);
}

function toggleValue<T>(values: T[], value: T, checked: boolean) {
	return checked
		? values.includes(value)
			? values
			: [...values, value]
		: values.filter((item) => item !== value);
}

export function CheckList<T extends string | number>(props: {
	title: string;
	items: Array<{ id: T; label: string }>;
	selected: T[];
	onChange: (values: T[]) => void;
}) {
	return (
		<fieldset className="max-h-64 space-y-2 overflow-y-auto rounded-md bg-muted/40 p-3">
			<legend className="text-sm font-medium">{props.title}</legend>
			{props.items.length ? (
				props.items.map((item) => (
					<label key={item.id} className="flex items-start gap-2 text-sm">
						<input
							type="checkbox"
							className="mt-0.5"
							checked={props.selected.includes(item.id)}
							onChange={(event) =>
								props.onChange(
									toggleValue(props.selected, item.id, event.target.checked),
								)
							}
						/>
						<span>{item.label}</span>
					</label>
				))
			) : (
				<p className="text-sm text-muted-foreground">No matches.</p>
			)}
		</fieldset>
	);
}
