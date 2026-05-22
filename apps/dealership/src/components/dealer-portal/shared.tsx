"use client";

import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { InputGroup } from "@gnd/ui/namespace";
import { formatUSPhoneNumber } from "@gnd/utils/format";
import type { InputHTMLAttributes } from "react";
import { PatternFormat } from "react-number-format";

export function formatDate(value?: Date | string | null) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

export function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);
}

export function Field({
	description,
	label,
	name,
	...props
}: InputHTMLAttributes<HTMLInputElement> & {
	description?: string;
	label: string;
	name: string;
}) {
	const descriptionId = description ? `${name}-description` : undefined;

	return (
		<div className="space-y-2">
			<Label htmlFor={name}>{label}</Label>
			<Input
				aria-describedby={descriptionId}
				id={name}
				name={name}
				{...props}
			/>
			{description ? (
				<p
					className="text-xs leading-5 text-muted-foreground"
					id={descriptionId}
				>
					{description}
				</p>
			) : null}
		</div>
	);
}

export function PhoneField({
	description,
	label,
	name,
	defaultValue,
	...props
}: InputHTMLAttributes<HTMLInputElement> & {
	description?: string;
	label: string;
	name: string;
}) {
	const descriptionId = description ? `${name}-description` : undefined;

	return (
		<div className="space-y-2">
			<Label htmlFor={name}>{label}</Label>
			<InputGroup>
				<InputGroup.Addon>
					<InputGroup.Text>+1</InputGroup.Text>
				</InputGroup.Addon>
				<PatternFormat
					aria-describedby={descriptionId}
					autoComplete="tel-national"
					customInput={InputGroup.Input}
					defaultValue={formatUSPhoneNumber(String(defaultValue || ""))}
					format="###-###-####"
					id={name}
					inputMode="numeric"
					mask="_"
					name={name}
					placeholder="XXX-XXX-XXXX"
					type="tel"
					{...props}
				/>
			</InputGroup>
			{description ? (
				<p
					className="text-xs leading-5 text-muted-foreground"
					id={descriptionId}
				>
					{description}
				</p>
			) : null}
		</div>
	);
}
