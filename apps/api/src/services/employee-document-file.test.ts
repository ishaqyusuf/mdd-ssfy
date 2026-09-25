import { afterEach, describe, expect, mock, test } from "bun:test";
import type { Db } from "@gnd/db";

const getBlob = mock(async () => null);
const headBlob = mock(async () => {
	throw new Error("Unexpected Blob HEAD request.");
});

mock.module("@vercel/blob", () => ({
	del: mock(async () => undefined),
	get: getBlob,
	head: headBlob,
	put: mock(async () => {
		throw new Error("Unexpected Blob PUT request.");
	}),
}));

const { serveEmployeeDocument } = await import("./employee-document-file");

const originalToken = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
const originalStoreId = process.env.PRIVATE_BLOB_STORE_ID;
const originalVercelEnv = process.env.VERCEL_ENV;
const originalFetch = globalThis.fetch;

afterEach(() => {
	getBlob.mockClear();
	headBlob.mockClear();
	if (originalToken === undefined) {
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = undefined;
	} else {
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = originalToken;
	}
	if (originalStoreId === undefined) {
		process.env.PRIVATE_BLOB_STORE_ID = undefined;
	} else {
		process.env.PRIVATE_BLOB_STORE_ID = originalStoreId;
	}
	if (originalVercelEnv === undefined) {
		process.env.VERCEL_ENV = undefined;
	} else {
		process.env.VERCEL_ENV = originalVercelEnv;
	}
	globalThis.fetch = originalFetch;
});

function dbFixture(storedOverrides: Record<string, unknown> = {}) {
	return {
		userDocuments: {
			findFirst: async () => ({
				id: 42,
				userId: 7,
				title: "Insurance",
				url: "/api/employee-documents/42",
				meta: { storedDocumentId: "stored-1" },
				user: { id: 7, deletedAt: null, accessRevokedAt: null },
			}),
		},
		storedDocument: {
			findFirst: async () => ({
				id: "stored-1",
				provider: "vercel-blob",
				pathname: "user/7/attachment/insurance.pdf",
				url: null,
				filename: "insurance.pdf",
				mimeType: "application/pdf",
				visibility: "private",
				meta: {
					workflow: "employee_document",
					storageAccess: "private",
				},
				...storedOverrides,
			}),
		},
	} as unknown as Db;
}

describe("employee document file service", () => {
	test("streams a private document only after owner-or-permission access", async () => {
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = "private-token";
		getBlob.mockResolvedValueOnce({
			statusCode: 200,
			stream: new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode("private-document"));
					controller.close();
				},
			}),
			headers: new Headers({
				"accept-ranges": "bytes",
				"content-length": "16",
				"content-range": "bytes 0-15/16",
				etag: '"document-etag"',
			}),
			blob: { contentType: "application/pdf" },
		} as never);

		const response = await serveEmployeeDocument({
			db: dbFixture(),
			documentId: 42,
			actor: { id: 9, canViewEmployeeDocument: true },
			request: new Request("https://gnd.example/api/employee-documents/42", {
				headers: { range: "bytes=0-15" },
			}),
		});

		expect(response.status).toBe(206);
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(response.headers.get("content-type")).toBe("application/pdf");
		expect(response.headers.get("content-range")).toBe("bytes 0-15/16");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(await response.text()).toBe("private-document");
		expect(getBlob).toHaveBeenCalledWith("user/7/attachment/insurance.pdf", {
			access: "private",
			token: "private-token",
			useCache: false,
			headers: { Range: "bytes=0-15" },
		});
		expect(response.headers.get("authorization")).toBeNull();
	});

	test("fails closed when private storage is not configured", async () => {
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = undefined;
		const response = await serveEmployeeDocument({
			db: dbFixture(),
			documentId: 42,
			actor: { id: 7 },
			request: new Request("https://gnd.example/api/employee-documents/42"),
		});
		expect(response.status).toBe(503);
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(await response.json()).toEqual({
			error: "Private employee document storage is not configured.",
		});
	});

	test("fails closed when the Production token points to another Blob store", async () => {
		process.env.VERCEL_ENV = "production";
		process.env.PRIVATE_BLOB_STORE_ID = "store_expected";
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_other_example";
		const response = await serveEmployeeDocument({
			db: dbFixture(),
			documentId: 42,
			actor: { id: 7 },
			request: new Request("https://gnd.example/api/employee-documents/42"),
		});
		expect(response.status).toBe(503);
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(await response.json()).toEqual({
			error: "Private employee document storage is not configured.",
		});
		expect(getBlob).not.toHaveBeenCalled();
	});

	test("downloads unsafe legacy content instead of rendering it on the app origin", async () => {
		const legacyUrl =
			"https://example.public.blob.vercel-storage.com/employee.html";
		for (const unsafeType of ["text/html; charset=utf-8", "image/svg+xml"]) {
			const fetchLegacy = mock(
				async () =>
					new Response("<script>alert(1)</script>", {
						headers: { "content-type": unsafeType },
					}),
			);
			globalThis.fetch = fetchLegacy as typeof fetch;
			const response = await serveEmployeeDocument({
				db: dbFixture({
					visibility: "public",
					url: legacyUrl,
					mimeType: unsafeType,
					filename: 'report"\\\n.html',
				}),
				documentId: 42,
				actor: { id: 7 },
				request: new Request("https://gnd.example/api/employee-documents/42"),
			});
			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toBe(
				"application/octet-stream",
			);
			expect(response.headers.get("content-disposition")).toBe(
				'attachment; filename="report___.html"',
			);
			expect(response.headers.get("x-content-type-options")).toBe("nosniff");
			expect(fetchLegacy).toHaveBeenCalledWith(
				legacyUrl,
				expect.objectContaining({ redirect: "error", cache: "no-store" }),
			);
		}
	});

	test("keeps PDF content inline", async () => {
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = "private-token";
		getBlob.mockResolvedValueOnce({
			statusCode: 200,
			stream: new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode("%PDF-"));
					controller.close();
				},
			}),
			headers: new Headers(),
			blob: { contentType: "application/pdf" },
		} as never);
		const response = await serveEmployeeDocument({
			db: dbFixture(),
			documentId: 42,
			actor: { id: 7 },
			request: new Request("https://gnd.example/api/employee-documents/42"),
		});
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("application/pdf");
		expect(response.headers.get("content-disposition")).toBe(
			'inline; filename="insurance.pdf"',
		);
	});

	test("returns a uniform not-found response for an unrelated employee", async () => {
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = undefined;
		const response = await serveEmployeeDocument({
			db: dbFixture(),
			documentId: 42,
			actor: { id: 9 },
			request: new Request("https://gnd.example/api/employee-documents/42"),
		});
		expect(response.status).toBe(404);
		expect(response.headers.get("cache-control")).toBe("private, no-store");
		expect(await response.json()).toEqual({ error: "File not found." });
	});
});
