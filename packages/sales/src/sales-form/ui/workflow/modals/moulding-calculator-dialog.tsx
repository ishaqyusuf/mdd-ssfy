/** @jsxImportSource react */
"use client";

import { useMemo, useState } from "react";
import { Icons } from "@gnd/ui/icons";

import type { SalesFormLineItemRecord } from "../../../application";

function toNumber(value: unknown, fallback = 0) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

interface MouldingCalculatorDialogProps {
	open: boolean;
	onOpenChange: (next: boolean) => void;
	line: SalesFormLineItemRecord;
	onApply: (linePatch: Partial<SalesFormLineItemRecord>) => void;
}

export function MouldingCalculatorDialog(props: MouldingCalculatorDialogProps) {
	const moldingMeta =
		(props.line?.housePackageTool?.molding as any)?.meta || {};
	const [budget, setBudget] = useState<string>(
		String(
			toNumber(moldingMeta.budget, toNumber(props.line?.lineTotal, 0)).toFixed(
				2,
			),
		),
	);
	const [wastePct, setWastePct] = useState<number>(
		toNumber(moldingMeta.wastePct, 10),
	);
	const [selectedLength, setSelectedLength] = useState<string>(
		String(toNumber(moldingMeta.pieceLengthLf, 16)),
	);
	const parsedBudget = Math.max(0, toNumber(budget, 0));
	const pricePerLF = Math.max(
		0.01,
		toNumber(
			moldingMeta.pricePerLF,
			toNumber(props.line?.unitPrice, 2.45) || 2.45,
		),
	);
	const calculatedBaseLF = parsedBudget / pricePerLF;
	const totalFootage = Math.round(
		calculatedBaseLF * (1 + Math.max(0, wastePct) / 100),
	);
	const lengthVal = Math.max(1, parseInt(selectedLength || "16", 10) || 16);
	const totalPieces = Math.ceil(totalFootage / lengthVal);

	const calc = useMemo(() => {
		const adjusted = calculatedBaseLF * (1 + Math.max(0, wastePct) / 100);
		const pieces = lengthVal > 0 ? Math.ceil(adjusted / lengthVal) : 0;
		const totalLf = Number((pieces * lengthVal).toFixed(2));
		return {
			adjustedLf: Number(adjusted.toFixed(2)),
			pieces,
			totalLf,
		};
	}, [calculatedBaseLF, lengthVal, wastePct]);

	if (!props.open) return null;

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
			onClick={() => props.onOpenChange(false)}
		>
			<div
				className="relative w-full max-w-[440px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
					<div className="flex flex-col">
						<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							Price-Based Calculator
						</span>
						<h2 className="text-lg font-bold leading-tight text-foreground">
							{String(props.line?.title || "FLAT BOARD 1 X 6").toUpperCase()}
						</h2>
					</div>
					<button
						onClick={() => props.onOpenChange(false)}
						className="text-muted-foreground transition-colors hover:text-foreground"
					>
						<Icons.X className="size-6" />
					</button>
				</div>

				<div className="max-h-[70vh] space-y-8 overflow-y-auto p-6">
					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<span className="text-sm font-bold text-primary">$</span>
							<h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
								Project Needs
							</h3>
						</div>
						<div className="flex flex-col gap-2">
							<label className="text-sm font-medium text-muted-foreground">
								Total Budget / Price
							</label>
							<div className="relative group">
								<span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">
									$
								</span>
								<input
									className="h-12 w-full rounded-lg border border-input bg-background pl-8 pr-4 text-lg font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
									placeholder="0.00"
									type="number"
									value={budget}
									onChange={(e) => setBudget(e.target.value)}
								/>
							</div>
						</div>
					</section>

					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<Icons.Calculator size={16} className="text-primary" />
							<h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
								Product Specs
							</h3>
						</div>
						<div className="space-y-4">
							<div>
								<label className="mb-3 block text-sm font-medium text-muted-foreground">
									Piece Length Selection
								</label>
								<div className="grid grid-cols-4 gap-2">
									{["8", "12", "16", "17"].map((len) => (
										<button
											key={len}
											onClick={() => setSelectedLength(len)}
											className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
												selectedLength === len
													? "border-primary bg-primary text-primary-foreground shadow-sm"
													: "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
											}`}
										>
											{len}'
										</button>
									))}
								</div>
							</div>
							<div className="flex flex-col gap-2">
								<label className="text-sm font-medium text-muted-foreground">
									Price per Foot (Derived)
								</label>
								<div className="relative">
									<span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
										$
									</span>
									<input
										className="h-10 w-full cursor-not-allowed rounded-lg border border-border bg-muted/50 pl-8 pr-16 text-sm font-medium text-muted-foreground outline-none"
										readOnly
										type="text"
										value={pricePerLF.toFixed(2)}
									/>
									<span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground">
										Per LF
									</span>
								</div>
							</div>
						</div>
					</section>

					<section className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Icons.Trash2 size={16} className="text-primary" />
								<h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
									Waste Factor
								</h3>
							</div>
							<span className="rounded bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
								{wastePct}%
							</span>
						</div>
						<div className="space-y-4">
							<input
								className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
								type="range"
								min="0"
								max="30"
								value={wastePct}
								onChange={(e) => setWastePct(parseInt(e.target.value, 10))}
							/>
							<p className="text-[11px] italic leading-normal text-muted-foreground">
								* Waste is added to the calculated footage before determining
								piece count.
							</p>
						</div>
					</section>

					<section className="rounded-xl border border-border bg-muted/30 p-5">
						<div className="mb-4 flex items-center gap-2">
							<Icons.CheckCircle2 size={16} className="text-primary" />
							<h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
								Results
							</h3>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col">
								<span className="text-[11px] font-semibold uppercase text-muted-foreground">
									Total Pieces
								</span>
								<span className="text-3xl font-bold text-foreground">
									{totalPieces}
								</span>
							</div>
							<div className="flex flex-col text-right">
								<span className="text-[11px] font-semibold uppercase text-muted-foreground">
									Total Footage
								</span>
								<span className="text-3xl font-bold text-foreground">
									{totalFootage}{" "}
									<span className="text-sm font-normal text-muted-foreground">
										LF
									</span>
								</span>
							</div>
						</div>
						<div className="mt-3 border-t border-border pt-3">
							<div className="flex justify-between text-[11px]">
								<span className="text-muted-foreground">
									Budget (${parsedBudget.toFixed(2)}) ÷ ${pricePerLF.toFixed(2)}
									/LF
								</span>
								<span className="font-medium text-muted-foreground">
									{calculatedBaseLF.toFixed(1)} LF Base + {wastePct}% Waste
								</span>
							</div>
						</div>
					</section>
				</div>

				<div className="border-t border-border bg-card p-6">
					<button
						onClick={() => {
							const computedLineTotal =
								toNumber(props.line.unitPrice, 0) > 0
									? Number(
											(totalPieces * toNumber(props.line.unitPrice, 0)).toFixed(
												2,
											),
										)
									: Number((totalFootage * pricePerLF).toFixed(2));
							props.onApply({
								qty: totalPieces,
								lineTotal: computedLineTotal,
								housePackageTool: {
									...(props.line.housePackageTool || { id: null }),
									molding: {
										...(props.line.housePackageTool?.molding || {
											id: null,
											title: "Moulding",
											value: "",
											price: null,
										}),
										value: `${totalFootage} LF`,
										price: computedLineTotal,
										meta: {
											budget: parsedBudget,
											wastePct,
											pieceLengthLf: lengthVal,
											pricePerLF,
											calculatedBaseLF,
											totalLengthLf: totalFootage,
											adjustedLf: calc.adjustedLf,
											pieces: totalPieces,
											totalLf: calc.totalLf,
										},
									} as any,
								} as any,
							} as any);
							props.onOpenChange(false);
						}}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
					>
						<Icons.CheckCircle2 size={20} />
						Apply to Invoice
					</button>
					<p className="mt-4 text-center text-[11px] text-muted-foreground">
						Calculated pieces will be applied to your line item quantity.
					</p>
				</div>
			</div>
		</div>
	);
}
