/** @jsxImportSource react */
"use client";

import { Badge } from "@gnd/ui/badge";
import { Button, buttonVariants } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Menu } from "@gnd/ui/custom/menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Field, FieldGroup, FieldTitle } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "@gnd/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Separator } from "@gnd/ui/separator";
import {
	type ReactElement,
	type ReactNode,
	cloneElement,
	isValidElement,
} from "react";
import { multiplyMoney } from "../../../payment-system/domain/money";
import {
	getHptDoorSalesUnitPrice,
	resolveHptDoorUnitPriceBreakdown,
} from "../../domain";
import { ComponentImageLightbox } from "./component-image-lightbox";
import { CostPriceBreakdownHover } from "./cost-price-breakdown-hover";
import {
	type DoorPriceBreakdownContext,
	DoorPriceCell,
	patchDoorRowCustomPrice,
	updateDoorRowBasePrice,
} from "./door-price-cell";
import { normalizeDoorSwingValue } from "./door-swing-options";
import {
	clearUnpricedDoorRowQty,
	getDoorRowProfilePriceDrift,
	isDoorRowPriceMissing,
	repairDoorRowProfilePriceDrift,
} from "./door-utils";
import { SalesFormQuantityStepper } from "./sales-form-quantity-stepper";
import type {
	DoorStoredRow,
	WorkflowComponentRecord,
	WorkflowStepRecord,
} from "./workflow-records";
import { firstFiniteNumber } from "./workflow-records";

type HousePackageToolPricedStep = Pick<
	WorkflowStepRecord,
	"stepId" | "value" | "price" | "step"
>;

type HousePackageToolSummary = {
	rows: DoorStoredRow[];
	totalDoors: number;
	totalPrice: number;
};

export type HousePackageToolSizeOption = {
	size: string;
	doorPrice: number | null;
	selected: boolean;
};

export type HousePackageToolPanelProps = {
	selectedDoorComponents: WorkflowComponentRecord[];
	activeDoorUid: string;
	activeDoorComponent: WorkflowComponentRecord | null;
	focusedRows: DoorStoredRow[];
	summary: HousePackageToolSummary;
	availableSizeOptions: HousePackageToolSizeOption[];
	pricedSteps: HousePackageToolPricedStep[];
	supplierName?: string | null;
	noHandle: boolean;
	hasSwing: boolean;
	swingOptions?: ReadonlyArray<{ value: string; label: string }> | null;
	sharedDoorSurcharge: number;
	profileCoefficient: number | null;
	pricingReady: boolean;
	priceBreakdown?: DoorPriceBreakdownContext | null;
	canSwapDoor: boolean;
	canEditPricing: boolean;
	pricingLabels?: {
		doorPrice?: string;
		addonPrice?: string;
		customPrice?: string;
	};
	formatMoney: (value: unknown) => string;
	componentLabel: (value?: string | null) => string;
	resolveImageSrc: (value?: string | null) => string | null;
	onActiveDoorChange: (uid: string) => void;
	onAddDoor?: () => void;
	onAddSize: (size: string) => void;
	onConfigureSizes: () => void;
	onSwapDoor: () => void;
	onDeleteDoor: () => void;
	onPatchRow: (row: DoorStoredRow, patch: Record<string, unknown>) => void;
	onRemoveSizeRow: (row: DoorStoredRow) => void;
};

export function getHousePackageToolRowKey(
	componentId: number,
	row: DoorStoredRow,
	rowIndex: number,
) {
	const persistedId = Number(row.id);
	if (Number.isFinite(persistedId) && persistedId > 0)
		return `hpt-row-${componentId}-saved-id-${persistedId}`;
	const persistedUid = String(row.uid ?? "").trim();
	if (persistedUid) return `hpt-row-${componentId}-saved-uid-${persistedUid}`;

	return `hpt-row-${componentId}-draft-${String(row.stepProductId || "product")}-${String(row.dimension || "size")}-${rowIndex}`;
}

