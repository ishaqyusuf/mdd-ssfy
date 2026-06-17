/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import type { SalesFormLineItemRecord } from "../application";

export type SalesFormLineItemUiRecord = SalesFormLineItemRecord & {
	uid: string;
	title: string;
	qty: number;
	unitPrice: number;
	lineTotal: number;
	formSteps?: any[];
	shelfItems?: any[];
	housePackageTool?: any | null;
};

export type SalesFormLineItemsPanelProps = {
	lineItems: SalesFormLineItemUiRecord[];
	onAddLineItem: () => void;
	onUpdateLineItem: (
		uid: string,
		patch: Partial<SalesFormLineItemUiRecord>,
	) => void;
	onRemoveLineItem: (uid: string) => void;
	lineTotalMode?: "editable" | "readonly";
	getLineTotalValue?: (line: SalesFormLineItemUiRecord) => number;
};

function updateStep(
	line: SalesFormLineItemUiRecord,
	stepIndex: number,
	patch: Record<string, unknown>,
) {
	const steps = [...(line.formSteps || [])];
	steps[stepIndex] = {
		...(steps[stepIndex] || {}),
		...patch,
	} as any;
	return steps;
}

function updateShelf(
	line: SalesFormLineItemUiRecord,
	shelfIndex: number,
	patch: Record<string, unknown>,
) {
	const shelfItems = [...(line.shelfItems || [])];
	shelfItems[shelfIndex] = {
		...(shelfItems[shelfIndex] || {}),
		...patch,
	} as any;
	return shelfItems;
}

function updateDoor(
	line: SalesFormLineItemUiRecord,
	doorIndex: number,
	patch: Record<string, unknown>,
) {
	const hpt = { ...(line.housePackageTool || {}) };
	const doors = [...(hpt.doors || [])];
	doors[doorIndex] = {
		...(doors[doorIndex] || {}),
		...patch,
	} as any;
	hpt.doors = doors;
	return hpt;
}

