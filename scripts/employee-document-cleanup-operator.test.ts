import { describe, expect, test } from "bun:test";
import { isDeepStrictEqual } from "node:util";
import {
	assertEmployeeCleanupInventoryManifest,
	assertEmployeeCleanupStoreSelection,
	parseEmployeeCleanupOperatorArguments,
	reconcileOnePrivateEmployeeDocument,
	resolveEmployeeCleanupProfileToken,
} from "./employee-document-cleanup-operator";

const now = new Date("2026-09-26T12:00:00.000Z");
const deletedAt = new Date("2026-09-26T11:00:00.000Z");

function makeDb(options?: {
	liveLink?: boolean;
	relinkOnClaim?: boolean;
	failAcquire?: boolean;
	loseClaim?: boolean;
}) {
	let liveLink = options?.liveLink ?? false;
	let claims = 0;
	let stored = {
		id: "stored-1",
		ownerType: "user",
		ownerId: "7",
		kind: "attachment",
		provider: "vercel-blob",
		visibility: "private",
		status: "deleted",
		isCurrent: false,
		deletedAt,
		pathname: "user/7/attachment/document-random.pdf",
		meta: {
			workflow: "employee_document",
			storageAccess: "private",
			cleanupStatus: "retry_required",
			cleanupUpdatedAt: deletedAt.toISOString(),
		} as Record<string, unknown>,
	};
	const business = {
		id: 91,
		userId: 7,
		deletedAt,
		meta: { storedDocumentId: "stored-1" },
	};
	const db = {
		storedDocument: {
			findFirst: async () => ({
				...structuredClone(stored),
				meta: Object.fromEntries(Object.entries(stored.meta).reverse()),
			}),
			updateMany: async (input: {
				where: { meta: { equals: unknown } };
				data: { meta: Record<string, unknown> };
			}) => {
				if (!isDeepStrictEqual(input.where.meta.equals, stored.meta))
					return { count: 0 };
				if (options?.failAcquire && claims === 0) return { count: 0 };
				if (options?.loseClaim && claims > 0) return { count: 0 };
				stored = { ...stored, meta: structuredClone(input.data.meta) };
				claims += 1;
				if (options?.relinkOnClaim && claims === 1) liveLink = true;
				return { count: 1 };
			},
		},
		userDocuments: {
			findMany: async (input: { where: { deletedAt: unknown } }) =>
				input.where.deletedAt === null
					? liveLink
						? [{ ...business, deletedAt: null }]
						: []
					: [business],
		},
		$transaction: async (callback: (value: unknown) => Promise<unknown>) =>
			callback(db),
	};
	return {
		db: db as never,
		getMeta: () => stored.meta,
	};
}

