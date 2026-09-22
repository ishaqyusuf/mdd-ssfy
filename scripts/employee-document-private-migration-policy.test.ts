import { describe, expect, test } from "bun:test";
import {
	digestEmployeeDocumentMigration,
	employeeDocumentDatabaseTarget,
	employeeDocumentSourceHash,
} from "./employee-document-private-migration-policy";

describe("employee document private migration policy", () => {
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
