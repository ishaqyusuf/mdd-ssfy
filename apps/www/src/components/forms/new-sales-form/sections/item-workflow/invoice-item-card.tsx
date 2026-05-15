"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { InputGroup } from "@gnd/ui/namespace";

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
	isExpanded?: boolean;
	onActivate: () => void;
	onTitleChange: (value: string) => void;
	onRemove: () => void;
	onStepChange: (index: number) => void;
	isRedirectDisabledStep: (step: WorkflowStep) => boolean;
	stepKey: (lineUid: string, stepIndex: number) => string;
	componentLabel: (value?: string | null) => string;
	children?: React.ReactNode;
}) {
	const isExpanded = props.isExpanded ?? props.isActive;
	const isCollapsed = !isExpanded;
	const collapseTriggerDisabled = !!props.disableCollapseTrigger;

	return (
		<div
			role={isCollapsed && !collapseTriggerDisabled ? "button" : undefined}
			tabIndex={isCollapsed && !collapseTriggerDisabled ? 0 : undefined}
			className={`bg-background p-4 transition-all ${
				isExpanded ? "block" : "hidden lg:block"
			} ${
				props.isActive
					? "bg-muted/20"
					: collapseTriggerDisabled
						? "opacity-95"
						: "cursor-pointer opacity-95 hover:opacity-100"
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
				<div className="md:col-span-10">
					<InputGroup
						className="h-10 bg-card"
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
					>
						<InputGroup.Addon align="inline-start">
							<InputGroup.Text className="text-xs font-bold uppercase tracking-wide">
								ITEM {props.index + 1}:
							</InputGroup.Text>
						</InputGroup.Addon>
						<InputGroup.Input
							value={props.title || ""}
							onChange={(e) => props.onTitleChange(e.target.value)}
							placeholder={props.titlePlaceholder || "Description"}
							className="h-10 text-sm"
						/>
					</InputGroup>
				</div>
				<div className="flex items-center justify-end gap-2 md:col-span-2">
					<span className="text-sm font-bold text-foreground">
						{currency(props.lineTotal)}
					</span>
					{collapseTriggerDisabled ? null : (
						<Button
							size="icon"
							variant="outline"
							onClick={(event) => {
								event.stopPropagation();
								props.onActivate();
							}}
							aria-label={isExpanded ? "Collapse item" : "Expand item"}
						>
							{isExpanded ? (
								<Icons.ChevronUp className="size-4" />
							) : (
								<Icons.ChevronDown className="size-4" />
							)}
						</Button>
					)}
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
					{props.steps.map((step, stepIndex) => {
						const stepLabel = step.value
							? props.componentLabel(step.value)
							: step.step?.title || `Step ${stepIndex + 1}`;

						return (
							<button
								key={props.stepKey(props.uid, stepIndex)}
								type="button"
								title={stepLabel}
								className={`max-w-full rounded-full border px-3 py-1 text-xs sm:max-w-56 ${
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
								<span className="block truncate">{stepLabel}</span>
							</button>
						);
					})}
				</div>
			) : null}
			{isExpanded ? <div className="mt-4">{props.children}</div> : null}
		</div>
	);
}
