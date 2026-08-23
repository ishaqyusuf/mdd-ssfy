import { describe, expect, test } from "bun:test";
import {
	deriveSalesHandoffOpenedAt,
	nextSalesHandoffBusinessDay,
} from "./escalation";

describe("Sales Handoff escalation clock", () => {
	test("preserves New York wall time on the next weekday", () => {
		expect(
			nextSalesHandoffBusinessDay(
				new Date("2026-08-24T19:15:30.000Z"),
			).toISOString(),
		).toBe("2026-08-25T19:15:30.000Z");
	});

	test("skips Friday through Monday", () => {
		expect(
			nextSalesHandoffBusinessDay(
				new Date("2026-08-21T19:15:30.000Z"),
			).toISOString(),
		).toBe("2026-08-24T19:15:30.000Z");
	});

	test("preserves wall time across daylight-saving weekends", () => {
		expect(
			nextSalesHandoffBusinessDay(
				new Date("2026-03-06T21:00:00.000Z"),
			).toISOString(),
		).toBe("2026-03-09T20:00:00.000Z");
		expect(
			nextSalesHandoffBusinessDay(
				new Date("2026-10-30T20:00:00.000Z"),
			).toISOString(),
		).toBe("2026-11-02T21:00:00.000Z");
	});

	test("starts a qualification-exposed first epoch at qualification time", () => {
		const now = new Date("2026-08-23T12:00:00.000Z");
		expect(
			deriveSalesHandoffOpenedAt({
				now,
				qualifiedAt: "2026-08-20T10:00:00.000Z",
				hasPreviousEpoch: false,
				initialExposureMilestone: "QUALIFICATION",
			}).toISOString(),
		).toBe("2026-08-20T10:00:00.000Z");
	});

	test("starts a policy-exposed first epoch at the latest policy milestone", () => {
		const now = new Date("2026-08-23T12:00:00.000Z");
		expect(
			deriveSalesHandoffOpenedAt({
				now,
				qualifiedAt: "2026-08-20T10:00:00.000Z",
				policyChangedAt: "2026-08-23T11:00:00.000Z",
				hasPreviousEpoch: false,
				initialExposureMilestone: "POLICY_CHANGE",
			}).toISOString(),
		).toBe("2026-08-23T11:00:00.000Z");
	});

	test("starts a later evidence-loss first epoch at reconciliation time", () => {
		const now = new Date("2026-08-25T12:00:00.000Z");
		expect(
			deriveSalesHandoffOpenedAt({
				now,
				qualifiedAt: "2026-08-20T10:00:00.000Z",
				policyChangedAt: "2026-08-21T11:00:00.000Z",
				hasPreviousEpoch: false,
			}),
		).toEqual(now);
	});

	test("genuine reopening starts a fresh clock", () => {
		const now = new Date("2026-08-23T12:00:00.000Z");
		expect(
			deriveSalesHandoffOpenedAt({
				now,
				qualifiedAt: "2026-08-20T10:00:00.000Z",
				policyChangedAt: "2026-08-21T11:00:00.000Z",
				hasPreviousEpoch: true,
			}),
		).toEqual(now);
	});
});
