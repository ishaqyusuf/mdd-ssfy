import { describe, expect, it } from "bun:test";
import {
	type CliOptions,
	VERCEL_CLI_VERSION,
	type VercelUsage,
	buildSnapshot,
	classifyInfrastructureCost,
	evaluateCostGuardrails,
	parseOptions,
} from "./vercel-cost-snapshot";

const service = (name: string, effectiveCost: number) => ({
	name,
	effectiveCost,
	billedCost: effectiveCost,
});

const existingUsage: VercelUsage = {
	period: {
		from: "2026-08-19T07:00:00.000Z",
		to: "2026-09-19T07:00:00.000Z",
	},
	context: "gndprodesk",
	pricingUnit: "USD",
	services: [
		service("Function Duration", 2.96),
		service("Function Invocations", 0.07),
		service("Speed Insights Data Points", 0.65),
		service("Pro", 20),
		service("Additional Team Seats", 20),
		service("Speed Insights", 10),
	],
};

describe("Vercel cost snapshot", () => {
	it("pins the Vercel CLI schema used by the monitor", () => {
		expect(VERCEL_CLI_VERSION).toBe("54.4.1");
	});

	it("separates existing subscription licenses from infrastructure consumption", () => {
		expect(classifyInfrastructureCost(existingUsage.services)).toEqual({
			infrastructureCost: 3.68,
			subscriptionCost: 50,
		});
	});

	it("reports the next threshold and an excessive daily burn", () => {
		expect(
			evaluateCostGuardrails({
				infrastructureCost: 3.95,
				cycleDays: 31,
				elapsedDays: 2,
			}),
		).toEqual({
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
		const snapshot = buildSnapshot(existingUsage, {
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

	it("keeps the fixed Speed Insights Plus license out of infrastructure", () => {
		expect(
			classifyInfrastructureCost([
				service("Pro", 10),
				service("Speed Insights Plus", 3.87),
				service("Speed Insights Plus Events", 0.65),
				service("Function Duration", 3.66),
			]),
		).toEqual({
			infrastructureCost: 4.31,
			subscriptionCost: 13.87,
		});
	});

	it("excludes fixed subscriptions from project and top-service infrastructure totals", () => {
		const usage: VercelUsage = {
			period: {
				from: "2026-08-19T07:00:00.000Z",
				to: "2026-08-31T07:00:00.000Z",
			},
			context: "gndprodesk",
			pricingUnit: "USD",
			services: [
				service("Speed Insights Plus", 3.87),
				service("Function Duration", 3.66),
			],
			groupBy: {
				dimension: "project",
				data: [
					{
						name: "(unattributed)",
						services: [service("Speed Insights Plus", 3.87)],
					},
					{
						name: "gndprodesk",
						services: [service("Function Duration", 3.66)],
					},
				],
			},
		};
		const options: CliOptions = {
			scope: "gndprodesk",
			from: "2026-08-19",
			to: "2026-08-30",
			cycleEnd: "2026-09-19",
			json: true,
			failOnAlert: false,
		};

		const snapshot = buildSnapshot(usage, options);

		expect(snapshot.infrastructureCost).toBe(3.66);
		expect(snapshot.subscriptionCost).toBe(3.87);
		expect(snapshot.services).toEqual([
			{ name: "Function Duration", effectiveCost: 3.66 },
		]);
		expect(snapshot.projects).toEqual([
			{
				name: "gndprodesk",
				infrastructureCost: 3.66,
				subscriptionCost: 0,
			},
			{
				name: "(unattributed)",
				infrastructureCost: 0,
				subscriptionCost: 3.87,
			},
		]);
	});
});
