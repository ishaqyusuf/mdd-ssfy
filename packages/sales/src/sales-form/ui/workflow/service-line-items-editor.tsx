/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { Input } from "@gnd/ui/input";
import { InputGroup } from "@gnd/ui/namespace";
import { SalesFormQuantityStepper } from "./sales-form-quantity-stepper";

export type ServiceLineItemEditorRow = {
	uid?: string | null;
	service?: string | null;
	taxxable?: boolean | null;
	produceable?: boolean | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	[key: string]: unknown;
};

export type ServiceLineItemsEditorProps<TRow extends ServiceLineItemEditorRow> =
	{
		rows: TRow[];
		formatMoney: (value?: number | null) => string | null;
		canEditPricing?: boolean;
		createRow: (nextIndex: number) => TRow;
		onRowsChange: (rows: TRow[]) => void;
	};

export function ServiceLineItemsEditor<TRow extends ServiceLineItemEditorRow>(
	props: ServiceLineItemsEditorProps<TRow>,
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

	return (
		<div className="space-y-3">
			<div className="overflow-x-auto rounded-lg border max-lg:overflow-visible max-lg:rounded-none max-lg:border-0">
				<table className="w-full min-w-[800px] table-fixed text-sm max-lg:min-w-0 max-lg:table-auto">
					<colgroup className="max-lg:hidden">
						<col />
						<col style={{ width: "9.5rem" }} />
						<col style={{ width: "7rem" }} />
						{canEditPricing ? (
							<>
								<col style={{ width: "5rem" }} />
								<col style={{ width: "6rem" }} />
							</>
						) : null}
						<col style={{ width: "7rem" }} />
						<col style={{ width: "6rem" }} />
					</colgroup>
					<thead className="max-lg:hidden">
						<tr className="bg-muted/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							<th className="px-3 py-2">Service</th>
							<th className="px-3 py-2 text-right">Qty</th>
							<th className="px-3 py-2 text-right">Price</th>
							{canEditPricing ? (
								<>
									<th className="px-3 py-2 text-center">Tax</th>
									<th className="px-3 py-2 text-center">Prod</th>
								</>
							) : null}
							<th className="px-3 py-2 text-right">Total</th>
							<th className="px-3 py-2 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="max-lg:grid max-lg:divide-y">
						{props.rows.map((row, index) => (
							<tr
								key={`service-row-${row.uid}-${index}`}
								className="border-t max-lg:grid max-lg:grid-cols-6 max-lg:gap-x-2 max-lg:gap-y-3 max-lg:border-0 max-lg:bg-transparent max-lg:p-3"
							>
								<td className="min-w-0 px-3 py-2 max-lg:col-span-6 max-lg:col-start-1 max-lg:row-start-1 max-lg:p-0">
									<div className="max-lg:flex max-lg:items-end max-lg:gap-2">
										<div className="min-w-0 max-lg:flex-1">
											<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">
												Service
											</p>
											<InputGroup className="h-8 w-full bg-card max-lg:h-10">
												<InputGroup.Addon align="inline-start">
													<InputGroup.Text className="text-xs font-semibold text-muted-foreground">
														{index + 1}.
													</InputGroup.Text>
												</InputGroup.Addon>
												<InputGroup.Input
													aria-label={`Service line ${index + 1} name`}
													value={row.service || ""}
													onChange={(e) =>
														patchRow(index, {
															service: e.target.value,
														} as Partial<TRow>)
													}
													placeholder="Service"
													className="h-8 w-full max-lg:h-10"
												/>
											</InputGroup>
										</div>
										<ConfirmBtn
											type="button"
											size="icon"
											variant="ghost"
											trash
											className="size-7 shrink-0 text-muted-foreground hover:text-destructive max-lg:size-10 lg:hidden"
											aria-label={`Delete service line ${index + 1}`}
											confirmLabel={`Confirm delete service line ${index + 1}`}
											onClick={() =>
												props.onRowsChange(
													props.rows.filter((_item, i) => i !== index),
												)
											}
										/>
									</div>
								</td>
								<td className="px-3 py-2 max-lg:col-span-2 max-lg:col-start-1 max-lg:row-start-3 max-lg:min-w-0 max-lg:p-0">
									<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">
										Quantity
									</p>
									<SalesFormQuantityStepper
										label={`Service line ${index + 1} quantity`}
										value={row.qty}
										min={0}
										onChange={(value) =>
											patchRow(index, {
												qty: value,
											} as Partial<TRow>)
										}
										className="w-32 max-lg:h-10 max-lg:w-full"
									/>
								</td>
								<td className="px-3 py-2 max-lg:col-span-2 max-lg:col-start-3 max-lg:row-start-3 max-lg:min-w-0 max-lg:p-0">
									<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">
										Unit price
									</p>
									{canEditPricing ? (
										<Input
											aria-label={`Service line ${index + 1} unit price`}
											type="number"
											step="0.01"
											value={row.unitPrice || 0}
											onChange={(e) =>
												patchRow(index, {
													unitPrice: Number(e.target.value || 0),
												} as Partial<TRow>)
											}
											className="h-8 text-right max-lg:h-10"
										/>
									) : (
										<p className="text-right text-xs font-semibold">
											{props.formatMoney(row.unitPrice || 0) || "$0.00"}
										</p>
									)}
								</td>
								{canEditPricing ? (
									<>
										<td className="px-3 py-2 text-center max-lg:col-span-3 max-lg:col-start-1 max-lg:row-start-2 max-lg:flex max-lg:min-h-10 max-lg:items-center max-lg:justify-between max-lg:rounded-md max-lg:border">
											<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">Tax</span>
											<Checkbox
												aria-label={`Service line ${index + 1} taxable`}
												checked={Boolean(row.taxxable)}
												onCheckedChange={(checked) =>
													patchRow(index, {
														taxxable: Boolean(checked),
													} as Partial<TRow>)
												}
											/>
										</td>
										<td className="px-3 py-2 text-center max-lg:col-span-3 max-lg:col-start-4 max-lg:row-start-2 max-lg:flex max-lg:min-h-10 max-lg:items-center max-lg:justify-between max-lg:rounded-md max-lg:border">
											<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">Production</span>
											<Checkbox
												aria-label={`Service line ${index + 1} production`}
												checked={Boolean(row.produceable)}
												onCheckedChange={(checked) =>
													patchRow(index, {
														produceable: Boolean(checked),
													} as Partial<TRow>)
												}
											/>
										</td>
									</>
								) : null}
								<td className="px-3 py-2 text-right text-xs font-bold max-lg:col-span-2 max-lg:col-start-5 max-lg:row-start-3 max-lg:min-w-0 max-lg:p-0">
									<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">Line total</p>
									<div className="hidden h-10 items-center justify-end rounded-md border bg-muted/40 px-3 text-sm font-semibold text-foreground max-lg:flex" aria-label={`Service line ${index + 1} total`}>
										{props.formatMoney(row.lineTotal) || "$0.00"}
									</div>
									<span className="max-lg:hidden">{props.formatMoney(row.lineTotal) || "$0.00"}</span>
								</td>
								<td className="px-3 py-2 text-right max-lg:hidden">
									<ConfirmBtn
										type="button"
										size="icon"
										variant="ghost"
										trash
										className="size-7 text-muted-foreground hover:text-destructive max-lg:size-10"
										aria-label={`Delete service line ${index + 1}`}
										confirmLabel={`Confirm delete service line ${index + 1}`}
										onClick={() =>
											props.onRowsChange(
												props.rows.filter((_item, i) => i !== index),
											)
										}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<Button
				type="button"
				variant="secondary"
				className="w-full uppercase"
				onClick={() =>
					props.onRowsChange([
						...props.rows,
						props.createRow(props.rows.length + 1),
					])
				}
			>
				Add New Line
			</Button>
		</div>
	);
}
