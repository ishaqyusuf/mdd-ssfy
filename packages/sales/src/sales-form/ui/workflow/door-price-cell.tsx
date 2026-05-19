"use client";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useEffect, useState } from "react";
import { profileAdjustedDoorSalesPrice } from "./door-pricing";

export type DoorPriceRow = {
	dimension?: string | null;
	unitPrice?: number | null;
	lhQty?: number | null;
	rhQty?: number | null;
	totalQty?: number | null;
	lineTotal?: number | null;
	meta?: {
		baseUnitPrice?: number | null;
		priceMissing?: boolean | null;
		[key: string]: unknown;
	} | null;
	[key: string]: unknown;
};

function toNumber(value: unknown, fallback = 0) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

function firstFiniteNumber(...values: Array<number | null | undefined>) {
	for (const value of values) {
		const candidate = Number(value);
		if (Number.isFinite(candidate)) return candidate;
	}
	return null;
}

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function calcDoorRow<T extends DoorPriceRow>(row: T): T {
	const lhQty = toNumber(row.lhQty, 0);
	const rhQty = toNumber(row.rhQty, 0);
	const totalInput = toNumber(row.totalQty, 0);
	const unitPrice = toNumber(row.unitPrice, 0);
	const totalQty = lhQty + rhQty > 0 ? lhQty + rhQty : totalInput;
	return {
		...row,
		lhQty,
		rhQty,
		unitPrice,
		totalQty,
		lineTotal: Number((totalQty * unitPrice).toFixed(2)),
	};
}

function feetInchToInches(value: string) {
	const [feetPart, inchPart = "0"] = value.split("-");
	const feet = Number(feetPart || 0);
	const inches = Number(inchPart || 0);
	if (!Number.isFinite(feet) || !Number.isFinite(inches)) return "";
	return `${feet * 12 + inches}"`;
}

export function formatDoorSizeTitle(size?: string | null) {
	const [width, height] = String(size || "").split(" x ");
	const widthIn = width ? feetInchToInches(width.trim()) : "";
	const heightIn = height ? feetInchToInches(height.trim()) : "";
	if (!widthIn || !heightIn) return String(size || "--");
	return `${widthIn} x ${heightIn}`;
}

export function updateDoorRowBasePrice<T extends DoorPriceRow>(
	row: T,
	nextBase: number,
	profileCoefficient?: number | null,
) {
	const normalizedNextBase = Math.max(0, nextBase);
	const priorBase = firstFiniteNumber(row.meta?.baseUnitPrice);
	const priorCalculatedSales =
		priorBase == null
			? toNumber(row.unitPrice, 0)
			: profileAdjustedDoorSalesPrice(null, priorBase, profileCoefficient);
	const surcharge = Number(
		(toNumber(row.unitPrice, 0) - priorCalculatedSales).toFixed(2),
	);
	const nextCalculatedSales = profileAdjustedDoorSalesPrice(
		null,
		normalizedNextBase,
		profileCoefficient,
	);
	return calcDoorRow({
		...row,
		unitPrice: Number((nextCalculatedSales + surcharge).toFixed(2)),
		meta: {
			...(row.meta || {}),
			baseUnitPrice: normalizedNextBase,
			priceMissing: false,
		},
	});
}

export function DoorPriceCell({
	row,
	onSave,
	profileCoefficient,
}: {
	row: DoorPriceRow;
	onSave: (nextBase: number) => void;
	profileCoefficient?: number | null;
}) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const baseUnit = firstFiniteNumber(row.meta?.baseUnitPrice);
	const hasStoredBasePrice = baseUnit != null;
	const isMissingPrice = Boolean(row.meta?.priceMissing);
	const doorSalesPrice = hasStoredBasePrice
		? profileAdjustedDoorSalesPrice(null, baseUnit, profileCoefficient)
		: toNumber(row.unitPrice, 0);

	useEffect(() => {
		setDraft(
			isMissingPrice || !hasStoredBasePrice || !baseUnit
				? ""
				: String(baseUnit),
		);
	}, [baseUnit, hasStoredBasePrice, isMissingPrice, open]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant={
						isMissingPrice
							? "destructive"
							: Number(row.unitPrice || 0) > 0
								? "outline"
								: "secondary"
					}
					className="h-10 w-full min-w-[116px] flex-col items-start gap-0 rounded-xl border-slate-300 px-3 py-2 text-left"
				>
					<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
						{isMissingPrice ? "Missing" : "Price"}
					</span>
					<span className="text-sm font-semibold text-foreground">
						{isMissingPrice ? "Add Price" : currency(row.unitPrice)}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 space-y-3 p-4">
				<div className="space-y-1">
					<p className="text-sm font-semibold text-foreground">
						{isMissingPrice || !hasStoredBasePrice
							? "Set Base Price"
							: "Edit Base Price"}
					</p>
					<p className="text-xs text-muted-foreground">
						Final price keeps the current surcharge delta and updates from this
						base.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`door-base-${row.dimension || "row"}`}>
						Base Price
					</Label>
					<Input
						id={`door-base-${row.dimension || "row"}`}
						type="number"
						step="0.01"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
					/>
				</div>
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>Door sales price</span>
					<span className="font-semibold text-foreground">
						{currency(doorSalesPrice)}
					</span>
				</div>
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={() => {
							const nextBase = toNumber(draft, Number.NaN);
							if (!Number.isFinite(nextBase) || nextBase < 0) return;
							onSave(nextBase);
							setOpen(false);
						}}
					>
						Save
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
