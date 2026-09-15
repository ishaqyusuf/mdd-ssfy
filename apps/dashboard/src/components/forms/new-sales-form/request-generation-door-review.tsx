"use client";

import { useState } from "react";
import { isComponentVisibleByRules } from "@gnd/sales/sales-form/domain/step-engine";
import type { NewSalesFormSeed } from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useSalesStepComponentsQuery } from "./api";

export function SalesRequestDoorReview(props: {
	lineLabel: string;
	fieldLabel?: string;
	selections: NewSalesFormSeed["lineItems"][number]["formSteps"];
	stepUids: Record<number, string>;
	stepId: number;
	disabled: boolean;
	onChoose: (uid: string) => void;
}) {
	const fieldLabel = props.fieldLabel || "Door product";
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState("");
	const query = useSalesStepComponentsQuery({ stepId: props.stepId }, open);
	const selectedAll: Record<string, string[]> = {};
	for (const selection of props.selections) {
		const uid = props.stepUids[selection.stepId];
		if (!uid || "value" in selection) continue;
		selectedAll[uid] =
			"prodUid" in selection
				? [selection.prodUid]
				: selection.meta.selectedProdUids;
	}
	const selectedByUid = Object.fromEntries(
		Object.entries(selectedAll).map(([uid, values]) => [uid, values[0] || ""]),
	);
	const products = (query.data || []).filter(
		(component) =>
			component.uid &&
			component.title?.trim() &&
			!component.isDeleted &&
			isComponentVisibleByRules(component, selectedByUid, selectedAll),
	);
	return (
		<div className="space-y-2 rounded-md border p-3">
			<p className="text-sm font-medium">
				{props.lineLabel} · {fieldLabel}
			</p>
			<div className="flex gap-2">
				<Select
					open={open}
					onOpenChange={setOpen}
					value={selected}
					onValueChange={setSelected}
					disabled={props.disabled}
				>
					<SelectTrigger aria-label={`${props.lineLabel} ${fieldLabel}`}>
						<SelectValue placeholder="Choose product" />
					</SelectTrigger>
					<SelectContent>
						{products.map((component) => (
							<SelectItem key={component.uid} value={String(component.uid)}>
								{String(component.title || component.uid)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					type="button"
					disabled={
						props.disabled ||
						!products.some((product) => product.uid === selected) ||
						query.isPending ||
						query.isError
					}
					onClick={() => props.onChoose(selected)}
				>
					Use product
				</Button>
			</div>
			{open && query.isPending ? (
				<p role="status" className="text-sm">
					Loading products…
				</p>
			) : null}
			{query.isError ? (
				<Button
					type="button"
					variant="ghost"
					onClick={() => void query.refetch()}
				>
					Retry products
				</Button>
			) : null}
		</div>
	);
}
