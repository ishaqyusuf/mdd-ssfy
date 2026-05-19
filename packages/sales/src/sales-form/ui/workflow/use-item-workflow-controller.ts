"use client";

import { useMemo } from "react";

import type { SalesFormLineItemRecord } from "../../application";

type WorkflowStep = NonNullable<SalesFormLineItemRecord["formSteps"]>[number];
type ResolveActiveStepIndex = (
	steps: WorkflowStep[],
	preferredIndex: number,
) => number;

export type ItemWorkflowOption = {
	uid: string;
	label: string;
	index: number;
};

export function useItemWorkflowController(args: {
	lineItems: SalesFormLineItemRecord[];
	activeItem: string | null;
	activeStepByLine: Record<string, number>;
	resolveActiveStepIndex: ResolveActiveStepIndex;
	getItemLabel: (line: SalesFormLineItemRecord, index: number) => string;
}) {
	const {
		lineItems,
		activeItem,
		activeStepByLine,
		resolveActiveStepIndex,
		getItemLabel,
	} = args;

	const activeLine =
		activeItem == null
			? null
			: lineItems.find((line) => line.uid === activeItem) || null;
	const activeLineSteps = activeLine?.formSteps || [];
	const activeStepIndex =
		activeLine == null
			? 0
			: resolveActiveStepIndex(
					activeLineSteps,
					activeStepByLine[String(activeLine.uid || "")] ??
						Math.max(0, activeLineSteps.length - 1),
				);
	const activeStep = activeLineSteps[activeStepIndex] || null;

	const itemOptions = useMemo(
		() =>
			lineItems.map((line, index) => ({
				uid: String(line.uid || ""),
				label: getItemLabel(line, index),
				index,
			})),
		[lineItems, getItemLabel],
	);

	return {
		activeLine,
		activeLineSteps,
		activeStepIndex,
		activeStep,
		itemOptions,
	};
}
