/** @jsxImportSource react */
"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Menu } from "@gnd/ui/custom/menu";
import { Field, FieldGroup, FieldTitle } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@gnd/ui/input-group";
import { Separator } from "@gnd/ui/separator";
import type { ReactNode } from "react";
import { multiplyMoney } from "../../../payment-system/domain/money";
import {
	type CostPriceBreakdownContext,
	CostPriceBreakdownHover,
} from "./cost-price-breakdown-hover";
import { SalesFormQuantityStepper } from "./sales-form-quantity-stepper";

export type MouldingLineItemEditorRow = {
	uid?: string | null;
	title?: string | null;
	img?: string | null;
	qty?: number | null;
	addon?: number | null;
	customPrice?: number | string | null;
	estimateUnit?: number | null;
	basePrice?: number | null;
	salesPrice?: number | null;
	unit?: number | null;
	lineTotal?: number | null;
	[key: string]: unknown;
};

export type MouldingLineItemsEditorProps<
	TRow extends MouldingLineItemEditorRow,
> = {
	rows: TRow[];
	totalQty: number;
	totalAmount: number;
	formatMoney: (value?: number | null) => string | null;
	componentLabel: (value?: string | null) => string;
	resolveImageSrc: (src?: string | null) => string | null;
	renderCalculator?: (args: {
		row: TRow;
		index: number;
		onCalculate: (qty: number) => void;
	}) => ReactNode;
	canEditPricing?: boolean;
	priceBreakdown?: CostPriceBreakdownContext | null;
	onRowsChange: (rows: TRow[]) => void;
	onRemoveRow: (uid: string) => void;
};

function MouldingEstimateBreakdown<TRow extends MouldingLineItemEditorRow>(
	props: {
		row: TRow;
		index: number;
		quantity: number;
		canEditPricing: boolean;
		formatMoney: (value?: number | null) => string | null;
		componentLabel: (value?: string | null) => string;
		priceBreakdown?: CostPriceBreakdownContext | null;
		onPatch: (patch: Partial<TRow>) => void;
	},
) {
	const hasCustomPrice =
		props.row.customPrice != null && props.row.customPrice !== "";
	const estimatedUnit = Number(props.row.estimateUnit || 0);
	const addon = Number(props.row.addon || 0);
	const customPrice = hasCustomPrice ? Number(props.row.customPrice || 0) : null;
	const finalUnit = Number(
		props.row.unit ?? (customPrice ?? estimatedUnit) + addon,
	);

	return (
		<Menu
			noSize
			Icon={null}
			label={
				<span
					className="cursor-pointer underline decoration-dotted underline-offset-2"
					aria-label={`Open cost estimate breakdown for moulding line ${props.index + 1}`}
				>
					<CostPriceBreakdownHover
						breakdown={{
							costPrice: props.row.basePrice,
							displayPrice: props.row.estimateUnit,
						}}
						context={props.priceBreakdown}
					>
						<span>{props.formatMoney(props.row.estimateUnit) || "$0.00"}</span>
					</CostPriceBreakdownHover>
				</span>
			}
		>
			<Card className="w-[320px] rounded-lg text-left">
				<CardHeader className="flex-row items-start justify-between gap-3 p-3">
					<div className="min-w-0">
						<CardTitle>Cost estimate breakdown</CardTitle>
						<CardDescription className="truncate">
							{props.componentLabel(props.row.title)}
						</CardDescription>
					</div>
					<Badge variant="secondary">Qty {props.quantity}</Badge>
				</CardHeader>
				<CardContent className="flex flex-col gap-3 p-3 pt-0">
					<dl className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between gap-4">
							<dt className="text-muted-foreground">Estimate</dt>
							<dd className="font-medium">
								{props.formatMoney(props.row.estimateUnit) || "$0.00"}
							</dd>
						</div>
					</dl>
					<Separator />
					<FieldGroup className="gap-2">
						<Field orientation="horizontal" className="gap-2">
							<FieldTitle>Addon/Qty</FieldTitle>
							{props.canEditPricing ? (
								<InputGroup className="h-8 w-28">
									<InputGroupAddon>
										<InputGroupText>$</InputGroupText>
									</InputGroupAddon>
									<InputGroupInput
										aria-label={`Moulding line ${props.index + 1} addon per quantity`}
										type="number"
										step="0.01"
										value={props.row.addon || 0}
										onChange={(event) =>
											props.onPatch({
												addon: Number(event.target.value || 0),
											} as Partial<TRow>)
										}
										className="text-right"
									/>
								</InputGroup>
							) : (
								<span className="font-medium">
									{props.formatMoney(addon) || "$0.00"}
								</span>
							)}
						</Field>
						<Field orientation="horizontal" className="gap-2">
							<FieldTitle>Custom Price</FieldTitle>
							{props.canEditPricing ? (
								<InputGroup className="h-8 w-28">
									<InputGroupAddon>
										<InputGroupText>$</InputGroupText>
									</InputGroupAddon>
									<InputGroupInput
										aria-label={`Moulding line ${props.index + 1} custom price`}
										type="number"
										step="0.01"
										value={props.row.customPrice ?? ""}
										onChange={(event) =>
											props.onPatch({
												customPrice:
													event.target.value === ""
														? null
														: Number(event.target.value || 0),
											} as Partial<TRow>)
										}
										className="text-right"
										placeholder="auto"
									/>
								</InputGroup>
							) : (
								<span className="font-medium">
									{hasCustomPrice
										? props.formatMoney(customPrice) || "$0.00"
										: "Auto"}
								</span>
							)}
						</Field>
					</FieldGroup>
					<Separator />
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2">
							<span className="font-medium">Final unit</span>
							{hasCustomPrice ? <Badge variant="outline">Custom</Badge> : null}
						</div>
						<span className="font-semibold">
							{props.formatMoney(finalUnit) || "$0.00"}
						</span>
					</div>
				</CardContent>
				<CardFooter className="justify-between p-3">
					<span>Line total</span>
					<span className="font-semibold text-foreground">
						{props.formatMoney(props.row.lineTotal) || "$0.00"}
					</span>
				</CardFooter>
			</Card>
		</Menu>
	);
}

