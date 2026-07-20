/** @jsxImportSource react */
"use client";

import { useMemo, useState } from "react";
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

import type { SalesFormLineItemRecord } from "../../../application";
import {
	multiplyMoney,
	sumMoney,
} from "../../../../payment-system/domain/money";

type DoorLine = NonNullable<
	NonNullable<SalesFormLineItemRecord["housePackageTool"]>["doors"]
>[number];

function toNumber(value: unknown, fallback = 0) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
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
		lineTotal: multiplyMoney(totalQty, unitPrice),
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

interface DoorDetailsDialogProps {
	open: boolean;
	onOpenChange: (next: boolean) => void;
	line: SalesFormLineItemRecord;
	onApply: (linePatch: Partial<SalesFormLineItemRecord>) => void;
}

export function DoorDetailsDialog(props: DoorDetailsDialogProps) {
	const [rows, setRows] = useState<DoorLine[]>(
		(props.line.housePackageTool?.doors || []).map(calcDoorRow),
	);

	const totals = useMemo(() => {
		const normalized = rows.map(calcDoorRow);
		const totalDoors = normalized.reduce(
			(sum, row) => sum + toNumber(row.totalQty),
			0,
		);
		const totalPrice = sumMoney(
			normalized.map((row) => toNumber(row.lineTotal)),
		);
		return {
			totalDoors,
			totalPrice,
			normalized,
		};
	}, [rows]);

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent
				onOpenAutoFocus={(event) => event.preventDefault()}
				className="flex h-[80dvh] max-h-[720px] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden"
			>
				<DialogHeader className="shrink-0">
					<DialogTitle>Door Details</DialogTitle>
					<DialogDescription>
						Configure door sizes, swings, quantities, and pricing.
					</DialogDescription>
				</DialogHeader>
				<div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-lg border p-3">
					<div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						<p className="col-span-3">Dimension</p>
						<p className="col-span-2">Swing</p>
						<p className="col-span-2">LH Qty</p>
						<p className="col-span-2">RH Qty</p>
						<p className="col-span-2">Unit Price</p>
						<p className="col-span-1">Remove</p>
					</div>
					{rows.map((row, index) => (
						<div key={`door-row-${index}`} className="grid grid-cols-12 gap-2">
							<Input
								className="col-span-3"
								value={row.dimension || ""}
								onChange={(e) =>
									setRows((prev) =>
										prev.map((item, ri) =>
											ri === index
												? {
														...item,
														dimension: e.target.value,
													}
												: item,
										),
									)
								}
								placeholder="2-8 x 8-0"
							/>
							<Input
								className="col-span-2"
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
							<Input
								className="col-span-2"
								type="number"
								value={row.lhQty || 0}
								onChange={(e) =>
									setRows((prev) =>
										prev.map((item, ri) =>
											ri === index
												? calcDoorRow({
														...item,
														lhQty: toNumber(e.target.value),
													})
												: item,
										),
									)
								}
							/>
							<Input
								className="col-span-2"
								type="number"
								value={row.rhQty || 0}
								onChange={(e) =>
									setRows((prev) =>
										prev.map((item, ri) =>
											ri === index
												? calcDoorRow({
														...item,
														rhQty: toNumber(e.target.value),
													})
												: item,
										),
									)
								}
							/>
							<Input
								className="col-span-2"
								type="number"
								step="0.01"
								value={row.unitPrice || 0}
								onChange={(e) =>
									setRows((prev) =>
										prev.map((item, ri) =>
											ri === index
												? calcDoorRow({
														...item,
														unitPrice: toNumber(e.target.value),
													})
												: item,
										),
									)
								}
							/>
							<Button
								className="col-span-1"
								variant="destructive"
								onClick={() =>
									setRows((prev) => prev.filter((_, ri) => ri !== index))
								}
							>
								X
							</Button>
							<p className="col-span-12 text-right text-xs text-muted-foreground">
								Qty: {toNumber(calcDoorRow(row).totalQty)} | Line Total: ${" "}
								{toNumber(calcDoorRow(row).lineTotal).toFixed(2)}
							</p>
						</div>
					))}
				</div>

				<div className="flex shrink-0 items-center gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
					<Button
						size="sm"
						variant="outline"
						onClick={() => setRows((prev) => [...prev, blankDoorRow()])}
					>
						Add Door Row
					</Button>
					<p className="ml-auto">
						Total Doors:{" "}
						<span className="font-semibold">{totals.totalDoors}</span>
					</p>
					<p>
						Total:{" "}
						<span className="font-semibold">
							${totals.totalPrice.toFixed(2)}
						</span>
					</p>
				</div>

				<DialogFooter className="shrink-0">
					<Button variant="outline" onClick={() => props.onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={() => {
							props.onApply({
								housePackageTool: {
									...(props.line.housePackageTool || {
										id: null,
									}),
									doors: totals.normalized,
									totalDoors: totals.totalDoors,
									totalPrice: totals.totalPrice,
								} as any,
								qty: totals.totalDoors || props.line.qty,
								lineTotal: totals.totalPrice || props.line.lineTotal,
							} as any);
							props.onOpenChange(false);
						}}
					>
						Apply Door Details
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
