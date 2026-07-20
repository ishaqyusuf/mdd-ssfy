/** @jsxImportSource react */
"use client";

import type { ReactNode } from "react";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	CostPriceBreakdownHover,
	type CostPriceBreakdownContext,
} from "./cost-price-breakdown-hover";
import { multiplyMoney } from "../../../payment-system/domain/money";

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
			<table className="min-w-[760px] text-sm">
				<thead>
					<tr className="bg-muted/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						<th className="px-3 py-2">Moulding</th>
						<th className="px-3 py-2 text-right">Qty</th>
						<th className="px-3 py-2 text-right">Estimate</th>
						<th className="px-3 py-2 text-right">Addon/Qty</th>
						<th className="px-3 py-2 text-right">Custom</th>
						<th className="px-3 py-2 text-right">Line Total</th>
						<th className="px-3 py-2 text-right">Remove</th>
					</tr>
				</thead>
				<tbody>
					{props.rows.map((row, index) => {
						const rowImageSrc = props.resolveImageSrc(row.img || null);
						const unitBreakdown = {
							costPrice: row.basePrice,
							displayPrice: row.estimateUnit,
						};
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
										<Input
											aria-label={`Moulding line ${index + 1} quantity`}
											type="number"
											value={row.qty || 0}
											onChange={(e) =>
												patchRow(index, {
													qty: Number(e.target.value || 0),
												} as Partial<TRow>)
											}
											className="h-8 w-20 text-right"
										/>
									</div>
								</td>
								<td className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
									<CostPriceBreakdownHover
										breakdown={unitBreakdown}
										context={props.priceBreakdown}
									>
										<span>
											{props.formatMoney(row.estimateUnit) || "$0.00"}
										</span>
									</CostPriceBreakdownHover>
								</td>
								<td className="px-3 py-2">
									{canEditPricing ? (
										<Input
											aria-label={`Moulding line ${index + 1} addon per quantity`}
											type="number"
											step="0.01"
											value={row.addon || 0}
											onChange={(e) =>
												patchRow(index, {
													addon: Number(e.target.value || 0),
												} as Partial<TRow>)
											}
											className="h-8 text-right"
										/>
									) : (
										<p className="text-right text-xs font-semibold">
											{props.formatMoney(row.addon || 0) || "$0.00"}
										</p>
									)}
								</td>
								<td className="px-3 py-2">
									{canEditPricing ? (
										<Input
											aria-label={`Moulding line ${index + 1} custom price`}
											type="number"
											step="0.01"
											value={row.customPrice ?? ""}
											onChange={(e) =>
												patchRow(index, {
													customPrice:
														e.target.value === ""
															? null
															: Number(e.target.value || 0),
												} as Partial<TRow>)
											}
											className="h-8 text-right"
											placeholder="auto"
										/>
									) : (
										<p className="text-right text-xs font-semibold">
											{row.customPrice == null || row.customPrice === ""
												? "Auto"
												: props.formatMoney(Number(row.customPrice || 0)) ||
													"$0.00"}
										</p>
									)}
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
						<td />
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
