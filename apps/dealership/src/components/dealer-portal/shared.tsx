"use client";

import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import type { InputHTMLAttributes } from "react";

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
	label,
	name,
	...props
}: InputHTMLAttributes<HTMLInputElement> & {
	label: string;
	name: string;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={name}>{label}</Label>
			<Input id={name} name={name} {...props} />
		</div>
	);
}
