import { describe, expect, it } from "bun:test";
import {
	authorizeBugReportUpload,
	canCompleteBugReportUpload,
} from "./bug-report-upload-policy";

const intent = {
	id: "intent-1",
	createdById: 41,
	pathname: "bug-reports/41/intent-1.webm",
	expectedMimeType: "video/webm",
	expectedSize: 1200,
	state: "PENDING" as const,
	expiresAt: new Date("2026-09-18T18:15:00.000Z"),
};
const now = new Date("2026-09-18T18:00:00.000Z");

describe("bug report upload policy", () => {
	it("authorizes only the exact pending intent owner and pathname", () => {
		expect(
			authorizeBugReportUpload(intent, {
				actorId: 41,
				pathname: intent.pathname,
				now,
			}),
		).toMatchObject({ contentType: "video/webm", maximumSizeInBytes: 1200 });
		expect(() =>
			authorizeBugReportUpload(intent, {
				actorId: 42,
				pathname: intent.pathname,
				now,
			}),
		).toThrow();
		expect(() =>
			authorizeBugReportUpload(intent, {
				actorId: 41,
				pathname: "bug-reports/41/fabricated.webm",
				now,
			}),
		).toThrow();
	});

	it("rejects expired intents and mismatched completion metadata", () => {
		expect(() =>
			authorizeBugReportUpload(intent, {
				actorId: 41,
				pathname: intent.pathname,
				now: intent.expiresAt,
			}),
		).toThrow();
		expect(
			canCompleteBugReportUpload(intent, {
				actorId: 41,
				pathname: intent.pathname,
				contentType: "video/webm",
				size: 999,
				now,
			}),
		).toBe(false);
	});

	it("makes duplicate verified callbacks harmless", () => {
		expect(
			canCompleteBugReportUpload(
				{ ...intent, state: "READY" },
				{
					actorId: 41,
					pathname: intent.pathname,
					contentType: "video/webm",
					size: 1200,
					now,
				},
			),
		).toBe(true);
	});
});
