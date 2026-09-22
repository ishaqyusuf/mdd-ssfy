import { describe, expect, test } from "bun:test";
import {
	canAccessEmployeeDocument,
	classifyLegacyEmployeeDocumentSource,
	employeeDocumentAccessPath,
	isPrivateEmployeeDocumentMeta,
	parseEmployeeStoredDocumentId,
	trustedLegacyEmployeeDocumentUrl,
	trustedLegacyEmployeeDocumentUrlFromRecord,
} from "../src/employee-document";

describe("employee document policy", () => {
	test("allows the employee owner or an explicit document capability", () => {
		expect(canAccessEmployeeDocument({ actorId: 7, employeeId: 7 })).toBe(true);
		expect(
			canAccessEmployeeDocument({
				actorId: 8,
				employeeId: 7,
				canViewEmployeeDocument: true,
			}),
		).toBe(true);
		expect(
			canAccessEmployeeDocument({
				actorId: 9,
				employeeId: 7,
				canEditEmployeeDocument: true,
			}),
		).toBe(true);
		expect(canAccessEmployeeDocument({ actorId: 8, employeeId: 7 })).toBe(
			false,
		);
	});

	test("builds stable access paths and parses canonical document links", () => {
		expect(employeeDocumentAccessPath(42)).toBe("/api/employee-documents/42");
		expect(() => employeeDocumentAccessPath(0)).toThrow();
		expect(parseEmployeeStoredDocumentId({ storedDocumentId: " doc-1 " })).toBe(
			"doc-1",
		);
		expect(parseEmployeeStoredDocumentId({})).toBeNull();
	});

	test("requires explicit private storage provenance", () => {
		expect(
			isPrivateEmployeeDocumentMeta({
				workflow: "employee_document",
				storageAccess: "private",
			}),
		).toBe(true);
		expect(
			isPrivateEmployeeDocumentMeta({ workflow: "employee_document" }),
		).toBe(false);
	});

	test("allows only trusted legacy provider URLs", () => {
		expect(
			trustedLegacyEmployeeDocumentUrl(
				"https://store.public.blob.vercel-storage.com/user/document.pdf",
			),
		).toBeTruthy();
		expect(
			trustedLegacyEmployeeDocumentUrl(
				"https://res.cloudinary.com/demo/image/upload/contractor-document/document.pdf",
			),
		).toBeTruthy();
		expect(
			trustedLegacyEmployeeDocumentUrl(
				"https://res.cloudinary.com/demo/image/upload/public-avatar/avatar.png",
			),
		).toBeNull();
		expect(
			trustedLegacyEmployeeDocumentUrl(
				"https://store.public.blob.vercel-storage.com.evil.test/document.pdf",
			),
		).toBeNull();
		expect(
			trustedLegacyEmployeeDocumentUrl("http://127.0.0.1/file"),
		).toBeNull();
	});

	test("classifies held legacy sources without returning sensitive values", () => {
		expect(classifyLegacyEmployeeDocumentSource(" ")).toEqual({
			kind: "missing",
		});
		expect(
			classifyLegacyEmployeeDocumentSource("/api/employee-documents/42"),
		).toEqual({ kind: "internal_application_route" });
		expect(
			classifyLegacyEmployeeDocumentSource("http://127.0.0.1/file"),
		).toEqual({ kind: "unsupported_protocol" });
		expect(classifyLegacyEmployeeDocumentSource("/legacy/private.pdf")).toEqual(
			{ kind: "relative_path" },
		);
		expect(classifyLegacyEmployeeDocumentSource("legacy/private.pdf")).toEqual({
			kind: "bare_storage_reference",
		});
		expect(
			classifyLegacyEmployeeDocumentSource(
				"https://untrusted.example/private.pdf",
			),
		).toEqual({ kind: "untrusted_https_host" });
		expect(classifyLegacyEmployeeDocumentSource("https://[bad")).toEqual({
			kind: "invalid_url",
		});
	});

	test("accepts only path-linked trusted metadata for a bare record", () => {
		const record = {
			url: "contractor-document/employee-proof",
			meta: {
				url: "https://res.cloudinary.com/demo/image/upload/v1/contractor-document/employee-proof.pdf",
			},
		};
		expect(trustedLegacyEmployeeDocumentUrlFromRecord(record)).toBe(
			record.meta.url,
		);
		expect(
			trustedLegacyEmployeeDocumentUrlFromRecord({
				...record,
				meta: {
					url: "https://res.cloudinary.com/demo/image/upload/v1/contractor-document/employee-proof-copy.pdf",
				},
			}),
		).toBeNull();
		expect(
			trustedLegacyEmployeeDocumentUrlFromRecord({
				...record,
				meta: {
					url: "https://untrusted.example/contractor-document/employee-proof.pdf",
				},
			}),
		).toBeNull();
	});
});
