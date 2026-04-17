"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";

import type { NewSalesFormLineItem } from "../../schema";

type WorkflowStep = NonNullable<NewSalesFormLineItem["formSteps"]>[number];

export function InvoiceItemCard(props: {
	index: number;
	uid: string;
	isActive: boolean;
	title?: string | null;
	steps: WorkflowStep[];
	activeIndex: number;
	onActivate: () => void;
	onTitleChange: (value: string) => void;
	onRemove: () => void;
	onStepChange: (index: number) => void;
	isRedirectDisabledStep: (step: WorkflowStep) => boolean;
	stepKey: (lineUid: string, stepIndex: number) => string;
	componentLabel: (value?: string | null) => string;
	children?: React.ReactNode;
}) {
	return (
		<div
			className={`rounded-xl border bg-background p-4 transition-all ${
				props.isActive ? "block" : "hidden lg:block"
			} ${
				props.isActive
					? "border-primary ring-1 ring-primary/20"
					: "border-border/50 opacity-95 hover:border-border/70 hover:opacity-100"
			}`}
		>
			<div className="grid gap-3 md:grid-cols-12">
				<button
					type="button"
					className="text-left md:col-span-2"
					onClick={props.onActivate}
				>
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Item {props.index + 1}
					</p>
				</button>
				<div className="md:col-span-8">
					<Input
						value={props.title || ""}
						onChange={(e) => props.onTitleChange(e.target.value)}
						placeholder="Item Title / Location"
					/>
				</div>
				<div className="flex items-center justify-end gap-2 md:col-span-2">
					<Button
						size="icon"
						variant="outline"
						onClick={props.onActivate}
						aria-label={props.isActive ? "Collapse item" : "Expand item"}
					>
						{props.isActive ? (
							<Icons.ChevronUp className="size-4" />
						) : (
							<Icons.ChevronDown className="size-4" />
						)}
					</Button>
					<Button
						size="icon"
						variant="destructive"
						onClick={props.onRemove}
						aria-label={`Remove item ${props.index + 1}`}
					>
						<Icons.Trash2 className="size-4" />
					</Button>
				</div>
			</div>

			{props.steps.length ? (
				<div className="mt-3 flex flex-wrap items-center gap-2">
					{props.steps.map((step, stepIndex) => (
						<button
							key={props.stepKey(props.uid, stepIndex)}
							type="button"
							className={`rounded-full border px-3 py-1 text-xs ${
								props.activeIndex === stepIndex
									? "border-primary bg-primary/10 text-primary"
									: props.isRedirectDisabledStep(step)
										? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
										: "text-muted-foreground"
							}`}
							disabled={props.isRedirectDisabledStep(step)}
							onClick={() => {
								if (props.isRedirectDisabledStep(step)) return;
								props.onStepChange(stepIndex);
							}}
						>
							{step.value
								? props.componentLabel(step.value)
								: step.step?.title || `Step ${stepIndex + 1}`}
						</button>
					))}
				</div>
			) : null}
			{props.isActive ? <div className="mt-4">{props.children}</div> : null}
		</div>
	);
}
