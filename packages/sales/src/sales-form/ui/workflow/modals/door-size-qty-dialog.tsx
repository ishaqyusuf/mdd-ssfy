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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useEffect, useMemo, useRef, useState } from "react";

import { sumMoney } from "../../../../payment-system/domain/money";
import type { SalesFormLineItemRecord } from "../../../application";
import {
	type DoorPriceBreakdownContext,
	DoorPriceCell,
	formatDoorSizeTitle,
} from "../door-price-cell";
import {
	getDoorSizeDialogSessionKey,
	updateDoorSizeDialogRowBasePrice,
} from "../door-size-dialog-state";
import {
	getDoorSwingOptions,
	normalizeDoorSwingValue,
} from "../door-swing-options";
import {
	calcWorkflowDoorRow,
	clearUnpricedDoorRowQty,
	deriveDoorSizeRows,
	isDoorRowPriceMissing,
	rowsForDoorComponent,
} from "../door-utils";
import { SalesFormQuantityStepper } from "../sales-form-quantity-stepper";

type DoorLine = NonNullable<
	NonNullable<SalesFormLineItemRecord["housePackageTool"]>["doors"]
>[number];

type DoorSizePriceSaveInput = {
	id?: number | null;
	stepId?: number | null;
	stepProductUid?: string | null;
	dependenciesUid: string;
	price: number | null;
	size: string;
	supplierUid?: string | null;
};

function toNumber(value: unknown, fallback = 0) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

