/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { InputGroup } from "@gnd/ui/namespace";
import { type ReactNode, useEffect, useState } from "react";
import { middleTruncateText } from "./workflow-format";

export type WorkflowStepUiRecord = {
	value?: string | null;
	step?: {
		title?: string | null;
	} | null;
	[key: string]: unknown;
};

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

const STEP_PILL_COMPONENT_LABEL_MAX_LENGTH = 24;
const STEP_PANEL_ANIMATION_MS = 200;

function AnimatedStepPanel(props: {
	children?: ReactNode;
	panelKey: string;
}) {
	const isOpen = props.children != null;
	const [renderedPanel, setRenderedPanel] = useState({
		children: props.children,
		key: props.panelKey,
	});
	const [isVisible, setIsVisible] = useState(isOpen);
	const isSwitchingStep = isOpen && renderedPanel.key !== props.panelKey;
	const panelIsVisible = isVisible && isOpen && !isSwitchingStep;
	const displayedChildren =
		isOpen && !isSwitchingStep ? props.children : renderedPanel.children;

	useEffect(() => {
		let animationFrame: number | undefined;
		let timeout: number | undefined;

		if (!isOpen) {
			setIsVisible(false);
			timeout = window.setTimeout(
				() =>
					setRenderedPanel((current) => ({
						...current,
						children: null,
					})),
				STEP_PANEL_ANIMATION_MS,
			);
		} else if (renderedPanel.key !== props.panelKey) {
			setIsVisible(false);
			timeout = window.setTimeout(
				() =>
					setRenderedPanel({
						children: props.children,
						key: props.panelKey,
					}),
				STEP_PANEL_ANIMATION_MS,
			);
		} else {
			setRenderedPanel({
				children: props.children,
				key: props.panelKey,
			});
			animationFrame = window.requestAnimationFrame(() => setIsVisible(true));
		}

		return () => {
			if (animationFrame != null) window.cancelAnimationFrame(animationFrame);
			if (timeout != null) window.clearTimeout(timeout);
		};
	}, [isOpen, props.children, props.panelKey, renderedPanel.key]);

	return (
		<div
			data-slot="workflow-step-panel"
			aria-hidden={panelIsVisible ? undefined : true}
			inert={!panelIsVisible}
			className={`grid transition-[grid-template-rows,opacity,transform] duration-200 ease-out motion-reduce:transition-none ${
				panelIsVisible
					? "grid-rows-[1fr] translate-y-0 opacity-100"
					: "pointer-events-none grid-rows-[0fr] -translate-y-1 opacity-0"
			}`}
		>
			<div className="min-h-0 overflow-hidden">
				{displayedChildren != null ? (
					<div
						key={renderedPanel.key}
						className="mt-4 animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
					>
						{displayedChildren}
					</div>
				) : null}
			</div>
		</div>
	);
}

export type InvoiceItemCardProps = {
	index: number;
	uid: string;
	isActive: boolean;
	disableCollapseTrigger?: boolean;
	title?: string | null;
	titlePlaceholder?: string | null;
	lineTotal?: number | null;
	steps: WorkflowStepUiRecord[];
	activeIndex: number;
	isExpanded?: boolean;
	onActivate: () => void;
	onTitleChange: (value: string) => void;
	onRemove: () => void;
	onStepChange: (index: number) => void;
	isRedirectDisabledStep: (step: WorkflowStepUiRecord) => boolean;
	stepKey: (lineUid: string, stepIndex: number) => string;
	componentLabel: (value?: string | null) => string;
	children?: ReactNode;
};

export function InvoiceItemCard(props: InvoiceItemCardProps) {
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
			<div className="-mx-4 -mt-4 grid gap-3 bg-muted p-4 md:grid-cols-12">
				<div className="min-w-0 md:col-span-10">
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
							aria-label={`Item ${props.index + 1} title`}
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
						variant="outline"
						className="size-8 border-destructive bg-secondary text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
						onClick={(event) => {
							event.stopPropagation();
							props.onRemove();
						}}
						aria-label={`Remove item ${props.index + 1}`}
					>
						<Icons.Trash2 className="size-3.5 text-current" />
					</Button>
				</div>
			</div>

			{props.steps.length ? (
				<div className="mt-3 flex flex-wrap items-center gap-2">
					{props.steps.map((step, stepIndex) => {
						const stepLabel = step.value
							? props.componentLabel(step.value)
							: step.step?.title || `Step ${stepIndex + 1}`;
						const stepPillLabel = step.value
							? middleTruncateText(
									stepLabel,
									STEP_PILL_COMPONENT_LABEL_MAX_LENGTH,
								)
							: stepLabel;

						return (
							<button
								key={props.stepKey(props.uid, stepIndex)}
								type="button"
								title={stepLabel}
								aria-current={
									props.activeIndex === stepIndex ? "step" : undefined
								}
								aria-label={`Open ${stepLabel}`}
								className={`max-w-full rounded-full border px-3 py-1 text-xs transition-colors duration-200 motion-reduce:transition-none sm:max-w-56 ${
									props.activeIndex === stepIndex
										? "border-primary bg-primary/10 text-primary"
										: props.isRedirectDisabledStep(step)
											? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
											: "text-muted-foreground hover:bg-muted-foreground hover:text-muted"
								}`}
								disabled={props.isRedirectDisabledStep(step)}
								onClick={(event) => {
									event.stopPropagation();
									if (props.isRedirectDisabledStep(step)) return;
									props.onStepChange(stepIndex);
								}}
							>
								<span className="block overflow-hidden text-ellipsis whitespace-nowrap">
									{stepPillLabel}
								</span>
							</button>
						);
					})}
				</div>
			) : null}
			<AnimatedStepPanel panelKey={`${props.uid}-${props.activeIndex}`}>
				{isExpanded ? props.children : null}
			</AnimatedStepPanel>
		</div>
	);
}
