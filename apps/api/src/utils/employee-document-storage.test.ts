import { afterEach, describe, expect, test } from "bun:test";
import { getEmployeeDocumentBlobToken } from "./employee-document-storage";

const originalToken = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;

afterEach(() => {
	if (originalToken === undefined) {
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = undefined;
	} else {
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = originalToken;
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
		process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = " private-token ";
		expect(getEmployeeDocumentBlobToken()).toBe("private-token");
	});
});
