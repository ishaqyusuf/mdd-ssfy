export type InvoiceItemSwipeDirection = "previous" | "next" | null;

const SWIPE_START_DISTANCE = 24;
const SWIPE_COMMIT_DISTANCE = 90;

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
