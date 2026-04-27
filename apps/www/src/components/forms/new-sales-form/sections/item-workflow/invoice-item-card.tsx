"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";

import type { NewSalesFormLineItem } from "../../schema";

type WorkflowStep = NonNullable<NewSalesFormLineItem["formSteps"]>[number];

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function InvoiceItemCard(props: {
	index: number;
	uid: string;
	isActive: boolean;
	disableCollapseTrigger?: boolean;
	title?: string | null;
	titlePlaceholder?: string | null;
	lineTotal?: number | null;
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
	const isCollapsed = !props.isActive;
	const collapseTriggerDisabled = !!props.disableCollapseTrigger;

	return (
		<div
			role={isCollapsed && !collapseTriggerDisabled ? "button" : undefined}
			tabIndex={isCollapsed && !collapseTriggerDisabled ? 0 : undefined}
			className={`rounded-xl border bg-background p-4 transition-all ${
				props.isActive ? "block" : "hidden lg:block"
			} ${
				props.isActive
					? "border-primary ring-1 ring-primary/20"
					: collapseTriggerDisabled
						? "border-border/50 opacity-95"
						: "cursor-pointer border-border/50 opacity-95 hover:border-primary/50 hover:opacity-100"
			}`}
			onClick={() => {
				if (collapseTriggerDisabled) return;
				if (!isCollapsed) return;
				props.onActivate();
			}}
			onKeyDown={(event) => {
				if (collapseTriggerDisabled) return;
				if (!isCollapsed) return;
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				props.onActivate();
			}}
		>
			<div className="grid gap-4 md:grid-cols-12">
				<button
					type="button"
					className="text-left md:col-span-2"
					onClick={(event) => {
						event.stopPropagation();
						if (collapseTriggerDisabled) return;
						props.onActivate();
					}}
					disabled={collapseTriggerDisabled}
				>
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Item {props.index + 1}
					</p>
				</button>
				<div className="md:col-span-8">
					<Input
						value={props.title || ""}
						onChange={(e) => props.onTitleChange(e.target.value)}
						placeholder={props.titlePlaceholder || "Item Title / Location"}
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
					/>
				</div>
				<div className="flex items-center justify-end gap-2 md:col-span-2">
					<span className="text-sm font-bold text-foreground">
						{currency(props.lineTotal)}
					</span>
					<Button
						size="icon"
						variant="outline"
						onClick={(event) => {
							event.stopPropagation();
							if (collapseTriggerDisabled) return;
							props.onActivate();
						}}
						disabled={collapseTriggerDisabled}
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
						onClick={(event) => {
							event.stopPropagation();
							props.onRemove();
						}}
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
							onClick={(event) => {
								event.stopPropagation();
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
