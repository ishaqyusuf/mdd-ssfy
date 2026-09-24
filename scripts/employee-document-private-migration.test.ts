import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	employeeDocumentMigrationManifestSchema,
	parseEmployeeDocumentMigrationArguments,
	resolveEmployeeDocumentMigrationSource,
} from "./employee-document-private-migration";
import { EMPLOYEE_DOCUMENT_PRIVATE_MIGRATION } from "./employee-document-private-migration-policy";

const migrationSource = readFileSync(
	new URL("./employee-document-private-migration.ts", import.meta.url),
	"utf8",
);

describe("employee document private migration contract", () => {
	test("checks local storage isolation before database access or journal creation", () => {
		const guard = migrationSource.indexOf(
			"assertEmployeeDocumentMigrationStorageIsolation({",
		);
		expect(guard).toBeGreaterThan(0);
		expect(guard).toBeLessThan(
			migrationSource.indexOf('await import("@gnd/db")'),
		);
		expect(guard).toBeLessThan(
			migrationSource.indexOf('open(options.output, "wx"'),
		);
	});

	test("requires an immutable output and manifest for write-adjacent modes", () => {
		expect(() => parseEmployeeDocumentMigrationArguments([])).toThrow(
			"--output is required",
		);
		expect(() =>
			parseEmployeeDocumentMigrationArguments([
				"--mode",
				"apply",
				"--output",
				"journal.jsonl",
			]),
		).toThrow("require --manifest");
		expect(() =>
			parseEmployeeDocumentMigrationArguments([
				"--mode",
				"verify",
				"--output",
				"same.json",
				"--manifest",
				"same.json",
			]),
		).toThrow("Manifest and output must differ");
	});

	test("holds a linked stored record when employee ownership does not match", async () => {
		let where: unknown;
		const result = await resolveEmployeeDocumentMigrationSource(
			{
				storedDocument: {
					findFirst: async (input: { where: unknown }) => {
						where = input.where;
						return null;
					},
				},
			} as never,
			{
				id: 1,
				userId: 7,
				title: "Insurance",
				url: "https://store.public.blob.vercel-storage.com/legacy.pdf",
				meta: { storedDocumentId: "stored-1" },
				updatedAt: new Date("2026-09-22T00:00:00.000Z"),
			},
		);

		expect(where).toMatchObject({
			id: "stored-1",
			ownerType: "user",
			ownerId: "7",
			kind: "attachment",
			status: "ready",
			deletedAt: null,
		});
		expect(result).toEqual({
			state: "held",
			reason: "STORED_DOCUMENT_OWNERSHIP_OR_STATE_MISMATCH",
		});
	});

	test("distinguishes held legacy sources without returning them", async () => {
		const db = { storedDocument: { findFirst: async () => null } } as never;
		const base = {
			id: 2,
			userId: 7,
			title: "Insurance",
			meta: null,
			updatedAt: new Date("2026-09-22T00:00:00.000Z"),
		};
		expect(
			await resolveEmployeeDocumentMigrationSource(db, { ...base, url: "" }),
		).toEqual({ state: "held", reason: "MISSING_SOURCE_URL" });
		expect(
			await resolveEmployeeDocumentMigrationSource(db, {
				...base,
				url: "https://untrusted.example/private.pdf",
			}),
		).toEqual({ state: "held", reason: "UNTRUSTED_SOURCE_HOST" });
		expect(
			await resolveEmployeeDocumentMigrationSource(db, {
				...base,
				url: "/api/employee-documents/2",
			}),
		).toEqual({
			state: "held",
			reason: "INTERNAL_APPLICATION_ROUTE_WITHOUT_PRIVATE_LINK",
		});
		expect(
			await resolveEmployeeDocumentMigrationSource(db, {
				...base,
				url: "legacy/private.pdf",
			}),
		).toEqual({ state: "held", reason: "BARE_USER_DOCUMENT_REFERENCE" });
	});

	test("uses a path-linked trusted metadata URL for a bare legacy reference", async () => {
		const db = { storedDocument: { findFirst: async () => null } } as never;
		const base = {
			id: 2,
			userId: 7,
			title: "Insurance",
			url: "contractor-document/employee-proof",
			updatedAt: new Date("2026-09-22T00:00:00.000Z"),
		};

		expect(
			await resolveEmployeeDocumentMigrationSource(db, {
				...base,
				meta: {
					url: "https://res.cloudinary.com/demo/image/upload/v1/contractor-document/employee-proof.pdf",
				},
			}),
		).toEqual({
			state: "legacy",
			url: "https://res.cloudinary.com/demo/image/upload/v1/contractor-document/employee-proof.pdf",
			storedDocument: null,
		});

		for (const url of [
			"https://res.cloudinary.com/demo/image/upload/v1/contractor-document/another-proof.pdf",
			"https://res.cloudinary.com/demo/image/upload/v1/contractor-document/employee-proof-copy.pdf",
			"https://untrusted.example/contractor-document/employee-proof.pdf",
		]) {
			expect(
				await resolveEmployeeDocumentMigrationSource(db, {
					...base,
					meta: { url },
				}),
			).toEqual({
				state: "held",
				reason: "BARE_USER_DOCUMENT_REFERENCE",
			});
		}
	});

	test("manifest stores guarded hashes without provider URLs", () => {
		const manifest = {
			contract: EMPLOYEE_DOCUMENT_PRIVATE_MIGRATION,
			batchId: "00000000-0000-4000-8000-000000000001",
			createdAt: "2026-09-22T00:00:00.000Z",
			target: {
				environment: "local",
				identity: "localhost:3306/gnd",
				fingerprint: "a".repeat(64),
			},
			candidates: [
				{
					documentId: 1,
					userId: 7,
					sourceHash: "b".repeat(64),
				},
			],
			held: [],
		};
		expect(
			employeeDocumentMigrationManifestSchema.safeParse(manifest).success,
		).toBe(true);
		expect(JSON.stringify(manifest)).not.toContain("https://");
		expect(
			employeeDocumentMigrationManifestSchema.safeParse({
				...manifest,
				candidates: [manifest.candidates[0], manifest.candidates[0]],
			}).success,
		).toBe(false);
	});

	test("verifies provider size and honors a known source checksum", () => {
		expect(migrationSource).toContain("remote.size !== bytes.length");
		expect(migrationSource).toContain(
			"resolved.storedDocument.checksum !== checksum",
		);
		expect(migrationSource).toContain("remote.size !== stored.size");
	});
});
