"use client";

import type { ReactNode } from "react";

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
	onStepChange: (line: TLine, stepIndex: number) => void;
	renderPanel: (
		line: TLine,
		steps: WorkflowStepUiRecord[],
		activeIndex: number,
		activeStep: WorkflowStepUiRecord | undefined,
	) => ReactNode;
	isRedirectDisabledStep: (step: WorkflowStepUiRecord) => boolean;
	stepKey: (lineUid: string, stepIndex: number) => string;
	componentLabel: (value?: string | null) => string;
};

export function WorkflowLineList<TLine extends WorkflowLineListItem>(
	props: WorkflowLineListProps<TLine>,
) {
	return (
		<section>
			<div className="divide-y divide-border/40">
				{props.items.map(({ line, index }) => {
					const lineUid = String(line.uid || `line-${index}`);
					const isActive = lineUid === props.activeLineUid;
					const steps = line.formSteps || [];
					const activeIndex = props.resolveActiveStepIndex(
						steps,
						props.activeStepByLine[lineUid] ??
							resolveInitialWorkflowStepIndex(steps),
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
							onStepChange={(stepIndex) =>
								props.onStepChange(line, stepIndex)
							}
							isRedirectDisabledStep={props.isRedirectDisabledStep}
							stepKey={props.stepKey}
							componentLabel={props.componentLabel}
						>
							{props.renderPanel(line, steps, activeIndex, activeStep)}
						</InvoiceItemCard>
					);
				})}
			</div>
		</section>
	);
}
