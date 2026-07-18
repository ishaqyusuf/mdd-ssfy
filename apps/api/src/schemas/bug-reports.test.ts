import { describe, expect, test } from "bun:test";
import {
	BUG_REPORT_MAX_AUDIO_SIZE_BYTES,
	addBugReportFollowUpSchema,
	createBugReportSchema,
} from "./bug-reports";

const imageUpload = {
	url: "https://blob.example.com/bug-reports/1/screenshot.png",
	pathname: "bug-reports/1/screenshot.png",
	contentType: "image/png",
	size: 42_000,
	filename: "screenshot.png",
};

const videoUpload = {
	url: "https://blob.example.com/bug-reports/1/recording.webm",
	pathname: "bug-reports/1/recording.webm",
	contentType: "video/webm",
	size: 420_000,
	filename: "recording.webm",
};

const audioUpload = {
	url: "https://blob.example.com/bug-reports/1/voice.webm",
	pathname: "bug-reports/1/voice.webm",
	contentType: "audio/webm",
	size: 84_000,
	filename: "voice.webm",
};

describe("bug report schemas", () => {
	test("accepts screenshot reports with optional voice evidence", () => {
		const parsed = createBugReportSchema.parse({
			captureType: "SCREENSHOT",
			description: "The button is hidden behind the sheet.",
			currentUrl: "https://gndprodesk.localhost:3011/inventory",
			userAgent: "Browser",
			microphoneEnabled: false,
			upload: imageUpload,
			audio: {
				upload: audioUpload,
				durationMs: 2300,
				transcriptionStatus: "PENDING",
				transcriptionProvider: "pending",
			},
		});

		expect(parsed.captureType).toBe("SCREENSHOT");
		expect(parsed.audio?.upload.contentType).toBe("audio/webm");
		expect(parsed.audio?.transcriptionStatus).toBe("PENDING");
	});

	test("keeps existing video report payloads compatible", () => {
		const parsed = createBugReportSchema.parse({
			description: "Video repro",
			currentUrl: "https://gndprodesk.localhost:3011/sales-book/orders",
			userAgent: "Browser",
			durationMs: 10_000,
			microphoneEnabled: true,
			upload: videoUpload,
		});

		expect(parsed.captureType).toBe("VIDEO");
		expect(parsed.durationMs).toBe(10_000);
	});

	test("rejects oversized voice notes", () => {
		const result = addBugReportFollowUpSchema.safeParse({
			bugReportId: "bug_123",
			body: "More context",
			audio: {
				upload: {
					...audioUpload,
					size: BUG_REPORT_MAX_AUDIO_SIZE_BYTES + 1,
				},
				durationMs: 1200,
			},
		});

		expect(result.success).toBe(false);
	});
});
