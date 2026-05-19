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

export type ServiceLineItemsEditorProps<
	TRow extends ServiceLineItemEditorRow,
> = {
	rows: TRow[];
	formatMoney: (value?: number | null) => string | null;
	createRow: (nextIndex: number) => TRow;
	onRowsChange: (rows: TRow[]) => void;
};

export function ServiceLineItemsEditor<TRow extends ServiceLineItemEditorRow>(
	props: ServiceLineItemsEditorProps<TRow>,
) {
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
						<col style={{ width: "5rem" }} />
						<col style={{ width: "6rem" }} />
						<col style={{ width: "7rem" }} />
						<col style={{ width: "6rem" }} />
					</colgroup>
					<thead>
						<tr className="bg-muted/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							<th className="px-3 py-2">Service</th>
							<th className="px-3 py-2 text-right">Qty</th>
							<th className="px-3 py-2 text-right">Price</th>
							<th className="px-3 py-2 text-center">Tax</th>
							<th className="px-3 py-2 text-center">Prod</th>
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
									<Input
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
								</td>
								<td className="px-3 py-2 text-center">
									<Checkbox
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
										checked={Boolean(row.produceable)}
										onCheckedChange={(checked) =>
											patchRow(index, {
												produceable: Boolean(checked),
											} as Partial<TRow>)
										}
									/>
								</td>
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
