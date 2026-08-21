import { describe, expect, it } from "bun:test";
import {
	VERCEL_CLI_VERSION,
	type VercelUsage,
	buildSnapshot,
	classifyInfrastructureCost,
	evaluateCostGuardrails,
	parseOptions,
} from "./vercel-cost-snapshot";

const usage: VercelUsage = {
	period: {
		from: "2026-08-19T07:00:00.000Z",
		to: "2026-09-19T07:00:00.000Z",
	},
	context: "gndprodesk",
	pricingUnit: "USD",
	services: [
		{
			name: "Function Duration",
			effectiveCost: 2.96,
			billedCost: 0,
		},
		{
			name: "Function Invocations",
			effectiveCost: 0.07,
			billedCost: 0,
		},
		{
			name: "Speed Insights Data Points",
			effectiveCost: 0.65,
			billedCost: 0,
		},
		{
			name: "Pro",
			effectiveCost: 20,
			billedCost: 20,
		},
		{
			name: "Additional Team Seats",
			effectiveCost: 20,
			billedCost: 20,
		},
		{
			name: "Speed Insights",
			effectiveCost: 10,
			billedCost: 10,
		},
	],
};

describe("Vercel cost snapshot", () => {
	it("pins the Vercel CLI schema used by the monitor", () => {
		expect(VERCEL_CLI_VERSION).toBe("54.4.1");
	});

	it("separates subscription licenses from infrastructure consumption", () => {
		expect(classifyInfrastructureCost(usage.services)).toEqual({
			infrastructureCost: 3.68,
			subscriptionCost: 50,
		});
	});

	it("reports the next threshold and an excessive daily burn", () => {
		const guardrails = evaluateCostGuardrails({
			infrastructureCost: 3.95,
			cycleDays: 31,
			elapsedDays: 2,
		});

		expect(guardrails).toEqual({
			dailyBurn: 1.98,
			projectedInfrastructureCost: 61.23,
			nextThreshold: 8,
			crossedThresholds: [],
			severity: "critical",
		});
	});

	it("escalates after crossing configured credit thresholds", () => {
		expect(
			evaluateCostGuardrails({
				infrastructureCost: 16.4,
				cycleDays: 31,
				elapsedDays: 20,
			}),
		).toMatchObject({
			crossedThresholds: [8, 12, 16],
			nextThreshold: 18,
			severity: "critical",
		});
	});

	it("uses the requested historical window for a repeatable projection", () => {
		const snapshot = buildSnapshot(usage, {
			scope: "gndprodesk",
			from: "2026-08-19",
			to: "2026-08-21",
			cycleEnd: "2026-09-19",
			json: true,
			failOnAlert: false,
		});

		expect(snapshot.dailyBurn).toBe(1.84);
		expect(snapshot.projectedInfrastructureCost).toBe(57.04);
	});

	it("rejects reversed or post-cycle snapshot windows", () => {
		expect(() =>
			parseOptions([
				"--from",
				"2026-08-21",
				"--to",
				"2026-08-19",
				"--cycle-end",
				"2026-09-19",
			]),
		).toThrow("--from must be earlier than --to");
		expect(() =>
			parseOptions([
				"--from",
				"2026-08-19",
				"--to",
				"2026-09-20",
				"--cycle-end",
				"2026-09-19",
			]),
		).toThrow("--to must not be later than --cycle-end");
	});
});