export function MouldingLineItemsEditor<TRow extends MouldingLineItemEditorRow>(
	props: MouldingLineItemsEditorProps<TRow>,
) {
	const canEditPricing = props.canEditPricing !== false;

	function patchRow(index: number, patch: Partial<TRow>) {
		props.onRowsChange(
			props.rows.map((item, i) =>
				i === index
					? {
							...item,
							...patch,
						}
					: item,
			),
		);
	}

	if (!props.rows.length) {
		return (
			<p className="text-sm text-muted-foreground">
				No selected mouldings yet. Select mouldings in the Moulding step.
			</p>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border">
			<table className="min-w-[620px] text-sm">
				<thead>
					<tr className="bg-muted/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						<th className="px-3 py-2">Moulding</th>
						<th className="px-3 py-2 text-right">Qty</th>
						<th className="px-3 py-2 text-right">Estimate</th>
						<th className="px-3 py-2 text-right">Line Total</th>
						<th className="px-3 py-2 text-right">Remove</th>
					</tr>
				</thead>
				<tbody>
					{props.rows.map((row, index) => {
						const rowImageSrc = props.resolveImageSrc(row.img || null);
						const qty = Number(row.qty || 0);
						const lineBreakdown = {
							costPrice: multiplyMoney(Number(row.basePrice || 0), qty),
							unitCostPrice: row.basePrice,
							quantity: qty,
							displayPrice: row.lineTotal,
						};

						return (
							<tr key={`moulding-row-${row.uid}-${index}`} className="border-t">
								<td className="px-3 py-2">
									<div className="flex items-center gap-3">
										<div className="group flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
											{rowImageSrc ? (
												<img
													src={rowImageSrc}
													alt={row.title || "Moulding"}
													className="h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-90"
												/>
											) : (
												<Icons.Ruler className="size-4 text-muted-foreground" />
											)}
										</div>
										<p className="text-xs font-semibold uppercase">
											{props.componentLabel(row.title)}
										</p>
									</div>
								</td>
								<td className="px-3 py-2">
									<div className="flex items-center justify-end gap-2">
										{props.renderCalculator?.({
											row,
											index,
											onCalculate: (qty) =>
												patchRow(index, {
													qty: Number(qty || 0),
												} as Partial<TRow>),
										})}
										<SalesFormQuantityStepper
											label={`Moulding line ${index + 1} quantity`}
											value={row.qty}
											min={1}
											onChange={(value) =>
												patchRow(index, {
													qty: value,
												} as Partial<TRow>)
											}
											className="w-32"
										/>
									</div>
								</td>
								<td className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
									<MouldingEstimateBreakdown
										row={row}
										index={index}
										quantity={qty}
										canEditPricing={canEditPricing}
										formatMoney={props.formatMoney}
										componentLabel={props.componentLabel}
										priceBreakdown={props.priceBreakdown}
										onPatch={(patch) => patchRow(index, patch)}
									/>
								</td>
								<td className="px-3 py-2 text-right text-xs font-bold">
									<CostPriceBreakdownHover
										breakdown={lineBreakdown}
										context={props.priceBreakdown}
									>
										<span>{props.formatMoney(row.lineTotal) || "$0.00"}</span>
									</CostPriceBreakdownHover>
								</td>
								<td className="px-3 py-2 text-right">
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="size-7"
										disabled={props.rows.length <= 1}
										aria-label={`Remove moulding line ${index + 1}`}
										onClick={() => props.onRemoveRow(String(row.uid || ""))}
									>
										<Icons.Trash2 className="size-4" />
									</Button>
								</td>
							</tr>
						);
					})}
				</tbody>
				<tfoot>
					<tr className="border-t bg-muted/20 text-xs font-bold">
						<td className="px-3 py-2 uppercase">Total</td>
						<td className="px-3 py-2 text-right">{props.totalQty}</td>
						<td />
						<td className="px-3 py-2 text-right">
							{props.formatMoney(props.totalAmount) || "$0.00"}
						</td>
						<td />
					</tr>
				</tfoot>
			</table>
		</div>
	);
}
