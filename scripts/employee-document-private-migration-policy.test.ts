import { describe, expect, test } from "bun:test";
import {
	assertEmployeeDocumentMigrationStorageIsolation,
	digestEmployeeDocumentMigration,
	employeeDocumentDatabaseTarget,
	employeeDocumentMigrationUploadOptions,
	employeeDocumentSourceHash,
} from "./employee-document-private-migration-policy";

describe("employee document private migration policy", () => {
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
	test("local apply and verify refuse the production private-store token", () => {
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
					token: "isolated-token",
					productionToken: undefined,
				}),
			).toThrow("Cannot verify local private Blob token isolation.");
			expect(() =>
				assertEmployeeDocumentMigrationStorageIsolation({
					environment: "local",
					mode,
					token: "isolated-token",
					productionToken: "production-token",
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
