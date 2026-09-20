/** @jsxImportSource react */
"use client";

import { Button, buttonVariants } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { InputGroup } from "@gnd/ui/namespace";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
	WorkflowStepList,
	type WorkflowStepListVersion,
	type WorkflowStepUiRecord,
} from "./workflow-step-list";

export type { WorkflowStepUiRecord } from "./workflow-step-list";

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function uppercaseItemTitle(value?: string | null) {
	return String(value || "").toUpperCase();
}

const STEP_PANEL_ANIMATION_MS = 200;

export function getInvoiceItemMoveTargets(index: number, itemCount: number) {
	return Array.from({ length: Math.max(0, itemCount) }, (_, targetIndex) => ({
		index: targetIndex,
		label: `Item ${targetIndex + 1}`,
		disabled: targetIndex === index,
	}));
}

function InvoiceItemActionsMenu(props: {
	index: number;
	itemCount: number;
	onDuplicate?: () => void;
	onMoveTo?: (targetIndex: number) => void;
}) {
	if (!props.onDuplicate && !props.onMoveTo) return null;
	const moveTargets = getInvoiceItemMoveTargets(props.index, props.itemCount);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				type="button"
				className={buttonVariants({
					variant: "outline",
					size: "icon",
					className: "size-8",
				})}
				aria-label={`Item ${props.index + 1} actions`}
				onClick={(event) => event.stopPropagation()}
			>
				<Icons.MoreHorizontal className="size-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				onClick={(event) => event.stopPropagation()}
			>
				{props.onDuplicate ? (
					<DropdownMenuItem onClick={props.onDuplicate}>
						<Icons.Copy className="mr-2 size-4" />
						Make Copy
					</DropdownMenuItem>
				) : null}
				{props.onMoveTo ? (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={props.itemCount <= 1}>
							<Icons.DriveFileMove className="mr-2 size-4" />
							Move To
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							{moveTargets.map((target) => (
								<DropdownMenuItem
									key={target.index}
									disabled={target.disabled}
									onClick={() => props.onMoveTo?.(target.index)}
								>
									{target.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

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
	const latestChildrenRef = useRef(props.children);
	if (isOpen) latestChildrenRef.current = props.children;
	const isSwitchingStep = isOpen && renderedPanel.key !== props.panelKey;
	const panelIsVisible = isVisible && isOpen && !isSwitchingStep;
	const displayedChildren =
		isOpen && !isSwitchingStep ? props.children : renderedPanel.children;

	useEffect(() => {
		let animationFrame: number | undefined;
		let timeout: number | undefined;

		if (!isOpen) {
			setIsVisible(false);
			setRenderedPanel((current) => ({
				...current,
				children: latestChildrenRef.current,
			}));
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
			setRenderedPanel({
				children: latestChildrenRef.current,
				key: props.panelKey,
			});
		} else {
			animationFrame = window.requestAnimationFrame(() => setIsVisible(true));
		}

		return () => {
			if (animationFrame != null) window.cancelAnimationFrame(animationFrame);
			if (timeout != null) window.clearTimeout(timeout);
		};
	}, [isOpen, props.panelKey, renderedPanel.key]);

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
	stepListVersion?: WorkflowStepListVersion;
	activeIndex: number;
	isExpanded?: boolean;
	onActivate: () => void;
	onTitleChange: (value: string) => void;
	onRemove: () => void;
	itemCount?: number;
	onDuplicate?: () => void;
	onMoveTo?: (targetIndex: number) => void;
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
			id={`sales-form-item-${props.uid}`}
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
				<div className="min-w-0 md:col-span-10 md:pr-3">
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
							onBlur={(e) =>
								props.onTitleChange(uppercaseItemTitle(e.currentTarget.value))
							}
							placeholder={uppercaseItemTitle(
								props.titlePlaceholder || "Description",
							)}
							className="h-10 text-sm uppercase"
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
					<InvoiceItemActionsMenu
						index={props.index}
						itemCount={props.itemCount || 0}
						onDuplicate={props.onDuplicate}
						onMoveTo={props.onMoveTo}
					/>
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

			<WorkflowStepList
				version={props.stepListVersion}
				lineUid={props.uid}
				steps={props.steps}
				activeIndex={props.activeIndex}
				onStepChange={props.onStepChange}
				isRedirectDisabledStep={props.isRedirectDisabledStep}
				stepKey={props.stepKey}
				componentLabel={props.componentLabel}
			/>
			<AnimatedStepPanel panelKey={`${props.uid}-${props.activeIndex}`}>
				{isExpanded ? props.children : null}
			</AnimatedStepPanel>
		</div>
	);
}
