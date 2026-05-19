"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";

import type { SalesFormLineItemRecord } from "../../../application";
import {
	deriveDoorSizeCandidates,
	hasDoorSizeVariationConfig,
	resolveDoorTierPricing,
} from "../../../domain";
import {
	DoorPriceCell,
	formatDoorSizeTitle,
	updateDoorRowBasePrice,
} from "../door-price-cell";
import { profileAdjustedDoorSalesPrice } from "../door-pricing";

type DoorLine = NonNullable<
	NonNullable<SalesFormLineItemRecord["housePackageTool"]>["doors"]
>[number];

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

function calcDoorRow(row: DoorLine): DoorLine {
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

function blankDoorRow(): DoorLine {
	return {
		id: null,
		dimension: "",
		swing: "",
		doorType: "",
		doorPrice: 0,
		jambSizePrice: 0,
		casingPrice: 0,
		unitPrice: 0,
		lhQty: 0,
		rhQty: 0,
		totalQty: 0,
		lineTotal: 0,
		stepProductId: null,
		meta: {},
	};
}

interface DoorSizeQtyDialogProps {
	open: boolean;
	onOpenChange: (next: boolean) => void;
	line: SalesFormLineItemRecord;
	routeData?: any;
	component: {
		id?: number | null;
		uid?: string | null;
		title?: string | null;
		salesPrice?: number | null;
		basePrice?: number | null;
		pricing?: Record<string, { id?: number; price?: number | null }>;
		supplierVariants?: unknown[];
	} | null;
	supplierUid?: string | null;
	supplierName?: string | null;
	suppliers?: Array<{
		uid: string;
		name: string;
	}>;
	onSupplierChange?: (supplierUid: string | null) => void;
	profileCoefficient?: number | null;
	routeConfig?: {
		noHandle?: boolean;
		hasSwing?: boolean;
	} | null;
	onRemoveSelection?: () => void;
	onNextStep?: () => void;
	onApply: (payload: { rows: DoorLine[]; selected: boolean }) => void;
}

function rowsForComponent(
	line: SalesFormLineItemRecord,
	componentId: number | null,
) {
	const rows = (line.housePackageTool?.doors || [])
		.filter(
			(door) => Number(door.stepProductId || 0) === Number(componentId || 0),
		)
		.map(calcDoorRow);
	return rows;
}
function deriveDoorSizeRows(
	line: SalesFormLineItemRecord,
	existingRows: DoorLine[],
	component: DoorSizeQtyDialogProps["component"],
	routeData?: any,
	supplierUid?: string | null,
	profileCoefficient?: number | null,
) {
	const bySize = new Map<string, DoorLine>();
	existingRows.forEach((row) => {
		if (row.dimension) bySize.set(String(row.dimension).trim(), row);
	});
	const pricing = component?.pricing || {};
	const usesVariantFiltering = hasDoorSizeVariationConfig(line, routeData);
	const candidateSizes = deriveDoorSizeCandidates(line, pricing, routeData);
	if (!candidateSizes.length) {
		if (existingRows.length && !usesVariantFiltering) return existingRows;
		if (usesVariantFiltering) return [];
		const fallbackBase =
			firstFiniteNumber(component?.basePrice, component?.salesPrice) ?? 0;
		return [
			calcDoorRow({
				...blankDoorRow(),
				stepProductId: component?.id || null,
				unitPrice: profileAdjustedDoorSalesPrice(
					component?.salesPrice,
					component?.basePrice,
					profileCoefficient,
				),
				meta: {
					baseUnitPrice: fallbackBase,
				},
			}),
		];
	}

	return candidateSizes.map((size) => {
		const normalizedSize = String(size).trim();
		const existing = bySize.get(normalizedSize);
		const pricingPair = resolveDoorTierPricing({
			pricing,
			size: normalizedSize,
			supplierUid,
			supplierVariants: component?.supplierVariants || [],
			salesMultiplier:
				Number.isFinite(Number(profileCoefficient || 0)) &&
				Number(profileCoefficient || 0) > 0
					? Number((1 / Number(profileCoefficient || 0)).toFixed(2))
					: 1,
			fallbackSalesPrice: component?.salesPrice,
			fallbackBasePrice: component?.basePrice,
		});
		const hasResolvedPrice = Boolean(pricingPair.hasPrice);
		const rowBaseUnit = firstFiniteNumber(
			hasResolvedPrice ? pricingPair.basePrice : null,
			hasResolvedPrice ? component?.basePrice : null,
			hasResolvedPrice ? component?.salesPrice : null,
		);
		const unitPrice = hasResolvedPrice
			? (firstFiniteNumber(
					profileAdjustedDoorSalesPrice(
						pricingPair.salesPrice,
						pricingPair.basePrice,
						profileCoefficient,
					),
					component?.salesPrice,
					component?.basePrice,
				) ?? 0)
			: 0;
		return calcDoorRow({
			...(existing || blankDoorRow()),
			dimension: normalizedSize,
			stepProductId: component?.id || existing?.stepProductId || null,
			unitPrice,
			meta: {
				...((existing as any)?.meta || {}),
				priceMissing: !hasResolvedPrice,
				baseUnitPrice: rowBaseUnit ?? 0,
			},
		});
	});
}

export function DoorSizeQtyDialog(props: DoorSizeQtyDialogProps) {
	const [rows, setRows] = useState<DoorLine[]>([]);

	useEffect(() => {
		if (!props.open || !props.component) return;
		const existing = rowsForComponent(props.line, props.component.id ?? null);
		const nextRows = deriveDoorSizeRows(
			props.line,
			existing,
			props.component,
			props.routeData,
			props.supplierUid,
			props.profileCoefficient,
		);
		setRows(nextRows);
	}, [
		props.open,
		props.component,
		props.line,
		props.profileCoefficient,
		props.supplierUid,
	]);

	const totals = useMemo(() => {
		const normalized = rows.map((row) =>
			calcDoorRow({
				...row,
				stepProductId: props.component?.id || row.stepProductId || null,
			}),
		);
		const totalDoors = normalized.reduce(
			(sum, row) => sum + toNumber(row.totalQty),
			0,
		);
		const totalPrice = normalized.reduce(
			(sum, row) => sum + toNumber(row.lineTotal),
			0,
		);
		return {
			normalized,
			totalDoors,
			totalPrice: Number(totalPrice.toFixed(2)),
		};
	}, [rows, props.component]);

	if (!props.component) return null;

	function persistSelection(nextRows = totals.normalized, selected = true) {
		const persistedRows = nextRows.filter(
			(row) => selected && Number(row.totalQty || 0) > 0,
		);
		props.onApply({
			rows: persistedRows,
			selected: selected && persistedRows.length > 0,
		});
	}

	function qtyInputValue(value?: number | null) {
		return Number(value || 0) > 0 ? String(Number(value || 0)) : "";
	}

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="max-w-[720px] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
				<DialogHeader className="border-b bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5">
					<DialogTitle>
						{props.component.title || "Door"} Size Select
					</DialogTitle>
					<DialogDescription>
						Select size, price, and quantity for this door option.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 px-4 py-4 sm:px-5">
					<div className="flex flex-col gap-3 rounded-xl border bg-slate-50/70 p-3 sm:flex-row sm:items-end sm:justify-between">
						<div className="space-y-1">
							<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
								Door Supplier
							</p>
							<p className="text-sm font-semibold text-foreground">
								{props.supplierName || "GND MILLWORK"}
							</p>
						</div>
						<div className="w-full sm:w-[260px]">
							<Select
								value={props.supplierUid || "default"}
								onValueChange={(value) =>
									props.onSupplierChange?.(value === "default" ? null : value)
								}
							>
								<SelectTrigger className="h-10 rounded-xl bg-white text-sm font-medium">
									<SelectValue placeholder="Select supplier" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="default">
										GND MILLWORK (Default)
									</SelectItem>
									{(props.suppliers || []).map((supplier) => (
										<SelectItem key={supplier.uid} value={supplier.uid}>
											{supplier.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="md:hidden space-y-3">
						{rows.map((row, index) => (
							<div
								key={`door-size-card-${index}`}
								className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
											Size
										</p>
										<p className="text-sm font-semibold text-foreground">
											{formatDoorSizeTitle(row.dimension)}
										</p>
										<p className="text-xs text-muted-foreground">
											{row.dimension || "--"}
										</p>
									</div>
									<div className="min-w-[120px]">
										<DoorPriceCell
											row={row}
											profileCoefficient={props.profileCoefficient}
											onSave={(nextBase) =>
												setRows((prev) =>
													prev.map((item, ri) =>
														ri === index
															? updateDoorRowBasePrice(
																	item,
																	nextBase,
																	props.profileCoefficient,
																)
															: item,
													),
												)
											}
										/>
									</div>
								</div>
								{props.routeConfig?.hasSwing ? (
									<div className="space-y-2">
										<Label>Swing</Label>
										<Input
											value={row.swing || ""}
											onChange={(e) =>
												setRows((prev) =>
													prev.map((item, ri) =>
														ri === index
															? {
																	...item,
																	swing: e.target.value,
																}
															: item,
													),
												)
											}
											placeholder="LH/RH"
										/>
									</div>
								) : null}
								{props.routeConfig?.noHandle ? (
									<div className="space-y-2">
										<Label>Qty</Label>
										<Input
											type="number"
											value={qtyInputValue(row.totalQty)}
											onChange={(e) =>
												setRows((prev) =>
													prev.map((item, ri) =>
														ri === index
															? calcDoorRow({
																	...item,
																	totalQty: toNumber(e.target.value, 0),
																	lhQty: 0,
																	rhQty: 0,
																})
															: item,
													),
												)
											}
										/>
									</div>
								) : (
									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-2">
											<Label>LH</Label>
											<Input
												type="number"
												value={qtyInputValue(row.lhQty)}
												onChange={(e) =>
													setRows((prev) =>
														prev.map((item, ri) =>
															ri === index
																? calcDoorRow({
																		...item,
																		lhQty: toNumber(e.target.value, 0),
																	})
																: item,
														),
													)
												}
											/>
										</div>
										<div className="space-y-2">
											<Label>RH</Label>
											<Input
												type="number"
												value={qtyInputValue(row.rhQty)}
												onChange={(e) =>
													setRows((prev) =>
														prev.map((item, ri) =>
															ri === index
																? calcDoorRow({
																		...item,
																		rhQty: toNumber(e.target.value, 0),
																	})
																: item,
														),
													)
												}
											/>
										</div>
									</div>
								)}
							</div>
						))}
					</div>

					<div className="hidden max-h-[52vh] overflow-auto rounded-2xl border md:block">
						<table className="min-w-full text-sm">
							<thead className="bg-slate-50">
								<tr className="text-left text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
									<th className="px-4 py-3">Size</th>
									<th className="px-4 py-3">Price</th>
									{props.routeConfig?.hasSwing ? (
										<th className="px-4 py-3">Swing</th>
									) : null}
									{props.routeConfig?.noHandle ? (
										<th className="px-4 py-3">Qty</th>
									) : (
										<>
											<th className="px-4 py-3">LH</th>
											<th className="px-4 py-3">RH</th>
										</>
									)}
									<th className="px-4 py-3 text-right">Line Total</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row, index) => (
									<tr key={`door-size-row-${index}`} className="border-t">
										<td className="px-4 py-3">
											<div className="space-y-1">
												<p className="font-semibold text-foreground">
													{formatDoorSizeTitle(row.dimension)}
												</p>
												<p className="text-xs text-muted-foreground">
													{row.dimension || "--"}
												</p>
											</div>
										</td>
										<td className="px-4 py-3">
											<DoorPriceCell
												row={row}
												profileCoefficient={props.profileCoefficient}
												onSave={(nextBase) =>
													setRows((prev) =>
														prev.map((item, ri) =>
															ri === index
																? updateDoorRowBasePrice(
																		item,
																		nextBase,
																		props.profileCoefficient,
																	)
																: item,
														),
													)
												}
											/>
										</td>
										{props.routeConfig?.hasSwing ? (
											<td className="px-4 py-3">
												<Input
													value={row.swing || ""}
													onChange={(e) =>
														setRows((prev) =>
															prev.map((item, ri) =>
																ri === index
																	? {
																			...item,
																			swing: e.target.value,
																		}
																	: item,
															),
														)
													}
													placeholder="LH/RH"
													className="h-10 rounded-xl"
												/>
											</td>
										) : null}
										{props.routeConfig?.noHandle ? (
											<td className="px-4 py-3">
												<Input
													type="number"
													value={qtyInputValue(row.totalQty)}
													onChange={(e) =>
														setRows((prev) =>
															prev.map((item, ri) =>
																ri === index
																	? calcDoorRow({
																			...item,
																			totalQty: toNumber(e.target.value, 0),
																			lhQty: 0,
																			rhQty: 0,
																		})
																	: item,
															),
														)
													}
													className="h-10 w-24 rounded-xl text-right"
												/>
											</td>
										) : (
											<>
												<td className="px-4 py-3">
													<Input
														type="number"
														value={qtyInputValue(row.lhQty)}
														onChange={(e) =>
															setRows((prev) =>
																prev.map((item, ri) =>
																	ri === index
																		? calcDoorRow({
																				...item,
																				lhQty: toNumber(e.target.value, 0),
																			})
																		: item,
																),
															)
														}
														className="h-10 w-24 rounded-xl text-right"
													/>
												</td>
												<td className="px-4 py-3">
													<Input
														type="number"
														value={qtyInputValue(row.rhQty)}
														onChange={(e) =>
															setRows((prev) =>
																prev.map((item, ri) =>
																	ri === index
																		? calcDoorRow({
																				...item,
																				rhQty: toNumber(e.target.value, 0),
																			})
																		: item,
																),
															)
														}
														className="h-10 w-24 rounded-xl text-right"
													/>
												</td>
											</>
										)}
										<td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
											{currency(row.lineTotal)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
				<div className="border-t bg-muted/20 px-4 py-3 sm:px-5">
					<div className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm">
						<p className="ml-auto">
							Doors: <span className="font-semibold">{totals.totalDoors}</span>
						</p>
						<p>
							Total:{" "}
							<span className="font-semibold">
								{currency(totals.totalPrice)}
							</span>
						</p>
					</div>
				</div>
				<DialogFooter className="border-t px-4 py-4 sm:px-5">
					<Button
						variant="destructive"
						onClick={() => {
							props.onRemoveSelection?.();
							persistSelection([], false);
							props.onOpenChange(false);
						}}
					>
						Remove Selection
					</Button>
					<Button
						variant="secondary"
						onClick={() => {
							persistSelection();
							props.onNextStep?.();
							props.onOpenChange(false);
						}}
					>
						Next Step
					</Button>
					<Button variant="outline" onClick={() => props.onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={() => {
							persistSelection();
							props.onOpenChange(false);
						}}
					>
						Apply
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
