import { describe, expect, test } from "bun:test";
import {
	bugReportDocumentUrl,
	canAccessBugReportDocument,
} from "./bug-report-document-access";

const access = {
	actorId: 10,
	isSuperAdmin: false,
	reportOwnerId: 10,
	primaryDocumentId: "primary",
	followUpDocumentIds: ["voice", null],
	documentId: "primary",
};

describe("bug report document access", () => {
	test("allows the owner to read primary and follow-up evidence", () => {
		expect(canAccessBugReportDocument(access)).toBe(true);
		expect(canAccessBugReportDocument({ ...access, documentId: "voice" })).toBe(
			true,
		);
	});

	test("allows a super admin but denies other employees", () => {
		expect(
			canAccessBugReportDocument({
				...access,
				actorId: 20,
				isSuperAdmin: true,
			}),
		).toBe(true);
		expect(canAccessBugReportDocument({ ...access, actorId: 20 })).toBe(false);
	});

	test("rejects documents that are not attached to the report", () => {
		expect(
			canAccessBugReportDocument({ ...access, documentId: "unrelated" }),
		).toBe(false);
	});

	test("builds an encoded internal media path", () => {
		expect(bugReportDocumentUrl("report/a", "document b")).toBe(
			"/api/bug-reports/report%2Fa/documents/document%20b",
		);
	});
});
