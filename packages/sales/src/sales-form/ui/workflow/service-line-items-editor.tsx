"use client";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { InputGroup } from "@gnd/ui/namespace";

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
			<div className="overflow-x-auto rounded-lg border">
				<table className="w-full min-w-[760px] table-fixed text-sm">
					<colgroup>
						<col />
						<col style={{ width: "6rem" }} />
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
					<thead>
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
					<tbody>
						{props.rows.map((row, index) => (
							<tr key={`service-row-${row.uid}-${index}`} className="border-t">
								<td className="min-w-0 px-3 py-2">
									<InputGroup className="h-8 w-full bg-card">
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
											className="h-8 w-full"
										/>
									</InputGroup>
								</td>
								<td className="px-3 py-2">
									<Input
										aria-label={`Service line ${index + 1} quantity`}
										type="number"
										value={row.qty || 0}
										onChange={(e) =>
											patchRow(index, {
												qty: Number(e.target.value || 0),
											} as Partial<TRow>)
										}
										className="h-8 text-right"
									/>
								</td>
								<td className="px-3 py-2">
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
											className="h-8 text-right"
										/>
									) : (
										<p className="text-right text-xs font-semibold">
											{props.formatMoney(row.unitPrice || 0) || "$0.00"}
										</p>
									)}
								</td>
								{canEditPricing ? (
									<>
										<td className="px-3 py-2 text-center">
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
										<td className="px-3 py-2 text-center">
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
								<td className="px-3 py-2 text-right text-xs font-bold">
									{props.formatMoney(row.lineTotal) || "$0.00"}
								</td>
								<td className="px-3 py-2 text-right">
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="size-7 text-muted-foreground hover:text-destructive"
										aria-label={`Delete service line ${index + 1}`}
										onClick={() => {
											const confirmed = window.confirm(
												`Delete service line ${index + 1}?`,
											);
											if (!confirmed) return;
											props.onRowsChange(
												props.rows.filter((_item, i) => i !== index),
											);
										}}
									>
										<Icons.Trash2 className="size-4" />
									</Button>
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
