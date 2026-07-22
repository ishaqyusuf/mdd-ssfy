import { describe, expect, it } from "bun:test";
import {
	canDeleteStaleInquiryDraft,
	storefrontLifecycleCutoffs,
} from "./lifecycle";

describe("storefrontLifecycleCutoffs", () => {
	it("uses stable retention windows", () => {
		const now = new Date("2026-07-20T12:00:00.000Z");
		const result = storefrontLifecycleCutoffs(now);

		expect(result.abandonedCartAt.toISOString()).toBe(
			"2026-07-06T12:00:00.000Z",
		);
		expect(result.deleteRecoveryTokenAt.toISOString()).toBe(
			"2026-06-20T12:00:00.000Z",
		);
		expect(result.deleteInquiryDraftAt.toISOString()).toBe(
			"2026-07-19T12:00:00.000Z",
		);
	});
});

describe("canDeleteStaleInquiryDraft", () => {
	it("retains a draft unless private blob cleanup is configured and succeeds", () => {
		expect(
			canDeleteStaleInquiryDraft({
				blobCleanupConfigured: false,
				blobCleanupSucceeded: true,
			}),
		).toBe(false);
		expect(
			canDeleteStaleInquiryDraft({
				blobCleanupConfigured: true,
				blobCleanupSucceeded: false,
			}),
		).toBe(false);
		expect(
			canDeleteStaleInquiryDraft({
				blobCleanupConfigured: true,
				blobCleanupSucceeded: true,
			}),
		).toBe(true);
	});
});
