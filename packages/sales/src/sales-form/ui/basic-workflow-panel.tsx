/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Textarea } from "@gnd/ui/textarea";
import { multiplyMoney } from "../../payment-system/domain/money";
import {
	componentLabel,
	getLineTitlePlaceholder,
	getWorkflowLineDisplayTotal,
	isRedirectDisabledStep,
	resolveInteractiveStepIndex,
	stepKey,
	WorkflowLineList,
	type WorkflowLineListEntry,
	type WorkflowLineListItem,
	type WorkflowStepUiRecord,
} from "./workflow";

export type SalesFormBasicWorkflowLine = WorkflowLineListItem & {
	uid: string;
	title?: string | null;
	description?: string | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
};

export type SalesFormBasicWorkflowPanelProps<
	TLine extends SalesFormBasicWorkflowLine = SalesFormBasicWorkflowLine,
> = {
	lineItems: TLine[];
	activeLineUid?: string | null;
	activeStepByLine?: Record<string, number>;
	lineTotalMode?: "editable" | "readonly";
	getLineTotalValue?: (line: TLine) => number;
	onAddLineItem: () => void;
	onUpdateLineItem: (uid: string, patch: Partial<TLine>) => void;
	onRemoveLineItem: (uid: string) => void;
	onActiveLineChange?: (uid: string) => void;
	onStepChange?: (uid: string, stepIndex: number) => void;
};

function numberValue(value?: number | null) {
	const next = Number(value || 0);
	return Number.isFinite(next) ? next : 0;
}

export function SalesFormBasicWorkflowPanel<
	TLine extends SalesFormBasicWorkflowLine = SalesFormBasicWorkflowLine,
>(props: SalesFormBasicWorkflowPanelProps<TLine>) {
	const activeLineUid = props.activeLineUid || props.lineItems[0]?.uid || null;
	const entries: WorkflowLineListEntry<TLine>[] = props.lineItems.map(
		(line, index) => ({
			line,
			index,
		}),
	);
	const lineTotalMode = props.lineTotalMode || "editable";

	return (
		<section className="overflow-hidden rounded-lg border bg-background">
			<div className="flex items-center gap-3 border-b bg-card px-4 py-3">
				<div className="min-w-0">
					<p className="text-sm font-semibold">Quote Items</p>
					<p className="text-xs text-muted-foreground">
						Build each quote line as an invoice item.
					</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					className="ml-auto"
					onClick={props.onAddLineItem}
				>
					Add Item
				</Button>
			</div>
			<WorkflowLineList
				items={entries}
				activeLineUid={activeLineUid}
				activeStepByLine={props.activeStepByLine || {}}
				resolveActiveStepIndex={resolveInteractiveStepIndex}
				getLineTitlePlaceholder={getLineTitlePlaceholder}
				getLineDisplayTotal={(line) =>
					props.getLineTotalValue?.(line) ?? getWorkflowLineDisplayTotal(line)
				}
				onActivateLine={(line) => {
					const uid = String(line.uid || "");
					if (uid) props.onActiveLineChange?.(uid);
				}}
				onTitleChange={(line, value) =>
					props.onUpdateLineItem(String(line.uid || ""), {
						title: value,
					} as Partial<TLine>)
				}
				onRemoveLine={(line) => props.onRemoveLineItem(String(line.uid || ""))}
				onStepChange={(line, stepIndex) =>
					props.onStepChange?.(String(line.uid || ""), stepIndex)
				}
				isRedirectDisabledStep={isRedirectDisabledStep}
				stepKey={stepKey}
				componentLabel={componentLabel}
				renderPanel={(line, steps, activeIndex, activeStep) => (
					<BasicWorkflowLineEditor
						line={line}
						steps={steps}
						activeIndex={activeIndex}
						activeStep={activeStep}
						lineTotalMode={lineTotalMode}
						getLineTotalValue={props.getLineTotalValue}
						onUpdateLineItem={props.onUpdateLineItem}
					/>
				)}
			/>
		</section>
	);
}

function BasicWorkflowLineEditor<TLine extends SalesFormBasicWorkflowLine>({
	line,
	steps,
	activeIndex,
	activeStep,
	lineTotalMode,
	getLineTotalValue,
	onUpdateLineItem,
}: {
	line: TLine;
	steps: WorkflowStepUiRecord[];
	activeIndex: number;
	activeStep?: WorkflowStepUiRecord;
	lineTotalMode: "editable" | "readonly";
	getLineTotalValue?: (line: TLine) => number;
	onUpdateLineItem: (uid: string, patch: Partial<TLine>) => void;
}) {
	const lineUid = String(line.uid || "");
	const computedTotal =
		getLineTotalValue?.(line) ??
		multiplyMoney(numberValue(line.qty), numberValue(line.unitPrice));

	return (
		<div className="space-y-4">
			<div className="grid gap-3 md:grid-cols-12">
				<label className="space-y-2 md:col-span-2">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Qty
					</span>
					<Input
						type="number"
						min={0}
						value={numberValue(line.qty)}
						onChange={(event) =>
							onUpdateLineItem(lineUid, {
								qty: Number(event.target.value || 0),
							} as Partial<TLine>)
						}
					/>
				</label>
				<label className="space-y-2 md:col-span-3">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Base Unit Price
					</span>
					<Input
						type="number"
						min={0}
						step="0.01"
						value={numberValue(line.unitPrice)}
						onChange={(event) =>
							onUpdateLineItem(lineUid, {
								unitPrice: Number(event.target.value || 0),
							} as Partial<TLine>)
						}
					/>
				</label>
				<label className="space-y-2 md:col-span-3">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Display Total
					</span>
					{lineTotalMode === "readonly" ? (
						<div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">
							{computedTotal.toFixed(2)}
						</div>
					) : (
						<Input
							type="number"
							min={0}
							step="0.01"
							value={numberValue(line.lineTotal)}
							onChange={(event) =>
								onUpdateLineItem(lineUid, {
									lineTotal: Number(event.target.value || 0),
								} as Partial<TLine>)
							}
						/>
					)}
				</label>
				<div className="space-y-2 md:col-span-4">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Workflow Step
					</span>
					<div className="flex h-9 items-center rounded-md border bg-muted/20 px-3 text-sm">
						{steps.length
							? activeStep?.value ||
								activeStep?.step?.title ||
								`Step ${activeIndex + 1}`
							: "Flat quote item"}
					</div>
				</div>
			</div>
			<label className="block space-y-2">
				<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Description
				</span>
				<Textarea
					value={line.description || ""}
					onChange={(event) =>
						onUpdateLineItem(lineUid, {
							description: event.target.value,
						} as Partial<TLine>)
					}
					placeholder="Add item notes, dimensions, or scope details"
					className="min-h-20"
				/>
			</label>
		</div>
	);
}
