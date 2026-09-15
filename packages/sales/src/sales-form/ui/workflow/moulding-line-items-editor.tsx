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
import { ComponentImageLightbox } from "./component-image-lightbox";
import {
	type CostPriceBreakdownContext,
	CostPriceBreakdownHover,
} from "./cost-price-breakdown-hover";
import { SalesFormQuantityStepper } from "./sales-form-quantity-stepper";
import { ResponsiveEstimateBreakdown } from "./responsive-estimate-breakdown";

export type MouldingLineItemEditorRow = {
	uid?: string | null;
	title?: string | null;
	img?: string | null;
	qty?: number | null;
	calculation?: { linearFeet: number; pieceLength: number; wastePercentage?: number };
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
		onCalculate: (qty: number, calculation?: { linearFeet: number; pieceLength: number; wastePercentage?: number }) => void;
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
		<ResponsiveEstimateBreakdown
			title="Cost estimate breakdown"
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
			<Card className="w-[320px] rounded-lg text-left max-lg:w-full max-lg:border-0 max-lg:shadow-none">
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
		</ResponsiveEstimateBreakdown>
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
		<div className="overflow-x-auto rounded-lg border max-lg:overflow-visible max-lg:rounded-none max-lg:border-0">
			<table className="w-full min-w-[620px] text-sm max-lg:min-w-0">
				<thead className="max-lg:hidden">
					<tr className="bg-muted/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						<th className="px-3 py-2">Moulding</th>
						<th className="px-3 py-2 text-right">Qty</th>
						<th className="px-3 py-2 text-right">Estimate</th>
						<th className="px-3 py-2 text-right">Line Total</th>
						<th className="px-3 py-2 text-right">Remove</th>
					</tr>
				</thead>
				<tbody className="max-lg:grid">
					{props.rows.map((row, index) => {
						const rowImageSrc = props.resolveImageSrc(row.img || null);
						const rowTitle = props.componentLabel(row.title);
						const qty = Number(row.qty || 0);
						const lineBreakdown = {
							costPrice: multiplyMoney(Number(row.basePrice || 0), qty),
							unitCostPrice: row.basePrice,
							quantity: qty,
							displayPrice: row.lineTotal,
						};

						return (
							<tr
								key={`moulding-row-${row.uid}-${index}`}
								className="border-t max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-2 max-lg:gap-y-3 max-lg:border-x-0 max-lg:border-t-0 max-lg:border-b max-lg:border-border max-lg:bg-transparent max-lg:p-3 max-lg:last:border-b-0 md:max-lg:grid-cols-3"
							>
								<td className="px-3 py-2 max-lg:col-span-1 max-lg:col-start-1 max-lg:row-start-1 max-lg:p-0 md:max-lg:col-span-2">
									<div className="flex items-center gap-3">
										<ComponentImageLightbox
											imageSrc={rowImageSrc}
											title={rowTitle || "Moulding"}
											alt={row.title || "Moulding"}
											className="size-14 rounded-lg bg-white max-lg:size-12 max-lg:shrink-0"
											imageClassName="p-3"
											fallback={
												<Icons.Ruler className="size-4 text-muted-foreground" />
											}
										/>
										<p className="text-xs font-semibold uppercase">
											{rowTitle}
										</p>
									</div>
								</td>
								<td className="px-3 py-2 max-lg:col-span-2 max-lg:col-start-1 max-lg:row-start-2 max-lg:p-0 md:max-lg:col-span-1">
									<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">Quantity</p>
									{row.quantityReview === true && qty <= 0 && (
										<p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">Quantity needs review</p>
									)}
									<div className="flex items-center justify-end gap-2 max-lg:justify-start">
										{props.renderCalculator?.({
											row,
											index,
											onCalculate: (qty, calculation) =>
												patchRow(index, {
													qty: Number(qty || 0),
													...(calculation ? { calculation } : {}),
												} as Partial<TRow>),
										})}
										<SalesFormQuantityStepper
											label={`Moulding line ${index + 1} quantity`}
											value={row.qty}
											min={row.quantityReview === true ? 0 : 1}
											onChange={(value) =>
												patchRow(index, {
													qty: value,
												} as Partial<TRow>)
											}
											className="w-32 max-lg:h-10 max-lg:flex-1"
										/>
									</div>
								</td>
								<td className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground max-lg:col-start-1 max-lg:row-start-3 max-lg:border-t max-lg:pt-3 max-lg:text-left md:max-lg:col-start-2 md:max-lg:row-start-2 md:max-lg:border-t-0 md:max-lg:pt-0">
									<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">Estimate</p>
									<div className="flex justify-end max-lg:justify-start">
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
									</div>
								</td>
								<td className="px-3 py-2 text-right text-xs font-bold max-lg:col-start-2 max-lg:row-start-3 max-lg:border-t max-lg:pt-3 md:max-lg:col-start-3 md:max-lg:row-start-2 md:max-lg:border-t-0 md:max-lg:pt-0">
									<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">Line total</p>
									<CostPriceBreakdownHover
										breakdown={lineBreakdown}
										context={props.priceBreakdown}
									>
										<span>{props.formatMoney(row.lineTotal) || "$0.00"}</span>
									</CostPriceBreakdownHover>
								</td>
								<td className="px-3 py-2 text-right max-lg:col-start-2 max-lg:row-start-1 max-lg:flex max-lg:justify-end max-lg:p-0 md:max-lg:col-start-3">
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="size-7 max-lg:size-10"
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
				<tfoot className="max-lg:block">
					<tr className="border-t bg-muted/20 text-xs font-bold max-lg:block">
						<td className="px-3 py-2 uppercase max-lg:inline-block">Total</td>
						<td className="px-3 py-2 text-right max-lg:inline-block">{props.totalQty}</td>
						<td className="max-lg:hidden" />
						<td className="px-3 py-2 text-right max-lg:float-right">
							{props.formatMoney(props.totalAmount) || "$0.00"}
						</td>
						<td className="max-lg:hidden" />
					</tr>
				</tfoot>
			</table>
		</div>
	);
}
