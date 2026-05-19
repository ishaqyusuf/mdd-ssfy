"use client";

import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Menu } from "@gnd/ui/custom/menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import type { ReactNode } from "react";
import type {
	DoorStoredRow,
	WorkflowComponentRecord,
	WorkflowStepRecord,
} from "./workflow-records";
import { firstFiniteNumber } from "./workflow-records";
import { DoorPriceCell, updateDoorRowBasePrice } from "./door-price-cell";
import { profileAdjustedDoorSalesPrice } from "./door-pricing";

type HousePackageToolPricedStep = Pick<
	WorkflowStepRecord,
	"stepId" | "value" | "price" | "step"
>;

type HousePackageToolSummary = {
	rows: DoorStoredRow[];
	totalDoors: number;
	totalPrice: number;
};

export type HousePackageToolPanelProps = {
	selectedDoorComponents: WorkflowComponentRecord[];
	activeDoorUid: string;
	activeDoorComponent: WorkflowComponentRecord | null;
	focusedRows: DoorStoredRow[];
	summary: HousePackageToolSummary;
	availableSizes: string[];
	pricedSteps: HousePackageToolPricedStep[];
	supplierName?: string | null;
	noHandle: boolean;
	hasSwing: boolean;
	sharedDoorSurcharge: number;
	profileCoefficient: number;
	canSwapDoor: boolean;
	formatMoney: (value: unknown) => string;
	componentLabel: (value?: string | null) => string;
	resolveImageSrc: (value?: string | null) => string | null;
	onActiveDoorChange: (uid: string) => void;
	onAddSize: (size: string) => void;
	onConfigureSizes: () => void;
	onSwapDoor: () => void;
	onDeleteDoor: () => void;
	onPatchRow: (row: DoorStoredRow, patch: Record<string, unknown>) => void;
	onRemoveSizeRow: (row: DoorStoredRow) => void;
};

