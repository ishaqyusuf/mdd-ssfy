import { describe, expect, it } from "bun:test";

import {
	getSalesPriorityLabel,
	getSalesPriorityRank,
	normalizeSalesPriority,
} from "./priority";

describe("sales priority helpers", () => {
	it("normalizes missing and unknown values to NORMAL", () => {
		expect(normalizeSalesPriority(null)).toBe("NORMAL");
		expect(normalizeSalesPriority(undefined)).toBe("NORMAL");
		expect(normalizeSalesPriority("Medium")).toBe("NORMAL");
	});

	it("returns canonical labels", () => {
		expect(getSalesPriorityLabel("CRITICAL")).toBe("Critical");
		expect(getSalesPriorityLabel("HIGH")).toBe("High");
		expect(getSalesPriorityLabel("NORMAL")).toBe("Normal");
		expect(getSalesPriorityLabel("LOW")).toBe("Low");
	});

	it("ranks urgent priority before normal and low", () => {
		expect(getSalesPriorityRank("CRITICAL")).toBeLessThan(
			getSalesPriorityRank("HIGH"),
		);
		expect(getSalesPriorityRank("HIGH")).toBeLessThan(
			getSalesPriorityRank("NORMAL"),
		);
		expect(getSalesPriorityRank("NORMAL")).toBeLessThan(
			getSalesPriorityRank("LOW"),
		);
	});
});