export function SalesFormLineItemsPanel(props: SalesFormLineItemsPanelProps) {
	const lineTotalMode = props.lineTotalMode || "editable";

	return (
		<section className="rounded-lg border p-4">
			<div className="mb-3 flex items-center">
				<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Line Items
				</h3>
				<Button
					size="sm"
					variant="outline"
					className="ml-auto"
					onClick={props.onAddLineItem}
				>
					Add
				</Button>
			</div>

			<div className="space-y-2">
				{!props.lineItems.length ? (
					<p className="text-sm text-muted-foreground">No line items yet.</p>
				) : (
					props.lineItems.map((line) => (
						<div
							key={line.uid}
							className="grid gap-2 rounded-md border p-3 md:grid-cols-12"
						>
							<Input
								className="md:col-span-4"
								value={line.title}
								onChange={(e) =>
									props.onUpdateLineItem(line.uid, { title: e.target.value })
								}
								placeholder="Item title"
							/>
							<Input
								className="md:col-span-2"
								type="number"
								min={0}
								value={line.qty}
								onChange={(e) =>
									props.onUpdateLineItem(line.uid, {
										qty: Number(e.target.value || 0),
									})
								}
								placeholder="Qty"
							/>
							<Input
								className="md:col-span-2"
								type="number"
								min={0}
								step="0.01"
								value={line.unitPrice}
								onChange={(e) =>
									props.onUpdateLineItem(line.uid, {
										unitPrice: Number(e.target.value || 0),
									})
								}
								placeholder="Unit Price"
							/>
							{lineTotalMode === "readonly" ? (
								<div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium md:col-span-2">
									{Number(
										props.getLineTotalValue?.(line) ??
											Number(line.qty || 0) * Number(line.unitPrice || 0),
									).toFixed(2)}
								</div>
							) : (
								<Input
									className="md:col-span-2"
									type="number"
									min={0}
									step="0.01"
									value={line.lineTotal}
									onChange={(e) =>
										props.onUpdateLineItem(line.uid, {
											lineTotal: Number(e.target.value || 0),
										})
									}
									placeholder="Line Total"
								/>
							)}
							<Button
								className="md:col-span-2"
								variant="destructive"
								onClick={() => props.onRemoveLineItem(line.uid)}
							>
								Remove
							</Button>
							<Input
								className="md:col-span-12"
								value={line.description || ""}
								onChange={(e) =>
									props.onUpdateLineItem(line.uid, {
										description: e.target.value,
									})
								}
								placeholder="Description"
							/>
							<div className="md:col-span-12">
								<details className="rounded-md border bg-muted/20 p-3">
									<summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										Advanced Details: Steps / Shelf / HPT / Doors
									</summary>
									<div className="mt-3 space-y-4">
										<div className="rounded-md border p-3">
											<div className="mb-2 flex items-center">
												<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Form Steps
												</p>
												<Button
													size="sm"
													variant="outline"
													className="ml-auto"
													onClick={() =>
														props.onUpdateLineItem(line.uid, {
															formSteps: [
																...(line.formSteps || []),
																{
																	id: null,
																	stepId: null,
																	value: "",
																	prodUid: "",
																	meta: {},
																},
															],
														})
													}
												>
													Add Step
												</Button>
											</div>
											<div className="space-y-2">
												{(line.formSteps || []).map((step, stepIndex) => (
													<div
														key={`step-${stepIndex}`}
														className="grid gap-2 md:grid-cols-12"
													>
														<Input
															className="md:col-span-2"
															type="number"
															value={step.stepId ?? ""}
															onChange={(e) =>
																props.onUpdateLineItem(line.uid, {
																	formSteps: updateStep(line, stepIndex, {
																		stepId: e.target.value
																			? Number(e.target.value)
																			: null,
																	}),
																})
															}
															placeholder="Step ID"
														/>
														<Input
															className="md:col-span-3"
															value={step.prodUid || ""}
															onChange={(e) =>
																props.onUpdateLineItem(line.uid, {
																	formSteps: updateStep(line, stepIndex, {
																		prodUid: e.target.value,
																	}),
																})
															}
															placeholder="Prod UID"
														/>
														<Input
															className="md:col-span-5"
															value={step.value || ""}
															onChange={(e) =>
																props.onUpdateLineItem(line.uid, {
																	formSteps: updateStep(line, stepIndex, {
																		value: e.target.value,
																	}),
																})
															}
															placeholder="Step value"
														/>
														<Button
															className="md:col-span-2"
															variant="destructive"
															onClick={() =>
																props.onUpdateLineItem(line.uid, {
																	formSteps: (line.formSteps || []).filter(
																		(_, i) => i !== stepIndex,
																	),
																})
															}
														>
															Remove
														</Button>
													</div>
												))}
											</div>
										</div>

										<div className="rounded-md border p-3">
											<div className="mb-2 flex items-center">
												<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
													Shelf Items
												</p>
												<Button
													size="sm"
													variant="outline"
													className="ml-auto"
													onClick={() =>
														props.onUpdateLineItem(line.uid, {
															shelfItems: [
																...(line.shelfItems || []),
																{
																	id: null,
																	categoryId: null,
																	productId: null,
																	description: "",
																	qty: 0,
																	unitPrice: 0,
																	totalPrice: 0,
																	meta: {},
																},
															],
														})
													}
												>
													Add Shelf
												</Button>
											</div>
											<div className="space-y-2">
												{(line.shelfItems || []).map((shelf, shelfIndex) => (
													<div
														key={`shelf-${shelfIndex}`}
														className="grid gap-2 md:grid-cols-12"
													>
														<Input
															className="md:col-span-2"
															type="number"
															value={shelf.categoryId ?? ""}
															onChange={(e) =>
																props.onUpdateLineItem(line.uid, {
																	shelfItems: updateShelf(line, shelfIndex, {
																		categoryId: e.target.value
																			? Number(e.target.value)
																			: null,
																	}),
																})
															}
															placeholder="Category"
														/>
														<Input
															className="md:col-span-2"
															type="number"
															value={shelf.productId ?? ""}
															onChange={(e) =>
																props.onUpdateLineItem(line.uid, {
																	shelfItems: updateShelf(line, shelfIndex, {
																		productId: e.target.value
																			? Number(e.target.value)
																			: null,
																	}),
																})
															}
															placeholder="Product"
														/>
														<Input
															className="md:col-span-3"
															value={shelf.description || ""}
															onChange={(e) =>
																props.onUpdateLineItem(line.uid, {
																	shelfItems: updateShelf(line, shelfIndex, {
																		description: e.target.value,
																	}),
																})
															}
															placeholder="Description"
														/>
														<Input
															className="md:col-span-1"
															type="number"
															value={shelf.qty ?? 0}
															onChange={(e) =>
																props.onUpdateLineItem(line.uid, {
																	shelfItems: updateShelf(line, shelfIndex, {
																		qty: Number(e.target.value || 0),
																	}),
																})
															}
															placeholder="Qty"
														/>
														<Input
															className="md:col-span-2"
															type="number"
															step="0.01"
															value={shelf.unitPrice ?? 0}
															onChange={(e) =>
																props.onUpdateLineItem(line.uid, {
																	shelfItems: updateShelf(line, shelfIndex, {
																		unitPrice: Number(e.target.value || 0),
																	}),
																})
															}
															placeholder="Unit"
														/>
														<Button
															className="md:col-span-2"
															variant="destructive"
															onClick={() =>
																props.onUpdateLineItem(line.uid, {
																	shelfItems: (line.shelfItems || []).filter(
																		(_, i) => i !== shelfIndex,
																	),
																})
															}
														>
															Remove
														</Button>
													</div>
												))}
											</div>
										</div>

										<div className="rounded-md border p-3">
											<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
												House Package Tool
											</p>
											<div className="grid gap-2 md:grid-cols-12">
												<Input
													className="md:col-span-3"
													value={line.housePackageTool?.doorType || ""}
													onChange={(e) =>
														props.onUpdateLineItem(line.uid, {
															housePackageTool: {
																...(line.housePackageTool || {}),
																doorType: e.target.value,
															},
														})
													}
													placeholder="Door Type"
												/>
												<Input
													className="md:col-span-2"
													type="number"
													value={line.housePackageTool?.dykeDoorId ?? ""}
													onChange={(e) =>
														props.onUpdateLineItem(line.uid, {
															housePackageTool: {
																...(line.housePackageTool || {}),
																dykeDoorId: e.target.value
																	? Number(e.target.value)
																	: null,
															},
														})
													}
													placeholder="Dyke Door"
												/>
												<Input
													className="md:col-span-2"
													type="number"
													value={line.housePackageTool?.moldingId ?? ""}
													onChange={(e) =>
														props.onUpdateLineItem(line.uid, {
															housePackageTool: {
																...(line.housePackageTool || {}),
																moldingId: e.target.value
																	? Number(e.target.value)
																	: null,
															},
														})
													}
													placeholder="Molding ID"
												/>
												<Input
													className="md:col-span-2"
													type="number"
													value={line.housePackageTool?.totalDoors ?? 0}
													onChange={(e) =>
														props.onUpdateLineItem(line.uid, {
															housePackageTool: {
																...(line.housePackageTool || {}),
																totalDoors: Number(e.target.value || 0),
															},
														})
													}
													placeholder="Doors"
												/>
												<Input
													className="md:col-span-3"
													type="number"
													step="0.01"
													value={line.housePackageTool?.totalPrice ?? 0}
													onChange={(e) =>
														props.onUpdateLineItem(line.uid, {
															housePackageTool: {
																...(line.housePackageTool || {}),
																totalPrice: Number(e.target.value || 0),
															},
														})
													}
													placeholder="HPT Total"
												/>
											</div>

											<div className="mt-3 space-y-2">
												<div className="flex items-center">
													<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
														Doors
													</p>
													<Button
														size="sm"
														variant="outline"
														className="ml-auto"
														onClick={() =>
															props.onUpdateLineItem(line.uid, {
																housePackageTool: {
																	...(line.housePackageTool || {}),
																	doors: [
																		...(line.housePackageTool?.doors || []),
																		{
																			id: null,
																			dimension: "",
																			swing: "",
																			lhQty: 0,
																			rhQty: 0,
																			totalQty: 0,
																			unitPrice: 0,
																			lineTotal: 0,
																			meta: {},
																		},
																	],
																},
															})
														}
													>
														Add Door
													</Button>
												</div>
												{(line.housePackageTool?.doors || []).map(
													(door, doorIndex) => (
														<div
															key={`door-${doorIndex}`}
															className="grid gap-2 md:grid-cols-12"
														>
															<Input
																className="md:col-span-4"
																value={door.dimension || ""}
																onChange={(e) =>
																	props.onUpdateLineItem(line.uid, {
																		housePackageTool: updateDoor(
																			line,
																			doorIndex,
																			{
																				dimension: e.target.value,
																			},
																		),
																	})
																}
																placeholder='Dimension (e.g. 2-6 x 6-8")'
															/>
															<Input
																className="md:col-span-2"
																value={door.swing || ""}
																onChange={(e) =>
																	props.onUpdateLineItem(line.uid, {
																		housePackageTool: updateDoor(
																			line,
																			doorIndex,
																			{ swing: e.target.value },
																		),
																	})
																}
																placeholder="Swing"
															/>
															<Input
																className="md:col-span-1"
																type="number"
																value={door.lhQty ?? 0}
																onChange={(e) =>
																	props.onUpdateLineItem(line.uid, {
																		housePackageTool: updateDoor(
																			line,
																			doorIndex,
																			{
																				lhQty: Number(e.target.value || 0),
																			},
																		),
																	})
																}
																placeholder="LH"
															/>
															<Input
																className="md:col-span-1"
																type="number"
																value={door.rhQty ?? 0}
																onChange={(e) =>
																	props.onUpdateLineItem(line.uid, {
																		housePackageTool: updateDoor(
																			line,
																			doorIndex,
																			{
																				rhQty: Number(e.target.value || 0),
																			},
																		),
																	})
																}
																placeholder="RH"
															/>
															<Input
																className="md:col-span-2"
																type="number"
																step="0.01"
																value={door.unitPrice ?? 0}
																onChange={(e) =>
																	props.onUpdateLineItem(line.uid, {
																		housePackageTool: updateDoor(
																			line,
																			doorIndex,
																			{
																				unitPrice: Number(e.target.value || 0),
																			},
																		),
																	})
																}
																placeholder="Unit"
															/>
															<Button
																className="md:col-span-2"
																variant="destructive"
																onClick={() =>
																	props.onUpdateLineItem(line.uid, {
																		housePackageTool: {
																			...(line.housePackageTool || {}),
																			doors: (
																				line.housePackageTool?.doors || []
																			).filter((_, i) => i !== doorIndex),
																		},
																	})
																}
															>
																Remove
															</Button>
														</div>
													),
												)}
											</div>
										</div>
									</div>
								</details>
							</div>
						</div>
					))
				)}
			</div>
		</section>
	);
}
