"use client";

import { useMemo } from "react";

import type { NewSalesFormLineItem } from "../../schema";

type WorkflowStep = NonNullable<NewSalesFormLineItem["formSteps"]>[number];
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
	lineItems: NewSalesFormLineItem[];
	activeItem: string | null;
	activeStepByLine: Record<string, number>;
	resolveActiveStepIndex: ResolveActiveStepIndex;
	getItemLabel: (line: NewSalesFormLineItem, index: number) => string;
}) {
	const {
		lineItems,
		activeItem,
		activeStepByLine,
		resolveActiveStepIndex,
		getItemLabel,
	} = args;

	const activeLine =
		lineItems.find((line) => line.uid === activeItem) || lineItems[0] || null;
	const activeLineSteps = activeLine?.formSteps || [];
	const activeStepIndex =
		activeLine == null
			? 0
			: resolveActiveStepIndex(
					activeLineSteps,
					activeStepByLine[activeLine.uid] ??
						Math.max(0, activeLineSteps.length - 1),
				);
	const activeStep = activeLineSteps[activeStepIndex] || null;

	const itemOptions = useMemo(
		() =>
			lineItems.map((line, index) => ({
				uid: line.uid,
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
