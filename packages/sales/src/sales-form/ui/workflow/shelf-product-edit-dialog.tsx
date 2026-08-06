/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { useState } from "react";
import type { ShelfProductOption } from "./workflow-records";

export type ShelfProductEditInput = {
	id: number;
	title: string;
	unitPrice: number | null;
};

export function ShelfProductEditDialog(props: {
	product: ShelfProductOption;
	isSaving?: boolean;
	error?: string | null;
	onCancel: () => void;
	onSave: (input: ShelfProductEditInput) => void;
}) {
	const [title, setTitle] = useState(String(props.product.title || ""));
	const [costPrice, setCostPrice] = useState(
		props.product.unitPrice == null ? "" : String(props.product.unitPrice),
	);
	const trimmedTitle = title.trim();
	const trimmedCostPrice = costPrice.trim();
	const parsedCostPrice = trimmedCostPrice ? Number(trimmedCostPrice) : null;
	const hasValidCostPrice =
		parsedCostPrice == null ||
		(Number.isFinite(parsedCostPrice) && parsedCostPrice >= 0);
	const canSave =
		Boolean(trimmedTitle) && hasValidCostPrice && !props.isSaving;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !props.isSaving) props.onCancel();
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit shelf product</DialogTitle>
					<DialogDescription>
						Update the catalog name and cost price. Selected rows using this
						product will be repriced from the new cost.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-1">
					<div className="grid gap-1.5">
						<Label htmlFor="shelf-product-edit-title">Product name</Label>
						<Input
							id="shelf-product-edit-title"
							value={title}
							disabled={props.isSaving}
							onChange={(event) => setTitle(event.target.value)}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="shelf-product-edit-cost-price">Cost price</Label>
						<Input
							id="shelf-product-edit-cost-price"
							type="number"
							inputMode="decimal"
							min={0}
							step="0.01"
							value={costPrice}
							disabled={props.isSaving}
							onChange={(event) => setCostPrice(event.target.value)}
						/>
						{!hasValidCostPrice ? (
							<p className="text-xs text-destructive">
								Enter a valid non-negative cost price.
							</p>
						) : null}
					</div>
					{props.error ? (
						<p role="alert" className="text-sm text-destructive">
							{props.error}
						</p>
					) : null}
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={props.isSaving}
						onClick={props.onCancel}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={!canSave}
						onClick={() =>
							props.onSave({
								id: Number(props.product.id || 0),
								title: trimmedTitle,
								unitPrice: parsedCostPrice,
							})
						}
					>
						{props.isSaving ? "Saving..." : "Save product"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
