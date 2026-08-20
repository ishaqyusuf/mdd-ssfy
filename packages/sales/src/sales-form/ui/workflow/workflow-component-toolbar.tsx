/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type WorkflowComponentToolbarProps = {
	count: number;
	total: number;
	search: string;
	maxWidthClassName?: string;
	actionSlot?: ReactNode;
	menuSlot?: ReactNode;
	onSearchChange: (value: string) => void;
};

type WorkflowToolbarMode = "fixed" | "anchored" | "hidden";

export function resolveWorkflowToolbarMode(input: {
	boundaryTop: number;
	boundaryBottom: number;
	viewportTop: number;
	viewportBottom: number;
	footerGap: number;
}): WorkflowToolbarMode {
	const visible =
		input.boundaryTop < input.viewportBottom &&
		input.boundaryBottom > input.viewportTop;
	if (!visible) return "hidden";
	return input.boundaryBottom > input.viewportBottom - input.footerGap
		? "fixed"
		: "anchored";
}

function getScrollParent(node: HTMLElement | null): HTMLElement | Window {
	let current = node?.parentElement || null;
	while (current) {
		const overflowY = window.getComputedStyle(current).overflowY;
		if (["auto", "scroll", "overlay"].includes(overflowY)) return current;
		current = current.parentElement;
	}
	return window;
}

export function WorkflowComponentToolbar(props: WorkflowComponentToolbarProps) {
	const toolbarRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{
		mode: WorkflowToolbarMode;
		left: number;
		width: number;
		bottom: number;
	}>({ mode: "hidden", left: 0, width: 0, bottom: 0 });

	useEffect(() => {
		const toolbar = toolbarRef.current;
		const boundary = toolbar?.closest<HTMLElement>(
			'[data-workflow-component-boundary="true"]',
		);
		if (!toolbar || !boundary) return;
		const scrollParent = getScrollParent(boundary);
		let frame: number | null = null;

		const measure = () => {
			frame = null;
			const boundaryRect = boundary.getBoundingClientRect();
			const viewport =
				scrollParent === window
					? { top: 0, bottom: window.innerHeight }
					: (() => {
							const rect = (
								scrollParent as HTMLElement
							).getBoundingClientRect();
							return { top: rect.top, bottom: rect.bottom };
						})();
			const footerGap = window.matchMedia("(min-width: 1024px)").matches
				? 56
				: 84;
			const next = {
				mode: resolveWorkflowToolbarMode({
					boundaryTop: boundaryRect.top,
					boundaryBottom: boundaryRect.bottom,
					viewportTop: viewport.top,
					viewportBottom: viewport.bottom,
					footerGap,
				}),
				left: boundaryRect.left + boundaryRect.width / 2,
				width: boundaryRect.width,
				bottom: footerGap,
			};
			setPosition((current) =>
				current.mode === next.mode &&
				Math.abs(current.left - next.left) < 0.5 &&
				Math.abs(current.width - next.width) < 0.5 &&
				current.bottom === next.bottom
					? current
					: next,
			);
		};
		const scheduleMeasure = () => {
			if (frame != null) return;
			frame = window.requestAnimationFrame(measure);
		};

		scrollParent.addEventListener("scroll", scheduleMeasure, { passive: true });
		window.addEventListener("resize", scheduleMeasure, { passive: true });
		const observer = new ResizeObserver(scheduleMeasure);
		observer.observe(boundary);
		measure();

		return () => {
			scrollParent.removeEventListener("scroll", scheduleMeasure);
			window.removeEventListener("resize", scheduleMeasure);
			observer.disconnect();
			if (frame != null) window.cancelAnimationFrame(frame);
		};
	}, []);

	const toolbar = (
		<div
			ref={toolbarRef}
			aria-hidden={position.mode === "hidden"}
			style={
				position.mode === "fixed"
					? {
							left: position.left,
							width: position.width,
							bottom: position.bottom,
						}
					: undefined
			}
			className={
				position.mode === "hidden"
					? "hidden"
					: position.mode === "fixed"
						? "fixed z-30 flex -translate-x-1/2 justify-center px-2 lg:px-0"
						: "absolute inset-x-0 bottom-0 z-10 flex justify-center px-2 lg:px-0"
			}
		>
			<div
				className={`flex w-full min-w-0 flex-col gap-2 rounded-lg border border-slate-200 bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center ${
					props.maxWidthClassName || "max-w-3xl"
				}`}
			>
				<div className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					<span>
						{props.count}
						{props.count !== props.total ? ` of ${props.total}` : ""} components
					</span>
				</div>
				<div className="min-w-0 flex-1">
					<Input
						value={props.search}
						onChange={(event) => props.onSearchChange(event.target.value)}
						placeholder="Search components..."
						className="h-9 w-full border-slate-200 bg-white"
					/>
				</div>
				{props.menuSlot ? (
					<Menu
						Trigger={
							<Button
								type="button"
								size="icon"
								variant="outline"
								className="size-9"
								aria-label="Workflow component options"
							>
								<Icons.Filter className="size-4" />
							</Button>
						}
					>
						{props.menuSlot}
					</Menu>
				) : null}
				{props.actionSlot ? (
					<div className="w-full sm:w-auto">{props.actionSlot}</div>
				) : null}
			</div>
		</div>
	);

	return position.mode === "fixed" && typeof document !== "undefined"
		? createPortal(toolbar, document.body)
		: toolbar;
}