interface DoorSizeQtyDialogProps {
	open: boolean;
	onOpenChange: (next: boolean) => void;
	line: SalesFormLineItemRecord;
	routeData?: any;
	component: {
		id?: number | null;
		uid?: string | null;
		stepId?: number | null;
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
	priceBreakdown?: DoorPriceBreakdownContext | null;
	pricingLabels?: {
		doorPrice?: string;
	};
	routeConfig?: {
		noHandle?: boolean;
		hasSwing?: boolean;
	} | null;
	canEditPricing?: boolean;
	onPriceSave?: (input: DoorSizePriceSaveInput) => Promise<void> | void;
	onRemoveSelection?: () => void;
	onNextStep?: () => void;
	onApply: (payload: { rows: DoorLine[]; selected: boolean }) => void;
}

function doorSizePricingDependency(size: string, supplierUid?: string | null) {
	const normalizedSize = String(size || "").trim();
	const normalizedSupplier = String(supplierUid || "").trim();
	return normalizedSupplier
		? `${normalizedSize} & ${normalizedSupplier}`
		: normalizedSize;
}

function storedDoorSizeBasePrice(
	component: DoorSizeQtyDialogProps["component"],
	size?: string | null,
	supplierUid?: string | null,
) {
	const dependenciesUid = doorSizePricingDependency(
		String(size || ""),
		supplierUid,
	);
	return component?.pricing?.[dependenciesUid]?.price ?? null;
}

export function DoorSizeQtyDialog(props: DoorSizeQtyDialogProps) {
	const [rows, setRows] = useState<DoorLine[]>([]);
	const initializedSessionKeyRef = useRef<string | null>(null);
	const swingOptions = getDoorSwingOptions(props.line);
	const sessionKey = getDoorSizeDialogSessionKey({
		open: props.open,
		lineUid: props.line.uid,
		componentId: props.component?.id,
		componentUid: props.component?.uid,
		supplierUid: props.supplierUid,
		profileCoefficient: props.profileCoefficient,
	});

	useEffect(() => {
		if (!sessionKey || !props.component) {
			initializedSessionKeyRef.current = null;
			return;
		}
		if (initializedSessionKeyRef.current === sessionKey) return;
		initializedSessionKeyRef.current = sessionKey;
		const existing = rowsForDoorComponent(
			props.line,
			props.component.id ?? null,
		);
		const nextRows = deriveDoorSizeRows({
			line: props.line,
			existingRows: existing,
			component: props.component,
			routeData: props.routeData,
			supplierUid: props.supplierUid,
			profileCoefficient: props.profileCoefficient,
		}) as DoorLine[];
		setRows(nextRows.map(clearUnpricedDoorRowQty));
	}, [
		props.open,
		props.component,
		props.line,
		props.routeData,
		props.profileCoefficient,
		props.supplierUid,
		sessionKey,
	]);

	const totals = useMemo(() => {
		const normalized = rows.map((row) =>
			clearUnpricedDoorRowQty(
				calcWorkflowDoorRow({
					...row,
					stepProductId: props.component?.id || row.stepProductId || null,
				}),
			),
		);
		const totalDoors = normalized.reduce(
			(sum, row) => sum + toNumber(row.totalQty),
			0,
		);
		const totalPrice = sumMoney(
			normalized.map((row) => toNumber(row.lineTotal)),
		);
		return {
			normalized,
			totalDoors,
			totalPrice,
		};
	}, [rows, props.component]);

	if (!props.component) return null;

	async function saveBasePrice(row: DoorLine, nextBase: number) {
		const size = String(row.dimension || "").trim();
		if (!size) return;
		const dependenciesUid = doorSizePricingDependency(size, props.supplierUid);
		const existingPricing = props.component?.pricing?.[dependenciesUid];
		await props.onPriceSave?.({
			id: existingPricing?.id ?? null,
			stepId: props.component?.stepId ?? null,
			stepProductUid: props.component?.uid ?? null,
			dependenciesUid,
			price: nextBase,
			size,
			supplierUid: props.supplierUid ?? null,
		});
	}

	async function saveRowBasePrice(
		row: DoorLine,
		rowIndex: number,
		nextBase: number,
	) {
		const rowsBeforeSave = rows;
		setRows(
			updateDoorSizeDialogRowBasePrice(
				rowsBeforeSave,
				rowIndex,
				nextBase,
				props.profileCoefficient,
			),
		);
		try {
			await saveBasePrice(row, nextBase);
		} catch (error) {
			setRows(rowsBeforeSave);
			throw error;
		}
	}

	function persistSelection(nextRows = totals.normalized, selected = true) {
		const persistedRows = nextRows
			.map(clearUnpricedDoorRowQty)
			.filter(
				(row) =>
					selected &&
					!isDoorRowPriceMissing(row) &&
					Number(row.totalQty || 0) > 0,
			);
		props.onApply({
			rows: persistedRows,
			selected: selected && persistedRows.length > 0,
		});
		return true;
	}

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent
				onOpenAutoFocus={(event) => event.preventDefault()}
				className="flex h-[80dvh] max-h-[720px] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0"
			>
				<DialogHeader className="shrink-0 border-b px-4 py-3">
					<DialogTitle className="text-base uppercase">
						{props.component.title || "Door"} SIZE SELECT
					</DialogTitle>
					<DialogDescription className="text-xs">
						Select size, price, and quantity for this door option.
					</DialogDescription>
				</DialogHeader>
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b px-4 py-2">
						<p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
							Door Supplier
						</p>
						<div className="w-full sm:ml-auto sm:w-[240px]">
											<Select
								value={props.supplierUid || "default"}
								onValueChange={(value) =>
									props.onSupplierChange?.(value === "default" ? null : value)
								}
							>
								<SelectTrigger className="h-8 rounded-md bg-white text-xs font-medium">
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

					<div className="flex min-h-0 flex-1 flex-col">
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:hidden">
							{rows.map((row, index) => (
								<div
									key={`door-size-card-${index}`}
									className="space-y-2 border-b bg-white px-4 py-3"
								>
									<div className="flex items-start justify-between gap-2">
										<div>
											<p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
												Size
											</p>
											<p className="text-sm font-semibold text-foreground">
												{formatDoorSizeTitle(row.dimension)}
											</p>
											<p className="text-xs text-muted-foreground">
												{row.dimension || "--"}
											</p>
										</div>
										<div className="min-w-[104px]">
											<DoorPriceCell
												row={row}
												basePrice={storedDoorSizeBasePrice(
													props.component,
													row.dimension,
													props.supplierUid,
												)}
												profileCoefficient={props.profileCoefficient}
												priceBreakdown={props.priceBreakdown}
												readOnly={!props.canEditPricing}
												onSave={async (nextBase) => {
													await saveRowBasePrice(row, index, nextBase);
												}}
											/>
										</div>
									</div>
									{props.routeConfig?.hasSwing ? (
										<div className="space-y-1.5">
											<Label>Swing</Label>
											{swingOptions ? (
												<Select
													value={normalizeDoorSwingValue(row.swing) || undefined}
													onValueChange={(value) =>
														setRows((prev) =>
															prev.map((item, ri) =>
																ri === index
																	? {
																			...item,
																			swing: value,
																		}
																	: item,
															),
														)
													}
												>
													<SelectTrigger className="h-8 rounded-md">
														<SelectValue placeholder="Select swing" />
													</SelectTrigger>
													<SelectContent>
														{swingOptions.map((option) => (
															<SelectItem
																key={option.value}
																value={option.value}
															>
																{option.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<Input
													value={row.swing || ""}
													onChange={(e) =>
														setRows((prev) =>
															prev.map((item, ri) =>
																ri === index
																	? { ...item, swing: e.target.value }
																	: item,
															),
														)
													}
													placeholder="LH/RH"
													className="h-8 rounded-md"
												/>
											)}
										</div>
									) : null}
									{props.routeConfig?.noHandle ? (
										<div className="space-y-1.5">
											<Label>Qty</Label>
											<SalesFormQuantityStepper
												label={`Quantity for ${formatDoorSizeTitle(row.dimension)}`}
												value={row.totalQty}
												className="h-8 w-full rounded-md"
												onChange={(value) =>
													setRows((prev) =>
														prev.map((item, ri) =>
															ri === index
																? calcWorkflowDoorRow({
																		...item,
																		totalQty: value,
																		lhQty: 0,
																		rhQty: 0,
																	})
																: item,
														),
													)
												}
												disabled={isDoorRowPriceMissing(row)}
												min={0}
											/>
										</div>
									) : (
										<div className="grid grid-cols-2 gap-2">
											<div className="space-y-1.5">
												<Label>LH</Label>
												<SalesFormQuantityStepper
													label={`LH quantity for ${formatDoorSizeTitle(row.dimension)}`}
													value={row.lhQty}
													className="h-8 w-full rounded-md"
													onChange={(value) =>
														setRows((prev) =>
															prev.map((item, ri) =>
																ri === index
																	? calcWorkflowDoorRow({
																			...item,
																			lhQty: value,
																		})
																	: item,
															),
														)
													}
													disabled={isDoorRowPriceMissing(row)}
													min={0}
												/>
											</div>
											<div className="space-y-1.5">
												<Label>RH</Label>
												<SalesFormQuantityStepper
													label={`RH quantity for ${formatDoorSizeTitle(row.dimension)}`}
													value={row.rhQty}
													className="h-8 w-full rounded-md"
													onChange={(value) =>
														setRows((prev) =>
															prev.map((item, ri) =>
																ri === index
																	? calcWorkflowDoorRow({
																			...item,
																			rhQty: value,
																		})
																	: item,
															),
														)
													}
													disabled={isDoorRowPriceMissing(row)}
													min={0}
												/>
											</div>
										</div>
									)}
								</div>
							))}
						</div>

						<div className="hidden min-h-0 flex-1 overflow-auto overscroll-contain md:block">
							<table className="min-w-full table-fixed text-sm">
								<colgroup>
									<col />
									<col className="w-28" />
									{props.routeConfig?.hasSwing ? (
										<col className="w-40" />
									) : props.routeConfig?.noHandle ? (
										<col className="w-32" />
									) : (
										<>
											<col className="w-32" />
											<col className="w-32" />
										</>
									)}
									<col className="w-28" />
								</colgroup>
								<thead className="bg-slate-50">
									<tr className="text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
										<th className="sticky top-0 z-10 whitespace-nowrap border-b bg-slate-50 px-2 py-1.5">
											Size
										</th>
										<th className="sticky top-0 z-10 border-b bg-slate-50 px-2 py-1.5">
											{props.pricingLabels?.doorPrice || "Price"}
										</th>
										{props.routeConfig?.hasSwing ? (
											<th className="sticky top-0 z-10 border-b bg-slate-50 px-2 py-1.5">
												Swing
											</th>
										) : null}
										{props.routeConfig?.noHandle ? (
											<th className="sticky top-0 z-10 border-b bg-slate-50 px-2 py-1.5">
												Qty
											</th>
										) : (
											<>
												<th className="sticky top-0 z-10 border-b bg-slate-50 px-2 py-1.5">
													LH
												</th>
												<th className="sticky top-0 z-10 border-b bg-slate-50 px-2 py-1.5">
													RH
												</th>
											</>
										)}
										<th className="sticky top-0 z-10 border-b bg-slate-50 px-2 py-1.5 text-right">
											Line Total
										</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((row, index) => (
										<tr key={`door-size-row-${index}`} className="border-t">
											<td className="whitespace-nowrap px-2 py-1">
												<div className="space-y-0.5">
													<p className="font-semibold text-foreground">
														{formatDoorSizeTitle(row.dimension)}
													</p>
													<p className="text-xs text-muted-foreground">
														{row.dimension || "--"}
													</p>
												</div>
											</td>
											<td className="px-2 py-1">
												<DoorPriceCell
													row={row}
													basePrice={storedDoorSizeBasePrice(
														props.component,
														row.dimension,
														props.supplierUid,
													)}
													profileCoefficient={props.profileCoefficient}
													priceBreakdown={props.priceBreakdown}
													readOnly={!props.canEditPricing}
													onSave={async (nextBase) => {
														await saveRowBasePrice(row, index, nextBase);
													}}
												/>
											</td>
											{props.routeConfig?.hasSwing ? (
												<td className="px-2 py-1">
													{swingOptions ? (
														<Select
															value={normalizeDoorSwingValue(row.swing) || undefined}
															onValueChange={(value) =>
																setRows((prev) =>
																	prev.map((item, ri) =>
																		ri === index
																			? { ...item, swing: value }
																			: item,
																	),
																)
															}
														>
															<SelectTrigger className="h-8 rounded-md">
																<SelectValue placeholder="Select swing" />
															</SelectTrigger>
															<SelectContent>
																{swingOptions.map((option) => (
																	<SelectItem
																		key={option.value}
																		value={option.value}
																	>
																		{option.label}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													) : (
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
															className="h-8 rounded-md"
														/>
													)}
												</td>
											) : null}
											{props.routeConfig?.noHandle ? (
												<td className="px-2 py-1">
													<SalesFormQuantityStepper
														label={`Quantity for ${formatDoorSizeTitle(row.dimension)}`}
														value={row.totalQty}
														onChange={(value) =>
															setRows((prev) =>
																prev.map((item, ri) =>
																	ri === index
																		? calcWorkflowDoorRow({
																				...item,
																				totalQty: value,
																				lhQty: 0,
																				rhQty: 0,
																			})
																		: item,
																),
															)
														}
														className="h-8 w-28 rounded-md"
														disabled={isDoorRowPriceMissing(row)}
														min={0}
													/>
												</td>
											) : (
												<>
													<td className="px-2 py-1">
														<SalesFormQuantityStepper
															label={`LH quantity for ${formatDoorSizeTitle(row.dimension)}`}
															value={row.lhQty}
															onChange={(value) =>
																setRows((prev) =>
																	prev.map((item, ri) =>
																		ri === index
																			? calcWorkflowDoorRow({
																					...item,
																					lhQty: value,
																				})
																			: item,
																	),
																)
															}
															className="h-8 w-28 rounded-md"
															disabled={isDoorRowPriceMissing(row)}
															min={0}
														/>
													</td>
													<td className="px-2 py-1">
														<SalesFormQuantityStepper
															label={`RH quantity for ${formatDoorSizeTitle(row.dimension)}`}
															value={row.rhQty}
															onChange={(value) =>
																setRows((prev) =>
																	prev.map((item, ri) =>
																		ri === index
																			? calcWorkflowDoorRow({
																					...item,
																					rhQty: value,
																				})
																			: item,
																	),
																)
															}
															className="h-8 w-28 rounded-md"
															disabled={isDoorRowPriceMissing(row)}
															min={0}
														/>
													</td>
												</>
											)}
											<td className="px-2 py-1 text-right text-sm font-semibold text-slate-900">
												{currency(row.lineTotal)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
				<div className="flex shrink-0 items-center justify-end gap-4 border-t bg-muted/20 px-4 py-2 text-xs">
					<p>
						Doors: <span className="font-semibold">{totals.totalDoors}</span>
					</p>
					<p>
						Total:{" "}
						<span className="font-semibold">
							{currency(totals.totalPrice)}
						</span>
					</p>
				</div>
				<DialogFooter className="shrink-0 border-t px-4 py-3">
					<Button
						variant="destructive"
						size="sm"
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
						size="sm"
						onClick={() => {
							if (!persistSelection()) return;
							props.onNextStep?.();
							props.onOpenChange(false);
						}}
					>
						Next Step
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => props.onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={() => {
							if (!persistSelection()) return;
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