describe("manual private employee cleanup operator", () => {
	test("fails closed on missing, mismatched and Production local credentials", () => {
		const input = {
			environment: "local" as const,
			confirmedStoreId: "store_dev",
			profile: {
				PRIVATE_BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_dev_fake",
				PRIVATE_BLOB_STORE_ID: "store_dev",
			},
			productionToken: "vercel_blob_rw_hwG94qb1mozFw1qD_fake",
		};
		expect(resolveEmployeeCleanupProfileToken(input)).toBe(
			input.profile.PRIVATE_BLOB_READ_WRITE_TOKEN,
		);
		for (const profile of [
			{},
			{ PRIVATE_BLOB_READ_WRITE_TOKEN: " " },
			{ ...input.profile, PRIVATE_BLOB_STORE_ID: undefined },
			{ ...input.profile, PRIVATE_BLOB_STORE_ID: "store_other" },
			{
				...input.profile,
				PRIVATE_BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_other_fake",
			},
			{
				...input.profile,
				PRIVATE_BLOB_READ_WRITE_TOKEN: input.productionToken,
			},
		]) {
			expect(() =>
				resolveEmployeeCleanupProfileToken({ ...input, profile }),
			).toThrow();
		}
		expect(() =>
			resolveEmployeeCleanupProfileToken({
				...input,
				productionToken: undefined,
			}),
		).toThrow("Cannot verify");
		const production = {
			...input,
			environment: "production" as const,
			confirmedStoreId: "store_hwG94qb1mozFw1qD",
			profile: {
				PRIVATE_BLOB_READ_WRITE_TOKEN: input.productionToken,
				PRIVATE_BLOB_STORE_ID: "store_hwG94qb1mozFw1qD",
			},
		};
		expect(resolveEmployeeCleanupProfileToken(production)).toBe(
			input.productionToken,
		);
		expect(() =>
			resolveEmployeeCleanupProfileToken({
				...production,
				environment: "local",
			}),
		).toThrow("not valid for this environment");
	});

	test("selects explicit same-name profile credentials, not rehearsal env", () => {
		const flags = [
			"--mode",
			"apply",
			"--document-id",
			"stored-1",
			"--manifest",
			"/tmp/inventory.json",
			"--output",
			"/tmp/result.json",
			"--confirm-target",
			"a".repeat(64),
			"--confirm-store-id",
			"store_dev",
		];
		for (const environment of ["local", "production"]) {
			expect(
				parseEmployeeCleanupOperatorArguments([
					...flags,
					"--environment",
					environment,
					"--token-source",
					`${environment}-profile`,
				]).tokenSource,
			).toBe(`${environment}-profile`);
			for (const source of [
				"rehearsal-env",
				environment === "local" ? "production-profile" : "local-profile",
			]) {
				expect(() =>
					parseEmployeeCleanupOperatorArguments([
						...flags,
						"--environment",
						environment,
						"--token-source",
						source,
					]),
				).toThrow("token source must match");
			}
		}
	});

	test("binds the exact inventory candidate and Production store", () => {
		const target = {
			environment: "production" as const,
			identity: "example.invalid:3306/gnd",
			fingerprint: "a".repeat(64),
		};
		const manifest = {
			contract: "employee-document-cleanup-inventory/v1",
			target,
			candidates: ["stored-1"],
			held: [],
		};
		expect(
			assertEmployeeCleanupInventoryManifest({
				manifest,
				target,
				documentId: "stored-1",
			}),
		).toMatchObject({ candidates: ["stored-1"] });
		expect(() =>
			assertEmployeeCleanupInventoryManifest({
				manifest,
				target: { ...target, fingerprint: "b".repeat(64) },
				documentId: "stored-1",
			}),
		).toThrow("exact target and document ID");
		expect(() =>
			assertEmployeeCleanupInventoryManifest({
				manifest: {
					...manifest,
					held: [{ storedDocumentId: "stored-1", reason: "live_link" }],
				},
				target,
				documentId: "stored-1",
			}),
		).toThrow("exact target and document ID");
		expect(() =>
			assertEmployeeCleanupStoreSelection("production", "store_other"),
		).toThrow("not valid for this environment");
		expect(() =>
			assertEmployeeCleanupStoreSelection("local", "store_hwG94qb1mozFw1qD"),
		).toThrow("not valid for this environment");
	});

	test("requires exact target, manifest, store and token-source flags", () => {
		expect(() => parseEmployeeCleanupOperatorArguments([])).toThrow(
			"Explicit --environment",
		);
		expect(() =>
			parseEmployeeCleanupOperatorArguments([
				"--environment",
				"production",
				"--mode",
				"preview",
			]),
		).toThrow("Only explicit --mode apply");
		expect(() =>
			parseEmployeeCleanupOperatorArguments([
				"--environment",
				"production",
				"--mode",
				"apply",
				"--document-id",
				"stored-1",
				"--token-source",
				"rehearsal-env",
			]),
		).toThrow("token source must match");
	});

	test("conditionally deletes the exact eTag and marks completion after absence", async () => {
		const { db, getMeta } = makeDb();
		let exists = true;
		const deletes: Array<[string, string]> = [];
		const result = await reconcileOnePrivateEmployeeDocument({
			db,
			documentId: "stored-1",
			claimId: "claim-a",
			now: () => now,
			provider: {
				lookup: async () =>
					exists
						? {
								pathname: "user/7/attachment/document-random.pdf",
								etag: "etag-1",
							}
						: null,
				remove: async (pathname, etag) => {
					deletes.push([pathname, etag]);
					exists = false;
				},
			},
		});
		expect(result).toEqual({ status: "completed", removed: true });
		expect(deletes).toEqual([
			["user/7/attachment/document-random.pdf", "etag-1"],
		]);
		expect(getMeta()).toMatchObject({
			cleanupStatus: "completed",
			cleanupAttemptCount: 1,
		});
		expect(getMeta()).not.toHaveProperty("cleanupClaim");
	});

	test("marks an already missing object complete without deleting", async () => {
		const { db, getMeta } = makeDb();
		let deleted = false;
		const result = await reconcileOnePrivateEmployeeDocument({
			db,
			documentId: "stored-1",
			now: () => now,
			provider: {
				lookup: async () => null,
				remove: async () => {
					deleted = true;
				},
			},
		});
		expect(result).toEqual({ status: "completed", removed: false });
		expect(deleted).toBe(false);
		expect(getMeta()).toMatchObject({ cleanupStatus: "completed" });
	});

	test("keeps retry state when provider outcome is unknown", async () => {
		const { db, getMeta } = makeDb();
		const result = await reconcileOnePrivateEmployeeDocument({
			db,
			documentId: "stored-1",
			now: () => now,
			provider: {
				lookup: async () => ({
					pathname: "user/7/attachment/document-random.pdf",
					etag: "etag-1",
				}),
				remove: async () => {
					throw new Error("network timeout");
				},
			},
		});
		expect(result).toEqual({
			status: "pending",
			reason: "provider_or_database_error",
		});
		expect(getMeta()).toMatchObject({
			cleanupStatus: "retry_required",
			cleanupAttemptCount: 1,
		});
		expect(getMeta()).not.toHaveProperty("cleanupClaim");
	});

	test("does not mark completion when the provider still reports the object", async () => {
		const { db, getMeta } = makeDb();
		let lookups = 0;
		const result = await reconcileOnePrivateEmployeeDocument({
			db,
			documentId: "stored-1",
			now: () => now,
			provider: {
				lookup: async () => {
					lookups += 1;
					return {
						pathname: "user/7/attachment/document-random.pdf",
						etag: "etag-1",
					};
				},
				remove: async () => {},
			},
		});
		expect(lookups).toBe(2);
		expect(result).toEqual({ status: "pending", reason: "still_present" });
		expect(getMeta()).toMatchObject({ cleanupStatus: "retry_required" });
	});

	test("holds provider metadata mismatch without deleting", async () => {
		const { db, getMeta } = makeDb();
		let removed = false;
		const result = await reconcileOnePrivateEmployeeDocument({
			db,
			documentId: "stored-1",
			now: () => now,
			provider: {
				lookup: async () => ({
					pathname: "user/8/attachment/other.pdf",
					etag: "etag-2",
				}),
				remove: async () => {
					removed = true;
				},
			},
		});
		expect(removed).toBe(false);
		expect(result).toEqual({ status: "held", reason: "provider_mismatch" });
		expect(getMeta()).toMatchObject({ cleanupStatus: "retry_required" });
	});

	test("holds a live re-link before touching the provider", async () => {
		const { db, getMeta } = makeDb({ relinkOnClaim: true });
		let providerCalled = false;
		const result = await reconcileOnePrivateEmployeeDocument({
			db,
			documentId: "stored-1",
			now: () => now,
			provider: {
				lookup: async () => {
					providerCalled = true;
					return null;
				},
				remove: async () => {
					providerCalled = true;
				},
			},
		});
		expect(result).toEqual({ status: "held", reason: "changed_after_claim" });
		expect(providerCalled).toBe(false);
		expect(getMeta()).toMatchObject({ cleanupStatus: "retry_required" });
	});

	test("a lost completion compare-and-set remains pending", async () => {
		const { db, getMeta } = makeDb({ loseClaim: true });
		const result = await reconcileOnePrivateEmployeeDocument({
			db,
			documentId: "stored-1",
			now: () => now,
			provider: { lookup: async () => null, remove: async () => {} },
		});
		expect(result).toEqual({
			status: "pending",
			reason: "completion_conflict",
		});
		expect(getMeta()).toMatchObject({ cleanupStatus: "retry_required" });
	});

	test("a competing claim prevents all provider calls", async () => {
		const { db, getMeta } = makeDb({ failAcquire: true });
		let providerCalled = false;
		const result = await reconcileOnePrivateEmployeeDocument({
			db,
			documentId: "stored-1",
			now: () => now,
			provider: {
				lookup: async () => {
					providerCalled = true;
					return null;
				},
				remove: async () => {
					providerCalled = true;
				},
			},
		});
		expect(result).toEqual({ status: "conflict" });
		expect(providerCalled).toBe(false);
		expect(getMeta()).not.toHaveProperty("cleanupClaim");
	});
});
