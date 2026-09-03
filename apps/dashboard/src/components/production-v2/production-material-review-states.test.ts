import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./shared.tsx", import.meta.url), "utf8");

describe("production material review state matrix", () => {
	it("keeps exact historical deep links read-only", () => {
		expect(
			source.includes(
				'detail.status !== "PENDING" || !actionability?.actionable',
			),
		).toBe(true);
		expect(source.includes("Material review history")).toBe(true);
		expect(source.includes("READ-ONLY HISTORY")).toBe(true);
		expect(source.includes("requestedReviewRegionRef.current?.focus")).toBe(true);
		expect(source.includes('"Requested material review"')).toBe(true);
	});

	it("renders loading and unavailable states without assuming readiness", () => {
		expect(source.includes('aria-label="Loading material review"')).toBe(true);
		expect(source.includes('aria-label="Loading material reviews"')).toBe(true);
		expect(source.includes("Material review unavailable")).toBe(true);
		expect(source.includes("Material reviews unavailable")).toBe(true);
		expect(source.includes("Material evidence unavailable")).toBe(true);
		expect(source.includes("No readiness has been assumed")).toBe(true);
	});

	it("makes stale and conflicting evidence explicit", () => {
		expect(source.includes("Material evidence changed")).toBe(true);
		expect(source.includes("Stale writes are rejected")).toBe(true);
		expect(source.includes("Material evidence conflict")).toBe(true);
		expect(source.includes('"eligibility_conflict", "ambiguous"')).toBe(true);
	});

	it("separates read-only and permission-limited controls", () => {
		expect(source.includes("Material review is read-only")).toBe(true);
		expect(source.includes("Some material actions are unavailable")).toBe(true);
		expect(source.includes("!capabilities.canReview")).toBe(true);
		expect(source.includes("!capabilities.canReceiveInbound")).toBe(true);
		expect(source.includes("!capabilities.canMarkAvailable")).toBe(true);
		expect(source.includes("{isReadOnly ? null : (")).toBe(true);
	});
});
