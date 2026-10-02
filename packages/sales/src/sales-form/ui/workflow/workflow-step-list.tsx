/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useEffect, useId, useRef, useState } from "react";
import { middleTruncateText } from "./workflow-format";

export type WorkflowStepListVersion = "v1" | "v2";

export type WorkflowStepUiRecord = {
	value?: string | null;
	step?: {
		title?: string | null;
	} | null;
	[key: string]: unknown;
};

export type WorkflowStepListProps = {
	version?: WorkflowStepListVersion;
	lineUid: string;
	steps: WorkflowStepUiRecord[];
	activeIndex: number;
	onStepChange: (index: number) => void;
	isRedirectDisabledStep: (step: WorkflowStepUiRecord) => boolean;
	stepKey: (lineUid: string, stepIndex: number) => string;
	componentLabel: (value?: string | null) => string;
};

const STEP_PILL_COMPONENT_LABEL_MAX_LENGTH = 24;

function getStepLabel(
	step: WorkflowStepUiRecord,
	stepIndex: number,
	componentLabel: WorkflowStepListProps["componentLabel"],
) {
	return step.value
		? componentLabel(step.value)
		: step.step?.title || `Step ${stepIndex + 1}`;
}

function WorkflowStepListV1(props: WorkflowStepListProps) {
	return (
		<div
			data-slot="workflow-step-list"
			data-version="v1"
			className="mt-3 flex flex-wrap items-center gap-2"
		>
			{props.steps.map((step, stepIndex) => {
				const stepLabel = getStepLabel(step, stepIndex, props.componentLabel);
				const stepPillLabel = step.value
					? middleTruncateText(stepLabel, STEP_PILL_COMPONENT_LABEL_MAX_LENGTH)
					: stepLabel;

				return (
					<button
						key={props.stepKey(props.lineUid, stepIndex)}
						type="button"
						title={stepLabel}
						aria-current={props.activeIndex === stepIndex ? "step" : undefined}
						aria-label={`Open ${stepLabel}`}
						className={`max-w-full max-lg:min-h-11 rounded-full border px-3 py-1 text-xs transition-colors duration-200 motion-reduce:transition-none sm:max-w-56 ${
							props.activeIndex === stepIndex
								? "border-primary-foreground/50 bg-primary text-primary-foreground shadow-sm"
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
						<span className="block overflow-hidden text-ellipsis whitespace-nowrap uppercase">
							{stepPillLabel}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function WorkflowStepListV2(props: WorkflowStepListProps) {
	const scrollId = useId();
	const scrollRef = useRef<HTMLOListElement>(null);
	const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

	useEffect(() => {
		const list = scrollRef.current;
		if (!list) return;
		const measure = () => {
			const left = list.scrollLeft > 1;
			const right = list.scrollLeft < list.scrollWidth - list.clientWidth - 1;
			setScrollEdges((current) =>
				current.left === left && current.right === right
					? current
					: { left, right },
			);
		};
		const observer = new ResizeObserver(measure);
		observer.observe(list);
		props.steps.forEach((_, index) => {
			const child = list.children.item(index);
			if (child) observer.observe(child);
		});
		list.addEventListener("scroll", measure, { passive: true });
		measure();
		return () => {
			observer.disconnect();
			list.removeEventListener("scroll", measure);
		};
	}, [props.steps]);

	useEffect(() => {
		if (!props.steps[props.activeIndex]) return;
		const list = scrollRef.current;
		const active = list?.children
			.item(props.activeIndex)
			?.querySelector<HTMLElement>("button");
		if (!list || !active || window.matchMedia("(min-width: 1024px)").matches)
			return;
		const listRect = list.getBoundingClientRect();
		const activeRect = active.getBoundingClientRect();
		const delta =
			activeRect.left < listRect.left
				? activeRect.left - listRect.left - 8
				: activeRect.right > listRect.right
					? activeRect.right - listRect.right + 8
					: 0;
		if (delta) list.scrollBy({ left: delta, behavior: "auto" });
	}, [props.activeIndex, props.steps]);

	const scroll = (direction: -1 | 1) => {
		const list = scrollRef.current;
		if (!list) return;
		list.scrollBy({
			left: direction * list.clientWidth * 0.8,
			behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
		});
	};

	return (
		<nav
			data-slot="workflow-step-list"
			data-version="v2"
			aria-label="Item configuration steps"
			className="-mx-4 min-w-0 min-h-[43px] border-b border-border/60 bg-muted/30 max-lg:flex max-lg:items-center max-lg:gap-1 max-lg:px-1"
		>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-11 shrink-0 lg:hidden"
				aria-label="Scroll steps left"
				aria-controls={scrollId}
				disabled={!scrollEdges.left}
				onClick={(event) => {
					event.stopPropagation();
					scroll(-1);
				}}
			>
				<Icons.ChevronLeft className="size-5" />
			</Button>
			<ol
				id={scrollId}
				ref={scrollRef}
				className="flex flex-wrap items-center px-3.5 py-2 max-lg:min-w-0 max-lg:flex-1 max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:px-0 max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden"
			>
				{props.steps.map((step, stepIndex) => {
					const stepLabel = getStepLabel(step, stepIndex, props.componentLabel);
					const isActive = props.activeIndex === stepIndex;
					const isDisabled = props.isRedirectDisabledStep(step);

					return (
						<li
							key={props.stepKey(props.lineUid, stepIndex)}
							className="flex shrink-0 items-center"
						>
							{stepIndex > 0 ? (
								<span
									aria-hidden="true"
									className="px-2 text-xs text-muted-foreground/40"
								>
									/
								</span>
							) : null}
							<button
								type="button"
								title={stepLabel}
								aria-current={isActive ? "step" : undefined}
								aria-label={`Open ${stepLabel}`}
								className={`max-lg:min-h-11 max-lg:max-w-[min(14rem,calc(100vw-8rem))] max-lg:truncate rounded-[5px] py-1 text-xs whitespace-nowrap uppercase transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none ${
									isActive
										? "bg-primary/10 px-2 font-bold text-primary"
										: isDisabled
											? "cursor-not-allowed text-muted-foreground/45"
											: "font-normal text-muted-foreground hover:text-foreground"
								}`}
								disabled={isDisabled}
								onClick={(event) => {
									event.stopPropagation();
									if (isDisabled) return;
									props.onStepChange(stepIndex);
								}}
							>
								{stepLabel}
							</button>
						</li>
					);
				})}
			</ol>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-11 shrink-0 lg:hidden"
				aria-label="Scroll steps right"
				aria-controls={scrollId}
				disabled={!scrollEdges.right}
				onClick={(event) => {
					event.stopPropagation();
					scroll(1);
				}}
			>
				<Icons.ChevronRight className="size-5" />
			</Button>
		</nav>
	);
}

export function WorkflowStepList(props: WorkflowStepListProps) {
	if (!props.steps.length) return null;

	return props.version === "v2" ? (
		<WorkflowStepListV2 {...props} />
	) : (
		<WorkflowStepListV1 {...props} />
	);
}
