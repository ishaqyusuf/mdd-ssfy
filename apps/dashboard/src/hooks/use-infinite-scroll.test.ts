import { describe, expect, it } from "bun:test";

import { isNearInfiniteScrollBoundary } from "./use-infinite-scroll";

describe("isNearInfiniteScrollBoundary", () => {
	it("loads when scrolling reaches the configured row threshold", () => {
		expect(
			isNearInfiniteScrollBoundary({
				scrollTop: 700,
				clientHeight: 500,
				scrollHeight: 2_000,
				rowCount: 50,
				virtualSize: 2_000,
				threshold: 20,
			}),
		).toBe(true);
	});

	it("does not load while the viewport is outside the threshold", () => {
		expect(
			isNearInfiniteScrollBoundary({
				scrollTop: 100,
				clientHeight: 500,
				scrollHeight: 2_000,
				rowCount: 50,
				virtualSize: 2_000,
				threshold: 20,
			}),
		).toBe(false);
	});

	it("loads another page when the current rows do not fill the viewport", () => {
		expect(
			isNearInfiniteScrollBoundary({
				scrollTop: 0,
				clientHeight: 800,
				scrollHeight: 600,
				rowCount: 10,
				virtualSize: 560,
				threshold: 20,
			}),
		).toBe(true);
	});
});
