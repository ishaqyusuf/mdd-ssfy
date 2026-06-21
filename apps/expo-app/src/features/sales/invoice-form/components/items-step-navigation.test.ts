import { describe, expect, it } from "bun:test";
import {
	getInvoiceItemSwipeDirection,
	shouldStartInvoiceItemSwipe,
} from "./items-step-navigation";

describe("items step navigation", () => {
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
});
