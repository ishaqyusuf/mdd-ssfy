/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type WorkflowComponentToolbarProps = {
	count: number;
	total: number;
	search: string;
	maxWidthClassName?: string;
	actionSlot?: ReactNode;
	menuSlot?: ReactNode;
	label?: string;
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
	const searchId = useId();
	const [searchOpen, setSearchOpen] = useState(Boolean(props.search));
	const mobileSearchRef = useRef<HTMLInputElement>(null);
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
		const mobileFooter = document.querySelector<HTMLElement>(
			"[data-sales-form-mobile-footer]",
		);
		let frame: number | null = null;

		const measure = () => {
			frame = null;
			if (!window.matchMedia("(min-width: 1024px)").matches) {
				setPosition((current) =>
					current.mode === "hidden" ? current : { ...current, mode: "hidden" },
				);
				return;
			}
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
				: Math.max(
						84,
						(mobileFooter?.getBoundingClientRect().height || 0) + 12,
					);
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
		if (mobileFooter) observer.observe(mobileFooter);
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
						? "fixed z-30 hidden -translate-x-1/2 justify-center lg:flex"
						: "absolute inset-x-0 bottom-0 z-10 hidden justify-center lg:flex"
			}
		>
			<div
				className={`flex w-full min-w-0 flex-col gap-2 rounded-lg border border-slate-200 bg-background/95 p-3 shadow-lg backdrop-blur max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] sm:flex-row sm:items-center ${
					props.maxWidthClassName || "max-w-3xl"
				}`}
			>
				<div className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground max-sm:sr-only">
					<span>
						{props.count}
						{props.count !== props.total ? ` of ${props.total}` : ""} components
					</span>
				</div>
				<div className="min-w-0 flex-1 max-sm:col-start-1 max-sm:row-start-1">
					<Input
						value={props.search}
						onChange={(event) => props.onSearchChange(event.target.value)}
						placeholder="Search components..."
						className="h-9 w-full border-slate-200 bg-white max-sm:h-11 max-sm:text-base"
					/>
				</div>
				{props.menuSlot ? (
					<Menu
						Trigger={
							<Button
								type="button"
								size="icon"
								variant="outline"
								className="size-9 max-sm:size-11 max-sm:col-start-2 max-sm:row-start-1"
								aria-label="Workflow component options"
							>
								<Icons.MoreVertical className="size-4" />
							</Button>
						}
					>
						{props.menuSlot}
					</Menu>
				) : null}
				{props.actionSlot ? (
					<div className="w-full sm:w-auto max-sm:col-span-2 max-sm:row-start-2 max-sm:[&_button]:min-h-11">
						{props.actionSlot}
					</div>
				) : null}
			</div>
		</div>
	);

	return (
		<>
			<div className="mb-3 space-y-2 lg:hidden">
				<div className="flex min-w-0 items-center justify-between gap-2">
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{props.label ||
							`${props.count}${props.count !== props.total ? ` of ${props.total}` : ""} components`}
					</p>
					<div className="flex shrink-0 gap-1">
						<Button
							type="button"
							size="icon"
							variant="ghost"
							className="size-11"
							aria-label="Search components"
							aria-expanded={searchOpen}
							aria-controls={searchId}
							onClick={() => {
								const open = !searchOpen;
								setSearchOpen(open);
								if (open)
									requestAnimationFrame(() => mobileSearchRef.current?.focus());
							}}
						>
							<Icons.Search className="size-5" />
						</Button>
						{props.menuSlot || props.actionSlot ? (
							<Menu
								presentation="sheet"
								title="Step options"
								Trigger={
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="size-11"
										aria-label="More step options"
									>
										<Icons.MoreVertical className="size-5" />
									</Button>
								}
							>
								{props.menuSlot}
								{props.actionSlot ? (
									<div className="pt-2 [&_button]:min-h-11">
										{props.actionSlot}
									</div>
								) : null}
							</Menu>
						) : null}
					</div>
				</div>
				{searchOpen ? (
					<div id={searchId} className="flex gap-2">
						<Input
							ref={mobileSearchRef}
							type="search"
							aria-label="Filter components"
							placeholder="Search components..."
							value={props.search}
							onChange={(event) => props.onSearchChange(event.target.value)}
							className="h-11 min-w-0 flex-1 text-base"
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-11 shrink-0"
							aria-label="Clear component search"
							onClick={() => {
								props.onSearchChange("");
								mobileSearchRef.current?.focus();
							}}
						>
							<Icons.X className="size-4" />
						</Button>
					</div>
				) : null}
			</div>
			{position.mode === "fixed" && typeof document !== "undefined"
				? createPortal(toolbar, document.body)
				: toolbar}
		</>
	);
}
