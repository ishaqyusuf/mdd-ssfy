import { afterEach, describe, expect, test } from "bun:test";
import { getEmployeeDocumentBlobToken } from "./employee-document-storage";

const originalToken = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
const originalStoreId = process.env.PRIVATE_BLOB_STORE_ID;
const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
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
});

describe("employee document storage configuration", () => {
	test("fails closed without the dedicated private token", () => {
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = undefined;
		expect(() => getEmployeeDocumentBlobToken()).toThrow(
			"Private employee document storage is not configured.",
		);
	});

	test("trims the dedicated token", () => {
		process.env.VERCEL_ENV = undefined;
		process.env.PRIVATE_BLOB_STORE_ID = undefined;
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = " private-token ";
		expect(getEmployeeDocumentBlobToken()).toBe("private-token");
	});

	test("requires a matching connected store in Production", () => {
		process.env.VERCEL_ENV = "production";
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_target_example";
		process.env.PRIVATE_BLOB_STORE_ID = undefined;
		expect(() => getEmployeeDocumentBlobToken()).toThrow(
			"Private employee document storage is not configured.",
		);
		process.env.PRIVATE_BLOB_STORE_ID = "store_other";
		expect(() => getEmployeeDocumentBlobToken()).toThrow(
			"Private employee document storage is not configured.",
		);
		process.env.PRIVATE_BLOB_STORE_ID = "store_target";
		expect(getEmployeeDocumentBlobToken()).toBe(
			"vercel_blob_rw_target_example",
		);
	});

	test("rejects a mismatched or malformed token whenever a store is configured", () => {
		process.env.VERCEL_ENV = undefined;
		process.env.PRIVATE_BLOB_STORE_ID = "store_target";
		for (const token of ["vercel_blob_rw_other_example", "invalid-token"]) {
			process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = token;
			expect(() => getEmployeeDocumentBlobToken()).toThrow(
				"Private employee document storage is not configured.",
			);
		}
	});
});
