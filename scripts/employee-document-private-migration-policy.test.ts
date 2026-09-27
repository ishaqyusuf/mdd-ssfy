import { describe, expect, test } from "bun:test";
import {
	assertEmployeeDocumentMigrationBlobStore,
	assertEmployeeDocumentMigrationStorageIsolation,
	digestEmployeeDocumentMigration,
	employeeDocumentDatabaseTarget,
	employeeDocumentMigrationUploadOptions,
	employeeDocumentSourceHash,
} from "./employee-document-private-migration-policy";

describe("employee document private migration policy", () => {
	test("requires the operator-confirmed Blob store ID to match the selected token", () => {
		expect(() =>
			assertEmployeeDocumentMigrationBlobStore({
				token: "vercel_blob_rw_hwG94qb1mozFw1qD_example",
				confirmedStoreId: "store_hwG94qb1mozFw1qD",
			}),
		).not.toThrow();
		for (const [token, confirmedStoreId] of [
			["vercel_blob_rw_other_example", "store_hwG94qb1mozFw1qD"],
			["invalid-token", "store_hwG94qb1mozFw1qD"],
			["vercel_blob_rw_hwG94qb1mozFw1qD_example", null],
		] as const) {
			expect(() =>
				assertEmployeeDocumentMigrationBlobStore({ token, confirmedStoreId }),
			).toThrow("Private Blob token does not match --confirm-store-id.");
		}
	});
	test("keeps concurrent uploads private, unique, and non-overwriting", () => {
		expect(
			employeeDocumentMigrationUploadOptions({
				token: "local-token",
				contentType: "application/pdf",
			}),
		).toEqual({
			access: "private",
			token: "local-token",
			contentType: "application/pdf",
			addRandomSuffix: true,
			allowOverwrite: false,
		});
	});
	test("local apply and verify require a distinct private Blob store", () => {
		for (const mode of ["apply", "verify"] as const) {
			expect(() =>
				assertEmployeeDocumentMigrationStorageIsolation({
					environment: "local",
					mode,
					token: "shared-token",
					productionToken: "shared-token",
				}),
			).toThrow("Local migration refuses the Production private Blob token.");
			expect(() =>
				assertEmployeeDocumentMigrationStorageIsolation({
					environment: "local",
					mode,
					token: "vercel_blob_rw_local_first",
					productionToken: undefined,
				}),
			).toThrow("Cannot verify local private Blob token isolation.");
			for (const [token, productionToken] of [
				["vercel_blob_rw_shared_first", "vercel_blob_rw_shared_second"],
				["malformed-local-token", "vercel_blob_rw_production_first"],
				["vercel_blob_rw_local_first", "malformed-production-token"],
			] as const) {
				expect(() =>
					assertEmployeeDocumentMigrationStorageIsolation({
						environment: "local",
						mode,
						token,
						productionToken,
					}),
				).toThrow(
					"Local migration requires a distinct private Blob store from Production.",
				);
			}
			expect(() =>
				assertEmployeeDocumentMigrationStorageIsolation({
					environment: "local",
					mode,
					token: "vercel_blob_rw_local_first",
					productionToken: "vercel_blob_rw_production_second",
				}),
			).not.toThrow();
		}
		expect(() =>
			assertEmployeeDocumentMigrationStorageIsolation({
				environment: "local",
				mode: "preview",
				token: undefined,
				productionToken: undefined,
			}),
		).not.toThrow();
	});

	test("fingerprints database identity without credentials", () => {
		const target = employeeDocumentDatabaseTarget(
			"mysql://secret:password@localhost:3307/gnd",
			"local",
		);
		expect(target.identity).toBe("localhost:3307/gnd");
		expect(JSON.stringify(target)).not.toContain("secret");
		expect(target.fingerprint).toHaveLength(64);
	});

	test("keeps local and production target classes separate", () => {
		expect(() =>
			employeeDocumentDatabaseTarget(
				"mysql://user@db.example.com/gnd",
				"local",
			),
		).toThrow("Local mode refuses a hosted database.");
		expect(() =>
			employeeDocumentDatabaseTarget(
				"mysql://user@localhost/gnd",
				"production",
			),
		).toThrow("Production mode refuses a local database.");
	});

	test("source hashes change when the guarded row changes", () => {
		const source = {
			id: 1,
			userId: 7,
			url: "https://store.public.blob.vercel-storage.com/a.pdf",
			meta: null,
			updatedAt: "2026-09-22T00:00:00.000Z",
		};
		expect(employeeDocumentSourceHash(source)).not.toBe(
			employeeDocumentSourceHash({ ...source, userId: 8 }),
		);
		expect(digestEmployeeDocumentMigration(source)).toHaveLength(64);
	});
});
