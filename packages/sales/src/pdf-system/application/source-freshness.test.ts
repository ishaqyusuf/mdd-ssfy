import { describe, expect, it } from "bun:test";
import {
	evaluateSalesSourceFreshness,
	isSalesSourceStale,
} from "./source-freshness";

describe("sales source freshness", () => {
	it("treats same-second source and sale updates as fresh", () => {
		const result = evaluateSalesSourceFreshness({
			sourceUpdatedAt: new Date("2026-05-12T10:00:00.000Z"),
			saleUpdatedAt: new Date("2026-05-12T10:00:00.789Z"),
		});

		expect(result.isStale).toBe(false);
		expect(result.reason).toBe("fresh");
		expect(result.normalizedDeltaMs).toBe(0);
	});

	it("treats an older persisted second as stale", () => {
		expect(
			isSalesSourceStale({
				sourceUpdatedAt: new Date("2026-05-12T10:00:00.000Z"),
				saleUpdatedAt: new Date("2026-05-12T10:00:01.000Z"),
			}),
		).toBe(true);
	});

	it("treats missing source timestamps as stale", () => {
		const result = evaluateSalesSourceFreshness({
			sourceUpdatedAt: null,
			saleUpdatedAt: new Date("2026-05-12T10:00:00.789Z"),
		});

		expect(result.isStale).toBe(true);
		expect(result.reason).toBe("missing-source-updated-at");
	});
});
