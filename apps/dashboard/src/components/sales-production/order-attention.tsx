/** @jsxImportSource react */
"use client";

import { SalesPriorityBadge } from "@/components/sales-priority-control";
import type { ProductionOrderPresentation } from "@sales/production-order-presentation";
import { Icons } from "@gnd/ui/icons";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from "@gnd/ui/popover";
import { Button } from "@gnd/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@gnd/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import {
	createContext,
	lazy,
	Suspense,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactElement,
} from "react";

const CalendarMaterialActions = lazy(() =>
	import("./calendar-material-actions").then((module) => ({
		default: module.CalendarMaterialActions,
	})),
);
const CalendarAttentionContext = createContext<(() => void) | null>(null);

type Props = {
	presentation: ProductionOrderPresentation;
	orderNo: string;
	customer?: string | null;
	priority?: string | null;
	suppressHover?: boolean;
	lockReason?: string | null;
	salesOrderId?: number;
};

function AttentionDetails({
	presentation,
	orderNo,
	customer,
	priority,
	materialActionsExpanded = false,
}: Props & { materialActionsExpanded?: boolean }) {
	return (
		<div className="shrink-0 space-y-2 text-sm">
			<p className="font-medium">
				{orderNo}
				{customer ? ` · ${customer}` : ""}
			</p>
			<SalesPriorityBadge priority={priority} />
			<p>
				{presentation.primary.label}
				{presentation.primary.detail ? ` · ${presentation.primary.detail}` : ""}
			</p>
			{presentation.primary.basis === "reported" && !materialActionsExpanded ? (
				<p className="text-muted-foreground">
					Reported work; approval is still required for pending submissions.
				</p>
			) : null}
			{presentation.attention.length ? (
				<ul className="space-y-1">
					{presentation.attention.map((reason) => (
						<li key={reason.code} className="flex items-start gap-2">
							<Icons.AlertTriangle
								className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400"
								aria-hidden="true"
							/>
							<span>{reason.message}</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

export function ProductionAttentionTooltip({
	children,
	disabled = false,
	...props
}: Props & { children: ReactElement; disabled?: boolean }) {
	const [open, setOpen] = useState(false);
	if (disabled) return children;
	if (props.salesOrderId)
		return (
			<CalendarAttentionPopover {...props} salesOrderId={props.salesOrderId}>
				{children}
			</CalendarAttentionPopover>
		);
	return (
		<TooltipProvider delayDuration={250}>
			<Tooltip open={open} onOpenChange={setOpen}>
				<TooltipTrigger
					asChild
					onFocusCapture={(event) =>
						setOpen(
							!(event.target as HTMLElement).closest(
								'[aria-haspopup="dialog"]',
							),
						)
					}
					onPointerDownCapture={() => setOpen(false)}
					onBlurCapture={(event) => {
						if (
							!event.currentTarget.contains(event.relatedTarget as Node | null)
						)
							setOpen(false);
					}}
				>
					{children}
				</TooltipTrigger>
				<TooltipContent className="max-w-xs">
					<AttentionDetails {...props} />
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

/** Separate control keeps touch details available without intercepting order opening. */
export function ProductionAttentionButton({
	kind = "alert",
	...props
}: Props & { kind?: "alert" | "lock" }) {
	const openCalendarDetails = useContext(CalendarAttentionContext);
	const isLock = kind === "lock";
	if (
		isLock
			? !props.lockReason
			: !props.presentation.attention.length && !openCalendarDetails
	)
		return null;
	if (isLock)
		return (
			<button
				type="button"
				disabled
				aria-label={`Dragging unavailable for ${props.orderNo}`}
				className="relative ml-1 inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded px-1 font-semibold text-muted-foreground opacity-40"
			>
				<span aria-hidden="true">⠿</span>
				<svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute inset-0 size-full" fill="none">
					<path d="M3 17 17 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
				</svg>
			</button>
		);
	if (openCalendarDetails)
		return (
			<button
				type="button"
				className="inline-flex shrink-0 items-center justify-center rounded p-1 focus-visible:ring-2 focus-visible:ring-ring"
				aria-haspopup="dialog"
				aria-label={`Material details for ${props.orderNo}`}
				onPointerDown={(event) => event.stopPropagation()}
				onClick={(event) => {
					event.stopPropagation();
					openCalendarDetails();
				}}
			>
				{props.presentation.attention.length ? (
					<Icons.AlertTriangle className="size-3.5" aria-hidden="true" />
				) : (
					<Icons.Info className="size-3.5" aria-hidden="true" />
				)}
			</button>
		);
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="inline-flex shrink-0 items-center justify-center rounded p-1 text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-red-400"
					aria-label={`Attention required for ${props.orderNo}`}
					onClick={(event) => event.stopPropagation()}
				>
					<Icons.AlertTriangle className="size-3.5" aria-hidden="true" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-80 max-w-[calc(100vw-2rem)]"
				onClick={(event) => event.stopPropagation()}
			>
				<AttentionDetails {...props} />
			</PopoverContent>
		</Popover>
	);
}

function CalendarAttentionPopover({
	children,
	salesOrderId,
	...props
}: Props & { children: ReactElement; salesOrderId: number }) {
	const mobile = useIsMobile();
	const suppressHover = props.suppressHover ?? false;
	const [open, setOpen] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hovered = useRef(false);
	const trigger = useRef<HTMLElement | null>(null);
	const expandButton = useRef<HTMLButtonElement | null>(null);
	function cancelTimer() {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
	}
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);
	useEffect(() => {
		if (suppressHover) {
			cancelTimer();
			hovered.current = false;
			setOpen(false);
		}
	}, [suppressHover]);
	function leave() {
		cancelTimer();
		if (!expanded) timer.current = setTimeout(() => setOpen(false), 250);
	}
	function openDetails() {
		cancelTimer();
		hovered.current = false;
		trigger.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		setOpen(true);
		requestAnimationFrame(() => expandButton.current?.focus());
	}
	const details = expanded
		? calendarExpandedPresentation(props.presentation)
		: props.presentation;
	const content = (
		<>
			<AttentionDetails
				{...props}
				presentation={details}
				materialActionsExpanded={expanded}
			/>
			<Button
				ref={expandButton}
				type="button"
				size="sm"
				variant="outline"
				className="w-full shrink-0"
				aria-expanded={expanded}
				onClick={() => {
					cancelTimer();
					setExpanded((value) => !value);
				}}
			>
				{expanded ? "Hide material actions" : "View material actions"}
			</Button>
			{expanded && (
				<Suspense
					fallback={
						<p role="status" className="text-sm text-muted-foreground">
							Loading material actions…
						</p>
					}
				>
					<CalendarMaterialActions
						salesOrderId={salesOrderId}
						orderNo={props.orderNo}
					/>
				</Suspense>
			)}
		</>
	);
	if (mobile)
		return (
			<CalendarAttentionContext.Provider value={openDetails}>
				{children}
				<Dialog
					open={open}
					onOpenChange={(value) => {
						setOpen(value);
						if (!value) setExpanded(false);
					}}
				>
					<DialogContent
						aria-describedby={undefined}
						className="flex w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-4"
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							trigger.current?.focus();
						}}
						onClick={(event) => event.stopPropagation()}
						onPointerDown={(event) => event.stopPropagation()}
					>
						<DialogTitle className="sr-only">
							Material details for {props.orderNo}
						</DialogTitle>
						<div className="flex min-h-0 min-w-0 max-w-full flex-col gap-3 pt-3">
							{content}
						</div>
					</DialogContent>
				</Dialog>
			</CalendarAttentionContext.Provider>
		);
	return (
		<CalendarAttentionContext.Provider value={openDetails}>
			<Popover
				open={open}
				onOpenChange={(value) => {
					cancelTimer();
					setOpen(value);
					if (!value) setExpanded(false);
				}}
			>
				<PopoverAnchor asChild>
					<div
						className="w-full min-w-0"
						onPointerDownCapture={() => {
							cancelTimer();
							setOpen(false);
						}}
						onPointerEnter={(event) => {
							if (suppressHover || event.pointerType !== "mouse" || !event.currentTarget.contains(event.target as Node)) return;
							cancelTimer();
							hovered.current = true;
							timer.current = setTimeout(() => setOpen(true), 1_000);
						}}
						onPointerLeave={leave}
					>
						{children}
					</div>
				</PopoverAnchor>
				<PopoverContent
					aria-label={`Material details for ${props.orderNo}`}
					collisionPadding={16}
					sticky="always"
					className={`${expanded ? "w-[34rem]" : "w-80"} flex max-w-[calc(100vw-2rem)] max-h-[min(80vh,var(--radix-popover-content-available-height))] flex-col gap-3 overflow-hidden`}
					onPointerEnter={cancelTimer}
					onPointerLeave={leave}
					onOpenAutoFocus={(event) => {
						if (hovered.current) event.preventDefault();
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						if (!hovered.current) trigger.current?.focus();
					}}
					onPointerDown={(event) => event.stopPropagation()}
					onClick={(event) => event.stopPropagation()}
				>
					{content}
				</PopoverContent>
			</Popover>
		</CalendarAttentionContext.Provider>
	);
}

const inlineMaterialReasons = new Set([
	"material",
	"review",
	"materials_missing",
	"allocation_review",
	"awaiting_inbound",
	"materials_not_configured",
	"material_evidence_unavailable",
	"material_review_blocked",
	"review_pending",
]);
export function calendarExpandedPresentation(
	presentation: ProductionOrderPresentation,
): ProductionOrderPresentation {
	return {
		...presentation,
		attention: presentation.attention.filter(
			(reason) => !inlineMaterialReasons.has(reason.code),
		),
	};
}
