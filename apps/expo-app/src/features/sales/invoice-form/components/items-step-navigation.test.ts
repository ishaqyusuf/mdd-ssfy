import { describe, expect, it } from "bun:test";
import {
	getInvoiceItemSwipeDirection,
	getInvoiceItemSwipeVisualOffset,
	shouldStartInvoiceItemSwipe,
} from "./items-step-navigation";

describe("invoice item swipe navigation", () => {
	it("maps left swipes to next and right swipes to previous", () => {
		expect(
			getInvoiceItemSwipeDirection({
				dx: -120,
				dy: 8,
				itemCount: 3,
				activeIndex: 0,
			}),
		).toBe("next");
		expect(
			getInvoiceItemSwipeDirection({
				dx: 120,
				dy: 8,
				itemCount: 3,
				activeIndex: 1,
			}),
		).toBe("previous");
	});

	it("ignores unavailable, short, vertical, and single-item swipes", () => {
		expect(
			getInvoiceItemSwipeDirection({
				dx: 120,
				dy: 8,
				itemCount: 3,
				activeIndex: 0,
			}),
		).toBeNull();
		expect(
			getInvoiceItemSwipeDirection({
				dx: -120,
				dy: 8,
				itemCount: 3,
				activeIndex: 2,
			}),
		).toBeNull();
		expect(
			getInvoiceItemSwipeDirection({
				dx: -40,
				dy: 4,
				itemCount: 3,
				activeIndex: 0,
			}),
		).toBeNull();
		expect(
			getInvoiceItemSwipeDirection({
				dx: -120,
				dy: 120,
				itemCount: 3,
				activeIndex: 0,
			}),
		).toBeNull();
		expect(
			getInvoiceItemSwipeDirection({
				dx: -120,
				dy: 4,
				itemCount: 1,
				activeIndex: 0,
			}),
		).toBeNull();
	});

	it("starts the responder only for intentional horizontal swipes", () => {
		expect(shouldStartInvoiceItemSwipe({ dx: 28, dy: 2, itemCount: 2 })).toBe(
			true,
		);
		expect(shouldStartInvoiceItemSwipe({ dx: 28, dy: 24, itemCount: 2 })).toBe(
			false,
		);
		expect(shouldStartInvoiceItemSwipe({ dx: 28, dy: 2, itemCount: 1 })).toBe(
			false,
		);
	});

	it("follows available item swipes while clamping extreme drag distance", () => {
		expect(
			getInvoiceItemSwipeVisualOffset({
				dx: -80,
				itemCount: 3,
				activeIndex: 1,
				maxOffset: 120,
			}),
		).toBe(-80);
		expect(
			getInvoiceItemSwipeVisualOffset({
				dx: 240,
				itemCount: 3,
				activeIndex: 1,
				maxOffset: 120,
			}),
		).toBe(120);
		expect(
			getInvoiceItemSwipeVisualOffset({
				dx: -240,
				itemCount: 3,
				activeIndex: 1,
				maxOffset: 120,
			}),
		).toBe(-120);
	});

	it("adds resistance at the first and last invoice item edges", () => {
		expect(
			getInvoiceItemSwipeVisualOffset({
				dx: 100,
				itemCount: 3,
				activeIndex: 0,
				maxOffset: 120,
			}),
		).toBeCloseTo(28);
		expect(
			getInvoiceItemSwipeVisualOffset({
				dx: -100,
				itemCount: 3,
				activeIndex: 2,
				maxOffset: 120,
			}),
		).toBeCloseTo(-28);
		expect(
			getInvoiceItemSwipeVisualOffset({
				dx: 100,
				itemCount: 1,
				activeIndex: 0,
				maxOffset: 120,
			}),
		).toBe(0);
	});
});