function HptHeaderActionTooltip({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	if (!isValidElement(children)) return children;
	return cloneElement(children as ReactElement<{ title?: string }>, {
		title: label,
	});
}

function HptAddSizeMenu(props: {
	componentId: number;
	availableSizeOptions: HousePackageToolSizeOption[];
	formatMoney: (value: unknown) => string;
	onAddSize: (size: string) => void;
	disabled?: boolean;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				type="button"
				title="Add Size"
				className={buttonVariants({
					variant: "outline",
					size: "icon",
					className: "size-8 rounded-full",
				})}
				disabled={props.disabled}
				aria-label="Add Size"
			>
				<Icons.Plus className="size-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				{!props.availableSizeOptions.length ? (
					<DropdownMenuItem disabled>No more sizes</DropdownMenuItem>
				) : (
					props.availableSizeOptions.map((option) => (
						<DropdownMenuItem
							key={`add-size-${props.componentId}-${option.size}`}
							disabled={option.selected}
							onClick={() => {
								if (!option.selected) props.onAddSize(option.size);
							}}
							className="flex items-center justify-between gap-4"
						>
							<span>{option.size}</span>
							<span className="text-xs tabular-nums text-muted-foreground">
								{option.selected
									? "Selected"
									: option.doorPrice == null
										? "Price unavailable"
										: props.formatMoney(option.doorPrice)}
							</span>
						</DropdownMenuItem>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function HousePackageToolPanel(props: HousePackageToolPanelProps) {
	const componentId = Number(props.activeDoorComponent?.id || 0);
	const rowsForComponent = props.focusedRows.map(clearUnpricedDoorRowQty);
	const showDoorTabs = props.selectedDoorComponents.length > 1;
	const doorTitle = props.componentLabel(
		props.activeDoorComponent?.title || `Component ${componentId}`,
	);
	const doorImageSrc = props.resolveImageSrc(props.activeDoorComponent?.img);
	const pricingLabels = {
		doorPrice: props.pricingLabels?.doorPrice || "Door Price",
		addonPrice: props.pricingLabels?.addonPrice || "Addon Price",
		customPrice: props.pricingLabels?.customPrice || "Custom Price",
	};

	return (
		<section className="mt-4 space-y-3">
			{props.onAddDoor ? (
				<div className="flex justify-end">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={props.onAddDoor}
						disabled={!props.pricingReady}
						aria-label="Add door"
					>
						<Icons.Plus className="mr-1.5 size-3.5" />
						Add Door
					</Button>
				</div>
			) : null}
			{showDoorTabs ? (
				<div className="flex flex-wrap gap-2">
					{props.selectedDoorComponents.map((component) => {
						const selected = component.uid === props.activeDoorUid;
						return (
							<button
								key={`hpt-door-tab-${component.uid}`}
								type="button"
								aria-current={selected ? "true" : undefined}
								aria-label={`Show ${props.componentLabel(component.title || component.uid)} door rows`}
								className={`max-w-full rounded-md border px-3 py-1 text-[11px] font-semibold uppercase transition-colors ${
									selected
										? "border-primary bg-primary/10 text-primary"
										: "bg-background text-muted-foreground hover:border-primary/70"
								}`}
								onClick={() => props.onActiveDoorChange(String(component.uid))}
							>
								<span className="block truncate">
									{props.componentLabel(component.title || component.uid)}
								</span>
							</button>
						);
					})}
				</div>
			) : null}
			<div className="flex flex-col gap-3">
				{!props.selectedDoorComponents.length ? (
					<div className="rounded-lg border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
						Select at least one DOOR component first, then continue to HOUSE
						PACKAGE TOOL.
					</div>
				) : !props.summary.rows.length ? (
					<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
						<p>
							Select a door component and apply size quantities to build the
							package.
						</p>
						<HptAddSizeMenu
							componentId={componentId}
							availableSizeOptions={props.availableSizeOptions}
							formatMoney={props.formatMoney}
							onAddSize={props.onAddSize}
							disabled={!props.activeDoorComponent || !props.pricingReady}
						/>
					</div>
				) : !rowsForComponent.length ? (
					<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
						<p>
							No size rows for{" "}
							{props.componentLabel(
								props.activeDoorComponent?.title || "selected door",
							)}{" "}
							yet. Add a configured size or open the size editor.
						</p>
						<div className="flex items-center gap-2">
							<HptAddSizeMenu
								componentId={componentId}
								availableSizeOptions={props.availableSizeOptions}
								formatMoney={props.formatMoney}
								onAddSize={props.onAddSize}
								disabled={!props.activeDoorComponent || !props.pricingReady}
							/>
							<HptHeaderActionTooltip label="Configure Sizes">
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={props.onConfigureSizes}
									disabled={!props.activeDoorComponent || !props.pricingReady}
								>
									Configure Sizes
								</Button>
							</HptHeaderActionTooltip>
						</div>
					</div>
				) : (
					<article className="overflow-hidden rounded-lg border bg-background">
						<header className="flex items-center gap-3 border-b bg-muted/20 px-4 py-3">
							<ComponentImageLightbox
								imageSrc={doorImageSrc}
								title={doorTitle}
								alt={props.activeDoorComponent?.title || doorTitle}
								className="size-12 rounded-md"
								imageClassName="p-2"
								fallback={
									<Icons.Ruler size={15} className="text-slate-500" />
								}
							/>
							<div className="min-w-0">
								<p className="truncate text-sm font-semibold text-slate-900">
									{doorTitle}
								</p>
								<p className="text-[11px] uppercase tracking-wide text-slate-500">
									{rowsForComponent.length} size row
									{rowsForComponent.length > 1 ? "s" : ""}
								</p>
							</div>
							<div className="ml-auto flex shrink-0 items-center gap-1">
								<HptAddSizeMenu
									componentId={componentId}
									availableSizeOptions={props.availableSizeOptions}
									formatMoney={props.formatMoney}
									onAddSize={props.onAddSize}
									disabled={!props.pricingReady}
								/>
								<>
									<HptHeaderActionTooltip label="Configure Sizes">
										<Button
											type="button"
											size="icon"
											variant="outline"
											className="size-8 rounded-full"
											onClick={props.onConfigureSizes}
											disabled={
												!props.activeDoorComponent || !props.pricingReady
											}
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
											disabled={
												!props.activeDoorComponent ||
												!props.canSwapDoor ||
												!props.pricingReady
											}
											aria-label="Swap Door"
										>
											<Icons.Repeat className="size-3.5" />
										</Button>
									</HptHeaderActionTooltip>
									<HptHeaderActionTooltip label="Delete Door">
										<Button
											type="button"
											size="icon"
											variant="outline"
											className="size-8 rounded-full border-destructive bg-secondary text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
											onClick={props.onDeleteDoor}
											disabled={!props.activeDoorComponent}
											aria-label="Delete Door"
										>
											<Icons.Trash2 className="size-3.5 text-current" />
										</Button>
									</HptHeaderActionTooltip>
								</>
							</div>
						</header>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[660px] table-fixed text-sm">
								<thead>
									<tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
										<th className="whitespace-nowrap px-3 py-2">Size</th>
										{props.hasSwing ? (
											<th className="w-20 px-2 py-2">Swing</th>
										) : null}
										{props.noHandle ? (
											<th className="w-36 px-2 py-2 text-center">Qty</th>
										) : (
											<>
												<th className="w-36 px-2 py-2 text-center">LH</th>
												<th className="w-36 px-2 py-2 text-center">RH</th>
												<th className="w-14 px-2 py-2 text-right">Total</th>
											</>
										)}
										<th className="w-24 px-2 py-2 text-right">Estimate</th>
										<th className="w-24 px-3 py-2 text-right">Line</th>
										<th className="w-24 px-2 py-2 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{rowsForComponent.map((row, rowIndex) => {
										const unitBreakdown = resolveHptDoorUnitPriceBreakdown(
											row,
											{
												sharedDoorSurcharge: props.sharedDoorSurcharge,
												profileCoefficient: props.profileCoefficient,
											},
										);
										const profilePriceDrift = getDoorRowProfilePriceDrift(
											row,
											props.profileCoefficient,
										);
										const lineBreakdown = {
											costPrice: multiplyMoney(
												row?.meta?.baseUnitPrice,
												row.totalQty,
											),
											unitCostPrice: row?.meta?.baseUnitPrice,
											quantity: row.totalQty,
											displayPrice: row.lineTotal,
										};
										const addonInputId = `hpt-addon-${componentId}-${row.id ?? rowIndex}`;
										const customInputId = `hpt-custom-${componentId}-${row.id ?? rowIndex}`;

										return (
											<tr
												key={getHousePackageToolRowKey(
													componentId,
													row,
													rowIndex,
												)}
												className="border-b border-slate-100 last:border-0"
											>
												<td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
													{row.dimension || "--"}
												</td>
												{props.hasSwing ? (
													<td className="px-2 py-2">
														{props.swingOptions ? (
															<Select
															value={normalizeDoorSwingValue(row.swing) || undefined}
																onValueChange={(swing) =>
																	props.onPatchRow(row, { swing })
																}
																disabled={!props.pricingReady}
															>
																<SelectTrigger className="h-8 w-28 rounded-md border-slate-200 text-xs">
																	<SelectValue placeholder="Select swing" />
																</SelectTrigger>
																<SelectContent>
																	{props.swingOptions.map((option) => (
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
																onChange={(event) =>
																	props.onPatchRow(row, {
																		swing: event.target.value,
																	})
																}
																className="h-8 w-16 rounded-md border-slate-200 text-xs"
																disabled={!props.pricingReady}
																placeholder="LH/RH"
															/>
														)}
													</td>
												) : null}
												{props.noHandle ? (
													<td className="px-2 py-2">
														<SalesFormQuantityStepper
															label={`Quantity for ${row.dimension || "door size"}`}
															value={row.totalQty}
															onChange={(value) =>
																props.onPatchRow(row, {
																	totalQty: value,
																	lhQty: 0,
																	rhQty: 0,
																})
															}
															disabled={
																!props.pricingReady ||
																isDoorRowPriceMissing(row)
															}
															className="w-32"
															min={0}
														/>
													</td>
												) : (
													<>
														<td className="px-2 py-2">
															<SalesFormQuantityStepper
																label={`LH quantity for ${row.dimension || "door size"}`}
																value={row.lhQty}
																onChange={(value) =>
																	props.onPatchRow(row, {
																		lhQty: value,
																	})
																}
																disabled={
																	!props.pricingReady ||
																	isDoorRowPriceMissing(row)
																}
																className="w-32"
																min={0}
															/>
														</td>
														<td className="px-2 py-2">
															<SalesFormQuantityStepper
																label={`RH quantity for ${row.dimension || "door size"}`}
																value={row.rhQty}
																onChange={(value) =>
																	props.onPatchRow(row, {
																		rhQty: value,
																	})
																}
																disabled={
																	!props.pricingReady ||
																	isDoorRowPriceMissing(row)
																}
																className="w-32"
																min={0}
															/>
														</td>
														<td className="px-2 py-2 text-right text-xs font-semibold text-slate-700">
															{Number(row.totalQty || 0)}
														</td>
													</>
												)}
												<td className="px-2 py-2">
													<DoorPriceCell
														row={row}
														profileCoefficient={props.profileCoefficient}
														displayPrice={unitBreakdown.unitPrice}
														priceBreakdown={{
															...props.priceBreakdown,
															displayUnitPrice: getHptDoorSalesUnitPrice(row, {
																sharedDoorSurcharge: props.sharedDoorSurcharge,
																profileCoefficient: props.profileCoefficient,
															}),
														}}
														readOnly={
															!props.canEditPricing || !props.pricingReady
														}
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
																<CostPriceBreakdownHover
																	breakdown={lineBreakdown}
																	context={props.priceBreakdown}
																>
																	<span>
																		{props.formatMoney(row.lineTotal) ||
																			"$0.00"}
																	</span>
																</CostPriceBreakdownHover>
															</span>
														}
													>
														<Card className="w-[320px] rounded-lg text-left">
															<CardHeader className="flex-row items-start justify-between gap-3 p-3">
																<div className="min-w-0">
																	<CardTitle>Estimate breakdown</CardTitle>
																	<CardDescription className="truncate">
																		{props.componentLabel(
																			props.activeDoorComponent?.title ||
																				"Selected Door",
																		)}{" "}
																		· {row.dimension || "No size"}
																	</CardDescription>
																</div>
																<Badge variant="secondary">
																	Qty {Number(row.totalQty || 0)}
																</Badge>
															</CardHeader>
															<CardContent className="flex flex-col gap-3 p-3 pt-0">
																<dl className="flex flex-col gap-1.5">
																	<div className="flex items-center justify-between gap-4">
																		<dt className="text-muted-foreground">
																			{pricingLabels.doorPrice}
																		</dt>
																		<dd className="font-medium">
																			{props.formatMoney(
																				getHptDoorSalesUnitPrice(row, {
																					sharedDoorSurcharge:
																						props.sharedDoorSurcharge,
																					profileCoefficient:
																						props.profileCoefficient,
																				}),
																			) || "$0.00"}
																		</dd>
																	</div>
																	{props.pricedSteps.map((step) => (
																		<div
																			key={`priced-step-${row.dimension}-${step.stepId}-${step.value}`}
																			className="flex items-center justify-between gap-4"
																		>
																			<dt className="truncate text-muted-foreground">
																				{step?.step?.title || "Component"}
																			</dt>
																			<dd className="font-medium">
																				{props.formatMoney(step?.price) ||
																					"$0.00"}
																			</dd>
																		</div>
																	))}
																	{props.canEditPricing ? (
																		<div className="flex items-center justify-between gap-4">
																			<dt className="text-muted-foreground">
																				Base cost
																			</dt>
																			<dd className="font-medium">
																				{row?.meta?.baseUnitPrice == null
																					? "Not set"
																					: props.formatMoney(
																							firstFiniteNumber(
																								row?.meta?.baseUnitPrice,
																								0,
																							) ?? 0,
																						) || "$0.00"}
																			</dd>
																		</div>
																	) : null}
																</dl>
																<Separator />
																<div className="flex items-center justify-between gap-4">
																	<div className="flex items-center gap-2">
																		<span className="font-medium">
																			Final unit
																		</span>
																		{unitBreakdown.hasCustomPrice ? (
																			<Badge variant="outline">Custom</Badge>
																		) : null}
																	</div>
																	{unitBreakdown.hasCustomPrice ? (
																		<div className="flex items-center gap-2">
																			<span className="text-muted-foreground line-through">
																				{props.formatMoney(
																					unitBreakdown.calculatedFinalUnitPrice,
																				) || "$0.00"}
																			</span>
																			<span className="font-semibold">
																				{props.formatMoney(
																					unitBreakdown.unitPrice,
																				) || "$0.00"}
																			</span>
																		</div>
																	) : (
																		<span className="font-semibold">
																			{props.formatMoney(
																				unitBreakdown.unitPrice,
																			) || "$0.00"}
																		</span>
																	)}
																</div>
																<Separator />
																<FieldGroup className="gap-2">
																	{props.canEditPricing ? (
																		<Field
																			orientation="horizontal"
																			className="gap-2"
																		>
																			<FieldTitle>
																				{pricingLabels.addonPrice}
																			</FieldTitle>
																			<InputGroup className="h-8 w-28">
																				<InputGroupAddon>
																					<InputGroupText>$</InputGroupText>
																				</InputGroupAddon>
																				<InputGroupInput
																					id={addonInputId}
																					aria-label={pricingLabels.addonPrice}
																					type="number"
																					step="0.01"
																					value={row.addon ?? 0}
																					onChange={(event) =>
																						props.onPatchRow(row, {
																							addon: Number(
																								event.target.value || 0,
																							),
																						})
																					}
																					className="text-right"
																					disabled={!props.pricingReady}
																				/>
																			</InputGroup>
																		</Field>
																	) : null}
																	<Field
																		orientation="horizontal"
																		className="gap-2"
																	>
																		<FieldTitle>
																			{pricingLabels.customPrice}
																		</FieldTitle>
																		<InputGroup className="h-8 w-28">
																			<InputGroupAddon>
																				<InputGroupText>$</InputGroupText>
																			</InputGroupAddon>
																			<InputGroupInput
																				id={customInputId}
																				aria-label={pricingLabels.customPrice}
																				type="number"
																				step="0.01"
																				value={row.customPrice ?? ""}
																				onChange={(event) => {
																					const customPrice =
																						event.target.value === ""
																							? null
																							: Number(event.target.value || 0);
																					props.onPatchRow(
																						row,
																						patchDoorRowCustomPrice(
																							row,
																							customPrice,
																						),
																					);
																				}}
																				className="text-right"
																				disabled={!props.pricingReady}
																			/>
																		</InputGroup>
																	</Field>
																</FieldGroup>
															</CardContent>
															<CardFooter className="justify-between p-3">
																<span>Line total</span>
																<span className="font-semibold text-foreground">
																	{props.formatMoney(row.lineTotal) || "$0.00"}
																</span>
															</CardFooter>
														</Card>
													</Menu>
												</td>
												<td className="px-2 py-2 text-right">
													<>
														<div className="flex items-center justify-end gap-1">
															{props.canEditPricing && profilePriceDrift ? (
																<HptHeaderActionTooltip
																	label={`Repair price: ${props.formatMoney(profilePriceDrift.actualDoorSalesUnitPrice)} → ${props.formatMoney(profilePriceDrift.expectedDoorSalesUnitPrice)}`}
																>
																	<Button
																		type="button"
																		size="icon"
																		variant="ghost"
																		className="size-6 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
																		disabled={!props.pricingReady}
																		onClick={() => {
																			const repaired =
																				repairDoorRowProfilePriceDrift(row, {
																					profileCoefficient:
																						props.profileCoefficient,
																					sharedDoorSurcharge:
																						props.sharedDoorSurcharge,
																					noHandle: props.noHandle,
																					hasSwing: props.hasSwing,
																				});
																			if (repaired)
																				props.onPatchRow(row, repaired);
																		}}
																		aria-label={`Repair price for ${row.dimension || "door size"}`}
																	>
																		<Icons.Wrench className="size-3" />
																	</Button>
																</HptHeaderActionTooltip>
															) : null}
															<Button
																type="button"
																size="icon"
																variant="ghost"
																className="size-6 text-slate-500 hover:text-red-600"
																onClick={() => props.onRemoveSizeRow(row)}
																aria-label={`Remove ${row.dimension || "door size"}`}
															>
																<Icons.Trash2 className="size-3" />
															</Button>
														</div>
													</>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</article>
				)}
			</div>
		</section>
	);
}
