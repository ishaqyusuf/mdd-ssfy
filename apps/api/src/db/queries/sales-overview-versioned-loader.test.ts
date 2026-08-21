import { describe, expect, test } from "bun:test";
import { getSaleOverview } from "./sales";
import { getSaleOverviewGeneralV2 } from "./sales-overview-general-v2";
import { getSaleOverviewLoader } from "./sales-overview-versioned-loader";

describe("Sales Overview versioned loader", () => {
	test("keeps V1 on the compatibility loader", () => {
		expect(getSaleOverviewLoader("v1")).toBe(getSaleOverview);
	});

	test("routes V2 through the measured General projection", () => {
		expect(getSaleOverviewLoader("v2")).toBe(getSaleOverviewGeneralV2);
	});
});
