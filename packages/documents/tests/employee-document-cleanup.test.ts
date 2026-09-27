import { describe, expect, test } from "bun:test";
import {
	EMPLOYEE_DOCUMENT_CLEANUP_LEASE_MS,
	EMPLOYEE_DOCUMENT_CLEANUP_MIN_AGE_MS,
	createEmployeeCleanupClaimMeta,
	finishEmployeeCleanupMeta,
	inspectPrivateEmployeeCleanup,
	isSafeEmployeeCleanupPathname,
	ownsEmployeeCleanupClaim,
} from "../src/employee-document-cleanup";

const now = new Date("2026-09-26T12:00:00.000Z");
const retryAt = new Date(
	now.getTime() - EMPLOYEE_DOCUMENT_CLEANUP_MIN_AGE_MS - 1,
);
const stored = {
	id: "stored-1",
	ownerType: "user",
	ownerId: "7",
	kind: "attachment",
	provider: "vercel-blob",
	visibility: "private",
	status: "deleted",
	isCurrent: false,
	deletedAt: retryAt,
	pathname: "user/7/attachment/certificate-random.pdf",
	meta: {
		workflow: "employee_document",
		storageAccess: "private",
		cleanupStatus: "retry_required",
		cleanupUpdatedAt: retryAt.toISOString(),
	},
};
const link = {
	id: 91,
	userId: 7,
	deletedAt: retryAt,
	meta: { storedDocumentId: "stored-1" },
};

function inspect(input?: {
	stored?: Omit<typeof stored, "meta"> & { meta: unknown };
	deletedLinks?: Array<
		Omit<typeof link, "deletedAt"> & { deletedAt: Date | null }
	>;
	liveLinks?: Array<
		Omit<typeof link, "deletedAt"> & { deletedAt: Date | null }
	>;
}) {
	return inspectPrivateEmployeeCleanup({
		stored: input?.stored ?? stored,
		deletedLinks: input?.deletedLinks ?? [link],
		liveLinks: input?.liveLinks ?? [],
		now,
	});
}

describe("private employee cleanup claim policy", () => {
	test("accepts only expected owner or migration path and rejects traversal", () => {
		expect(
			isSafeEmployeeCleanupPathname({
				pathname: "user/7/attachment/certificate-random.pdf",
				ownerId: "7",
				businessDocumentId: 91,
			}),
		).toBe(true);
		expect(
			isSafeEmployeeCleanupPathname({
				pathname: "employee-documents/7/91/hash-file.pdf",
				ownerId: "7",
				businessDocumentId: 91,
			}),
		).toBe(true);
		for (const pathname of [
			"user/8/attachment/certificate.pdf",
			"employee-documents/7/92/hash-file.pdf",
			"user/7/attachment/../other.pdf",
			"user/7/attachment/%2e%2e/other.pdf",
			"https://example.com/file.pdf",
			"/user/7/attachment/file.pdf",
			"user/7/attachment/file.pdf?query=1",
		]) {
			expect(
				isSafeEmployeeCleanupPathname({
					pathname,
					ownerId: "7",
					businessDocumentId: 91,
				}),
			).toBe(false);
		}
	});

	test("holds live, mismatched, immature and exhausted records", () => {
		expect(inspect().ok).toBe(true);
		expect(
			inspect({ liveLinks: [{ ...link, deletedAt: null }] }),
		).toMatchObject({
			ok: false,
			reason: "ambiguous_link",
		});
		expect(inspect({ deletedLinks: [{ ...link, userId: 8 }] })).toMatchObject({
			ok: false,
			reason: "mismatched_link",
		});
		expect(
			inspect({
				stored: {
					...stored,
					meta: { ...stored.meta, cleanupUpdatedAt: now.toISOString() },
				},
			}),
		).toMatchObject({ ok: false, reason: "retry_not_mature" });
		expect(
			inspect({
				stored: {
					...stored,
					meta: { ...stored.meta, cleanupAttemptCount: 5 },
				},
			}),
		).toMatchObject({ ok: false, reason: "attempt_limit" });
		expect(
			inspect({ stored: { ...stored, pathname: "dispatch/7/proof.pdf" } }),
		).toMatchObject({ ok: false, reason: "unsafe_path" });
		expect(inspect({ stored: { ...stored, isCurrent: true } })).toMatchObject({
			ok: false,
			reason: "invalid_record",
		});
	});

	test("fences active claims and allows only a matured expired claim", () => {
		const claim = createEmployeeCleanupClaimMeta({
			meta: stored.meta,
			claimId: "claim-a",
			attempts: 0,
			now,
		});
		expect(claim.cleanupAttemptCount).toBe(1);
		expect(Date.parse(claim.cleanupClaim.expiresAt) - now.getTime()).toBe(
			EMPLOYEE_DOCUMENT_CLEANUP_LEASE_MS,
		);
		expect(ownsEmployeeCleanupClaim(claim, "claim-a")).toBe(true);
		expect(ownsEmployeeCleanupClaim(claim, "claim-b")).toBe(false);
		expect(inspect({ stored: { ...stored, meta: claim } })).toMatchObject({
			ok: false,
			reason: "claim_active_or_invalid",
		});
		expect(
			inspectPrivateEmployeeCleanup({
				stored: { ...stored, meta: claim },
				deletedLinks: [link],
				liveLinks: [],
				now,
				allowClaimId: "claim-a",
			}).ok,
		).toBe(true);
		const expired = {
			...claim,
			cleanupClaim: {
				id: "claim-a",
				expiresAt: new Date(now.getTime() - 1).toISOString(),
			},
		};
		expect(inspect({ stored: { ...stored, meta: expired } }).ok).toBe(true);
		expect(
			inspectPrivateEmployeeCleanup({
				stored: { ...stored, meta: expired },
				deletedLinks: [link],
				liveLinks: [],
				now,
				allowClaimId: "claim-a",
			}),
		).toMatchObject({ ok: false, reason: "claim_expired" });
	});

	test("clears only the owned claim while retaining retry provenance", () => {
		const claimed = createEmployeeCleanupClaimMeta({
			meta: stored.meta,
			claimId: "claim-a",
			attempts: 0,
			now,
		});
		const pending = finishEmployeeCleanupMeta({
			meta: claimed,
			completed: false,
			now,
		});
		expect(pending.cleanupStatus).toBe("retry_required");
		expect(pending.cleanupUpdatedAt).toBe(retryAt.toISOString());
		expect(pending).not.toHaveProperty("cleanupClaim");
		const completed = finishEmployeeCleanupMeta({
			meta: claimed,
			completed: true,
			now,
		});
		expect(completed.cleanupStatus).toBe("completed");
		expect(completed.cleanupUpdatedAt).toBe(now.toISOString());
	});
});
