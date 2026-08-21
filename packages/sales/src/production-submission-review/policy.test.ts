import { describe, expect, test } from "bun:test";

import {
	classifyProductionSubmissionMaterials,
	isActiveReportedSubmission,
	isFinalizedProductionSubmission,
	shouldBlockProductionWorkerSubmission,
} from "./policy";

describe("production submission material review policy", () => {
	test("finalizes immediately only when every scoped material is ready", () => {
		expect(
			classifyProductionSubmissionMaterials({
				state: "available",
				materials: [
					{ readiness: "ready_for_production" },
					{ readiness: "fulfilled" },
				],
			}),
		).toEqual({
			state: "finalized",
			reason: null,
		});
	});

	test("routes unresolved inbound to review without blocking submission", () => {
		expect(
			classifyProductionSubmissionMaterials({
				state: "available",
				materials: [{ readiness: "awaiting_inbound" }],
			}),
		).toEqual({
			state: "pending_material_review",
			reason: "AWAITING_INBOUND",
		});
	});

	test("routes missing or unreadable material evidence to review", () => {
		expect(
			classifyProductionSubmissionMaterials({
				state: "available",
				materials: [],
			}),
		).toEqual({
			state: "pending_material_review",
			reason: "NOT_CONFIGURED",
		});
		expect(
			classifyProductionSubmissionMaterials({
				state: "unavailable",
				materials: [],
			}),
		).toEqual({
			state: "pending_material_review",
			reason: "PROJECTION_UNAVAILABLE",
		});
	});

	test("blocks worker submissions only when material availability is unresolved", () => {
		expect(
			shouldBlockProductionWorkerSubmission({
				state: "pending_material_review",
				reason: "AWAITING_INBOUND",
			}),
		).toBe(true);
		expect(
			shouldBlockProductionWorkerSubmission({
				state: "pending_material_review",
				reason: "PROJECTION_UNAVAILABLE",
			}),
		).toBe(true);
		expect(
			shouldBlockProductionWorkerSubmission({
				state: "pending_material_review",
				reason: "NOT_CONFIGURED",
			}),
		).toBe(false);
		expect(
			shouldBlockProductionWorkerSubmission({
				state: "finalized",
				reason: null,
			}),
		).toBe(false);
	});

	test("pending review consumes reported quantity but not finalized quantity", () => {
		const pending = {
			deletedAt: null,
			materialReview: { status: "PENDING" },
		};

		expect(isActiveReportedSubmission(pending)).toBe(true);
		expect(isFinalizedProductionSubmission(pending)).toBe(false);
		expect(
			isFinalizedProductionSubmission({
				deletedAt: null,
				materialReview: { status: "APPROVED" },
			}),
		).toBe(true);
		expect(
			isFinalizedProductionSubmission({
				deletedAt: null,
				materialReview: null,
			}),
		).toBe(true);
	});

	test("rejected, cancelled, and deleted submissions do not consume quantity", () => {
		for (const status of ["REJECTED", "CANCELLED"] as const) {
			const submission = {
				deletedAt: null,
				materialReview: { status },
			};
			expect(isActiveReportedSubmission(submission)).toBe(false);
			expect(isFinalizedProductionSubmission(submission)).toBe(false);
		}

		expect(
			isActiveReportedSubmission({
				deletedAt: new Date("2026-07-30T12:00:00.000Z"),
				materialReview: null,
			}),
		).toBe(false);
	});
});
