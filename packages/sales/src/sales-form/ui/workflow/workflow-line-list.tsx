/** @jsxImportSource react */
"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { Button } from "@gnd/ui/button";
import { Icon } from "@gnd/ui/icons";
import {
	InvoiceItemCard,
	type WorkflowStepUiRecord,
} from "./invoice-item-card";
import { resolveInitialWorkflowStepIndex } from "./workflow-records";

export type WorkflowLineListItem = {
	uid?: string | null;
	title?: string | null;
	formSteps?: WorkflowStepUiRecord[] | null;
	[key: string]: unknown;
};

export type WorkflowLineListEntry<TLine extends WorkflowLineListItem> = {
	line: TLine;
	index: number;
};

export type WorkflowLineListProps<TLine extends WorkflowLineListItem> = {
	items: WorkflowLineListEntry<TLine>[];
	activeLineUid?: string | null;
	activeStepByLine: Record<string, number>;
	resolveActiveStepIndex: (
		steps: WorkflowStepUiRecord[],
		candidateIndex: number,
	) => number;
	getLineTitlePlaceholder: (line: TLine) => string | null;
	getLineDisplayTotal: (line: TLine) => number;
	onActivateLine: (line: TLine, isActive: boolean) => void;
	onTitleChange: (line: TLine, value: string) => void;
	onRemoveLine: (line: TLine) => void;
	onDuplicateLine?: (line: TLine) => void;
	onMoveLine?: (line: TLine, targetIndex: number) => void;
	onAddLine?: () => void;
	onStepChange: (line: TLine, stepIndex: number) => void;
	renderPanel: (
		line: TLine,
		steps: WorkflowStepUiRecord[],
		activeIndex: number,
		activeStep: WorkflowStepUiRecord | undefined,
		isActive: boolean,
	) => ReactNode;
	isRedirectDisabledStep: (step: WorkflowStepUiRecord) => boolean;
	stepKey: (lineUid: string, stepIndex: number) => string;
	componentLabel: (value?: string | null) => string;
};

export function resolveNewlyAddedActiveLineUid(
	previousLineUids: string[],
	currentLineUids: string[],
	activeLineUid?: string | null,
) {
	if (!activeLineUid || previousLineUids.includes(activeLineUid)) return null;
	return currentLineUids.includes(activeLineUid) ? activeLineUid : null;
}

export function WorkflowLineList<TLine extends WorkflowLineListItem>(
	props: WorkflowLineListProps<TLine>,
) {
	const currentLineUidKey = props.items
		.map(({ line, index }) => String(line.uid || `line-${index}`))
		.join("\u001f");
	const previousLineUidsRef = useRef(
		props.items.map(({ line, index }) => String(line.uid || `line-${index}`)),
	);

	useEffect(() => {
		const nextLineUids = currentLineUidKey
			? currentLineUidKey.split("\u001f")
			: [];
		const newlyAddedActiveLineUid = resolveNewlyAddedActiveLineUid(
			previousLineUidsRef.current,
			nextLineUids,
			props.activeLineUid,
		);
		previousLineUidsRef.current = nextLineUids;
		if (!newlyAddedActiveLineUid) return;

		const animationFrame = window.requestAnimationFrame(() => {
			const lineElement = document.getElementById(
				`sales-form-item-${newlyAddedActiveLineUid}`,
			);
			lineElement?.scrollIntoView({
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
					? "auto"
					: "smooth",
				block: "start",
			});
		});

		return () => window.cancelAnimationFrame(animationFrame);
	}, [currentLineUidKey, props.activeLineUid]);

	return (
		<section>
			<div className="divide-y divide-border/40">
				{props.items.map(({ line, index }) => {
					const lineUid = String(line.uid || `line-${index}`);
					const isActive = lineUid === props.activeLineUid;
					const steps = line.formSteps || [];
					const initialStepIndex = resolveInitialWorkflowStepIndex(steps);
					const activeIndex = props.resolveActiveStepIndex(
						steps,
						isActive
							? (props.activeStepByLine[lineUid] ?? initialStepIndex)
							: initialStepIndex,
					);
					const activeStep = steps[activeIndex];

					return (
						<InvoiceItemCard
							key={lineUid}
							index={index}
							uid={lineUid}
							isActive={isActive}
							isExpanded
							disableCollapseTrigger
							title={line.title}
							titlePlaceholder={props.getLineTitlePlaceholder(line)}
							lineTotal={props.getLineDisplayTotal(line)}
							steps={steps}
							activeIndex={activeIndex}
							onActivate={() => props.onActivateLine(line, isActive)}
							onTitleChange={(value) => props.onTitleChange(line, value)}
							onRemove={() => props.onRemoveLine(line)}
							itemCount={props.items.length}
							onDuplicate={
								props.onDuplicateLine
									? () => props.onDuplicateLine?.(line)
									: undefined
							}
							onMoveTo={
								props.onMoveLine
									? (targetIndex) => props.onMoveLine?.(line, targetIndex)
									: undefined
							}
							onStepChange={(stepIndex) => props.onStepChange(line, stepIndex)}
							isRedirectDisabledStep={props.isRedirectDisabledStep}
							stepKey={props.stepKey}
							componentLabel={props.componentLabel}
						>
							{props.renderPanel(
								line,
								steps,
								activeIndex,
								activeStep,
								isActive,
							)}
						</InvoiceItemCard>
					);
				})}
			</div>
			{props.onAddLine ? (
				<div className="border-t border-border/40 p-4">
					<Button
						type="button"
						variant="secondary"
						className="w-full gap-2 uppercase"
						onClick={props.onAddLine}
					>
						<Icon name="Plus" className="size-4" />
						Add New Line
					</Button>
				</div>
			) : null}
		</section>
	);
}
