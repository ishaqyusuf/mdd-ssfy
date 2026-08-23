import { describe, expect, it } from "bun:test";

import { submitPackingReportSchema } from "@gnd/sales/packing-report-review";
import {
	authorizePackingReportActor,
	authorizePackingReportReviewer,
	packingReportReviewerCapability,
} from "./packing-report-authority";

describe("packing report server authority", () => {
	it("rejects unauthenticated packing authority", () => {
		expect(() =>
			authorizePackingReportActor(
				{ userId: null, can: { viewPacking: true } },
				null,
			),
		).toThrow("Authentication is required");
	});

	it("allows an operational packer through role scope", () => {
		expect(
			authorizePackingReportActor(
				{ userId: 10, can: { viewPacking: true } },
				null,
			),
		).toEqual({ actorUserId: 10, scope: "role" });
	});

	it("allows a dispatch worker only for their assigned dispatch", () => {
		const worker = { userId: 11, can: { viewDelivery: true } };
		expect(authorizePackingReportActor(worker, 11)).toEqual({
			actorUserId: 11,
			scope: "assignment",
		});
		expect(() => authorizePackingReportActor(worker, 12)).toThrow(
			"assigned dispatch actor",
		);
	});

	it("ignores a forged caller actor and retains the session identity", () => {
		const parsed = submitPackingReportSchema.parse({
			dispatchId: 41,
			productionSubmissionId: 72,
			dispatchAllocationKey: "packing_allocation_41",
			qty: 1,
			lhQty: 0,
			rhQty: 0,
			manifestRevision: "packing_revision",
			idempotencyKey: "packing-request-41",
			physicallyVerified: true,
			submittedById: 999,
		});
		expect("submittedById" in parsed).toBe(false);
		expect(
			authorizePackingReportActor(
				{ userId: 11, can: { viewDelivery: true } },
				11,
			).actorUserId,
		).toBe(11);
	});

	it("rejects an assignment-only worker as reviewer and allows role authority", () => {
		expect(() =>
			authorizePackingReportReviewer({
				userId: 11,
				can: { viewDelivery: true },
			}),
		).toThrow("permission to review");
		expect(
			authorizePackingReportReviewer({
				userId: 15,
				can: { editOrders: true },
			}),
		).toEqual({ reviewerUserId: 15, scope: "role" });
	});

	it("returns reviewer capability from server-derived authority", () => {
		expect(
			packingReportReviewerCapability({
				userId: 11,
				can: { viewDelivery: true },
			}),
		).toEqual({ canReview: false, scope: "role" });
		expect(
			packingReportReviewerCapability({
				userId: 15,
				can: { viewPacking: true },
			}),
		).toEqual({ canReview: true, scope: "role" });
	});
});
