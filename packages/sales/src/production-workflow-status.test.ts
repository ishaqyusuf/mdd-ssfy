import { describe, expect, it } from "bun:test";

import { resolveProductionWorkflowStatus } from "./production-workflow-status";

const stat = (score: number, total = 4) => ({ score, total });

describe("production workflow status", () => {
	it("distinguishes assignment progress from production progress", () => {
		expect(
			resolveProductionWorkflowStatus({
				assignment: stat(0),
				production: stat(0),
			}),
		).toMatchObject({ code: "not_assigned", label: "Not assigned" });
		expect(
			resolveProductionWorkflowStatus({
				assignment: stat(2),
				production: stat(0),
			}),
		).toMatchObject({
			code: "partially_assigned",
			label: "Partially assigned",
		});
		expect(
			resolveProductionWorkflowStatus({
				assignment: stat(4),
				production: stat(0),
			}),
		).toMatchObject({ code: "assigned", label: "Assigned" });
	});

	it("surfaces active production, review, and completion directly", () => {
		expect(
			resolveProductionWorkflowStatus({
				assignment: stat(4),
				production: stat(1),
			}),
		).toMatchObject({ code: "in_production", label: "In production" });
		expect(
			resolveProductionWorkflowStatus({
				assignment: stat(4),
				production: stat(1),
				hasPendingReview: true,
			}),
		).toMatchObject({ code: "awaiting_review", label: "Awaiting review" });
		expect(
			resolveProductionWorkflowStatus({
				assignment: stat(4),
				production: stat(4),
				completed: true,
			}),
		).toMatchObject({
			code: "production_completed",
			label: "Production completed",
			percentage: 100,
		});
	});

	it("labels a zero-target record as outside production", () => {
		expect(
			resolveProductionWorkflowStatus({
				assignment: stat(0, 0),
				production: stat(0, 0),
			}),
		).toMatchObject({
			code: "not_applicable",
			label: "No production required",
		});
	});
});