function HptHeaderActionTooltip({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side="top" className="px-2 py-1 text-xs">
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

export function HousePackageToolPanel(props: HousePackageToolPanelProps) {
	const componentId = Number(props.activeDoorComponent?.id || 0);
	const rowsForComponent = props.focusedRows;

	return (
		<section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
			<div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_55%)] p-4">
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
						<Icons.Package2 size={13} />
						House Package Tool
					</span>
					<span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
						<Icons.Hammer size={13} />
						{props.supplierName || "GND MILLWORK"}
					</span>
				</div>
				{props.selectedDoorComponents.length ? (
					<div className="mt-3 flex flex-wrap gap-2">
						{props.selectedDoorComponents.map((component) => {
							const selected = component.uid === props.activeDoorUid;
							return (
								<button
									key={`hpt-door-tab-${component.uid}`}
									type="button"
									className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
										selected
											? "border-primary bg-primary/10 text-primary"
											: "border-slate-300 bg-white text-slate-600 hover:border-primary"
									}`}
									onClick={() => props.onActiveDoorChange(String(component.uid))}
								>
									{props.componentLabel(component.title || component.uid)}
								</button>
							);
						})}
					</div>
				) : null}
				<div className="mt-3 grid gap-2 sm:grid-cols-3">
					<div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
						<p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
							Rows
						</p>
						<p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
							<Icons.Layers3 size={14} />
							{props.summary.rows.length}
						</p>
					</div>
					<div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
						<p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
							Total Doors
						</p>
						<p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
							<Icons.DoorOpen size={14} />
							{props.summary.totalDoors}
						</p>
					</div>
					<div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
						<p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
							Package Total
						</p>
						<p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
							<Icons.WalletCards size={14} />
							{props.formatMoney(props.summary.totalPrice) || "$0.00"}
						</p>
					</div>
				</div>
			</div>
			<div className="space-y-3 p-4">
				{!props.selectedDoorComponents.length ? (
					<div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
						Select at least one DOOR component first, then continue to HOUSE
						PACKAGE TOOL.
					</div>
				) : !props.summary.rows.length ? (
					<div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
						Select a door component and apply size quantities to build the
						package.
					</div>
				) : !rowsForComponent.length ? (
					<div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
						No size rows for{" "}
						{props.componentLabel(
							props.activeDoorComponent?.title || "selected door",
						)}{" "}
						yet. Click <span className="font-semibold">Configure Sizes</span>{" "}
						to add them.
					</div>
				) : (
					<article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
						<header className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
							<div className="group flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
								{props.resolveImageSrc(props.activeDoorComponent?.img) ? (
									<img
										src={props.resolveImageSrc(props.activeDoorComponent?.img) || ""}
										alt={
											props.activeDoorComponent?.title ||
											`Component ${componentId}`
										}
										className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-90"
									/>
								) : (
									<Icons.Ruler size={15} className="text-slate-500" />
								)}
							</div>
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-slate-900">
									{props.componentLabel(
										props.activeDoorComponent?.title || `Component ${componentId}`,
									)}
								</p>
								<p className="text-[11px] uppercase tracking-wide text-slate-500">
									{rowsForComponent.length} size row
									{rowsForComponent.length > 1 ? "s" : ""}
								</p>
							</div>
							<div className="ml-auto flex shrink-0 items-center gap-1">
								<TooltipProvider delayDuration={120}>
									<DropdownMenu>
										<Tooltip>
											<TooltipTrigger asChild>
												<DropdownMenuTrigger asChild>
													<Button
														type="button"
														size="icon"
														variant="outline"
														className="size-8 rounded-full"
														aria-label="Add Size"
													>
														<Icons.Plus className="size-3.5" />
													</Button>
												</DropdownMenuTrigger>
											</TooltipTrigger>
											<TooltipContent side="top" className="px-2 py-1 text-xs">
												Add Size
											</TooltipContent>
										</Tooltip>
										<DropdownMenuContent align="end" className="w-44">
											{!props.availableSizes.length ? (
												<DropdownMenuItem disabled>No more sizes</DropdownMenuItem>
											) : (
												props.availableSizes.map((size) => (
													<DropdownMenuItem
														key={`add-size-${componentId}-${size}`}
														onClick={() => props.onAddSize(size)}
													>
														{size}
													</DropdownMenuItem>
												))
											)}
										</DropdownMenuContent>
									</DropdownMenu>
									<HptHeaderActionTooltip label="Configure Sizes">
										<Button
											type="button"
											size="icon"
											variant="outline"
											className="size-8 rounded-full"
											onClick={props.onConfigureSizes}
											disabled={!props.activeDoorComponent}
											aria-label="Configure Sizes"
										>
											<Icons.Settings2 className="size-3.5" />
										</Button>
									</HptHeaderActionTooltip>
									<HptHeaderActionTooltip label="Swap Door">
										<Button
											type="button"
											size="icon"
											variant="outline"
											className="size-8 rounded-full"
											onClick={props.onSwapDoor}
											disabled={!props.activeDoorComponent || !props.canSwapDoor}
											aria-label="Swap Door"
										>
											<Icons.Repeat className="size-3.5" />
										</Button>
									</HptHeaderActionTooltip>
									<HptHeaderActionTooltip label="Delete Door">
										<Button
											type="button"
											size="icon"
											variant="destructive"
											className="size-8 rounded-full"
											onClick={props.onDeleteDoor}
											disabled={!props.activeDoorComponent}
											aria-label="Delete Door"
										>
											<Icons.Trash2 className="size-3.5" />
										</Button>
									</HptHeaderActionTooltip>
								</TooltipProvider>
							</div>
						</header>
						<div className="overflow-x-auto">
							<table className="min-w-full text-sm">
								<thead>
									<tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
										<th className="whitespace-nowrap px-3 py-2">Size</th>
										{props.hasSwing ? <th className="px-3 py-2">Swing</th> : null}
										{props.noHandle ? (
											<th className="px-3 py-2 text-right">Qty</th>
										) : (
											<>
												<th className="px-3 py-2 text-right">LH</th>
												<th className="px-3 py-2 text-right">RH</th>
												<th className="px-3 py-2 text-right">Total</th>
											</>
										)}
										<th className="px-3 py-2 text-right">Unit</th>
										<th className="px-3 py-2 text-right">Line</th>
										<th className="px-3 py-2 text-right">Remove</th>
									</tr>
								</thead>
								<tbody>
									{rowsForComponent.map((row, rowIndex) => (
										<tr
											key={`hpt-row-${componentId}-${row.id ?? "new"}-${row.stepProductId || row.dimension || "row"}-${row.swing || "noswing"}-${row.totalQty || 0}-${rowIndex}`}
											className="border-b border-slate-100 last:border-0"
										>
											<td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
												{row.dimension || "--"}
											</td>
											{props.hasSwing ? (
												<td className="px-3 py-2">
													<Input
														value={row.swing || ""}
														onChange={(event) =>
															props.onPatchRow(row, {
																swing: event.target.value,
															})
														}
														className="h-8 rounded-md border-slate-200 text-xs"
														placeholder="LH/RH"
													/>
												</td>
											) : null}
											{props.noHandle ? (
												<td className="px-3 py-2">
													<Input
														type="number"
														value={
															Number(row.totalQty || 0) > 0
																? String(Number(row.totalQty || 0))
																: ""
														}
														onChange={(event) =>
															props.onPatchRow(row, {
																totalQty: Number(event.target.value || 0),
																lhQty: 0,
																rhQty: 0,
															})
														}
														className="h-8 rounded-md border-slate-200 text-right text-xs"
													/>
												</td>
											) : (
												<>
													<td className="px-3 py-2">
														<Input
															type="number"
															value={
																Number(row.lhQty || 0) > 0
																	? String(Number(row.lhQty || 0))
																	: ""
															}
															onChange={(event) =>
																props.onPatchRow(row, {
																	lhQty: Number(event.target.value || 0),
																})
															}
															className="h-8 rounded-md border-slate-200 text-right text-xs"
														/>
													</td>
													<td className="px-3 py-2">
														<Input
															type="number"
															value={
																Number(row.rhQty || 0) > 0
																	? String(Number(row.rhQty || 0))
																	: ""
															}
															onChange={(event) =>
																props.onPatchRow(row, {
																	rhQty: Number(event.target.value || 0),
																})
															}
															className="h-8 rounded-md border-slate-200 text-right text-xs"
														/>
													</td>
													<td className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
														{Number(row.totalQty || 0)}
													</td>
												</>
											)}
											<td className="px-3 py-2">
												<DoorPriceCell
													row={row}
													profileCoefficient={props.profileCoefficient}
													onSave={(nextBase) =>
														props.onPatchRow(
															row,
															updateDoorRowBasePrice(
																{
																	...row,
																	unitPrice: Number(row?.unitPrice || 0),
																},
																nextBase,
																props.profileCoefficient,
															),
														)
													}
												/>
											</td>
											<td className="px-3 py-2 text-right text-xs font-semibold text-slate-900">
												<Menu
													noSize
													Icon={null}
													label={
														<span className="cursor-pointer underline decoration-dotted underline-offset-2">
															{props.formatMoney(row.lineTotal) || "$0.00"}
														</span>
													}
												>
													<div className="min-w-[260px] space-y-2 p-2 text-left text-xs">
														<p className="font-bold uppercase text-muted-foreground">
															Estimate Breakdown
														</p>
														{props.pricedSteps.map((step) => (
															<div
																key={`priced-step-${row.dimension}-${step.stepId}-${step.value}`}
																className="flex justify-between gap-3"
															>
																<span>{step?.step?.title || "Component"}</span>
																<span className="font-semibold">
																	{props.formatMoney(step?.price) || "$0.00"}
																</span>
															</div>
														))}
														<div className="flex justify-between">
															<span>Door</span>
															<span className="font-semibold">
																{props.componentLabel(
																	props.activeDoorComponent?.title ||
																		"Selected Door",
																)}
															</span>
														</div>
														<div className="flex justify-between">
															<span>Size</span>
															<span className="font-semibold">
																{row.dimension || "--"}
															</span>
														</div>
														<div className="flex justify-between">
															<span>Door Price</span>
															<span className="font-semibold">
																{props.formatMoney(
																	row?.meta?.baseUnitPrice == null
																		? Number(row.unitPrice ?? 0) -
																				props.sharedDoorSurcharge
																		: profileAdjustedDoorSalesPrice(
																				null,
																				firstFiniteNumber(
																					row?.meta?.baseUnitPrice,
																					0,
																				) ?? 0,
																				props.profileCoefficient,
																			),
																) || "$0.00"}
															</span>
														</div>
														<div className="flex justify-between">
															<span>Base Cost</span>
															<span className="font-semibold">
																{row?.meta?.baseUnitPrice == null
																	? "--"
																	: props.formatMoney(
																			firstFiniteNumber(
																				row?.meta?.baseUnitPrice,
																				0,
																			) ?? 0,
																		) || "$0.00"}
															</span>
														</div>
														<div className="flex justify-between">
															<span>Component Surcharge</span>
															<span className="font-semibold">
																{props.formatMoney(props.sharedDoorSurcharge) ||
																	"$0.00"}
															</span>
														</div>
														<div className="flex justify-between">
															<span>Final Unit</span>
															<span className="font-semibold">
																{props.formatMoney(row.unitPrice) || "$0.00"}
															</span>
														</div>
														<div className="flex justify-between">
															<span>Qty</span>
															<span className="font-semibold">
																{Number(row.totalQty || 0)}
															</span>
														</div>
														<div className="flex items-center justify-between gap-3">
															<span>Addon Price</span>
															<Input
																type="number"
																step="0.01"
																value={row.addon ?? 0}
																onChange={(event) =>
																	props.onPatchRow(row, {
																		addon: Number(event.target.value || 0),
																	})
																}
																className="h-8 w-24 text-right text-xs"
															/>
														</div>
														<div className="flex items-center justify-between gap-3">
															<span>Custom Price</span>
															<Input
																type="number"
																step="0.01"
																value={row.customPrice ?? ""}
																onChange={(event) =>
																	props.onPatchRow(row, {
																		customPrice:
																			event.target.value === ""
																				? null
																				: Number(event.target.value || 0),
																	})
																}
																className="h-8 w-24 text-right text-xs"
															/>
														</div>
														<div className="border-t pt-2" />
														<div className="flex justify-between text-sm">
															<span className="font-semibold">Line Total</span>
															<span className="font-bold">
																{props.formatMoney(row.lineTotal) || "$0.00"}
															</span>
														</div>
													</div>
												</Menu>
											</td>
											<td className="px-3 py-2 text-right">
												<Button
													size="icon"
													variant="ghost"
													className="size-7 text-slate-500 hover:text-red-600"
													onClick={() => props.onRemoveSizeRow(row)}
												>
													<Icons.Trash2 className="size-4" />
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</article>
				)}
			</div>
		</section>
	);
}
