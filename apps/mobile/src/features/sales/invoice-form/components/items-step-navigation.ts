export type InvoiceItemSwipeDirection = "previous" | "next" | null;

const SWIPE_START_DISTANCE = 24;
const SWIPE_COMMIT_DISTANCE = 90;
const SWIPE_EDGE_RESISTANCE = 0.28;
const DEFAULT_SWIPE_VISUAL_MAX_OFFSET = 160;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

export function shouldStartInvoiceItemSwipe(input: {
	dx: number;
	dy: number;
	itemCount: number;
}) {
	if (input.itemCount <= 1) return false;
	const horizontalDistance = Math.abs(input.dx);
	return (
		horizontalDistance > SWIPE_START_DISTANCE &&
		horizontalDistance > Math.abs(input.dy) * 1.4
	);
}

export function getInvoiceItemSwipeDirection(input: {
	dx: number;
	dy: number;
	itemCount: number;
	activeIndex: number;
}): InvoiceItemSwipeDirection {
	if (!shouldStartInvoiceItemSwipe(input)) return null;
	if (Math.abs(input.dx) < SWIPE_COMMIT_DISTANCE) return null;
	if (input.dx < 0 && input.activeIndex < input.itemCount - 1) return "next";
	if (input.dx > 0 && input.activeIndex > 0) return "previous";
	return null;
}

export function getInvoiceItemSwipeVisualOffset(input: {
	dx: number;
	itemCount: number;
	activeIndex: number;
	maxOffset?: number;
}) {
	if (input.itemCount <= 1) return 0;

	const maxOffset = Math.max(
		0,
		Math.abs(input.maxOffset ?? DEFAULT_SWIPE_VISUAL_MAX_OFFSET),
	);
	const atFirstItem = input.activeIndex <= 0;
	const atLastItem = input.activeIndex >= input.itemCount - 1;
	const isUnavailablePreviousSwipe = input.dx > 0 && atFirstItem;
	const isUnavailableNextSwipe = input.dx < 0 && atLastItem;
	const resistedDx =
		isUnavailablePreviousSwipe || isUnavailableNextSwipe
			? input.dx * SWIPE_EDGE_RESISTANCE
			: input.dx;

	return clamp(resistedDx, -maxOffset, maxOffset);
}
