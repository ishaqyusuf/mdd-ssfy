import { describe, expect, test } from "bun:test";
import {
	buildBugReportEvidenceCaption,
	getBugReportTranscriptionConfig,
	mergeBugReportTranscriptionMeta,
	transcribeBugReportAudioDocument,
} from "./bug-report-transcription";

describe("bug report transcription helpers", () => {
	test("returns null when Groq transcription is not configured", () => {
		expect(getBugReportTranscriptionConfig({})).toBeNull();
	});

	test("builds Groq-compatible multipart transcription requests", async () => {
		const calls: Array<{ url: string; init?: RequestInit }> = [];
		const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: url.toString(), init });

			if (calls.length === 1) {
				return new Response("voice bytes", {
					headers: {
						"content-type": "audio/webm",
					},
				});
			}

			return Response.json({ text: "The submit button is hidden." });
		};

		const result = await transcribeBugReportAudioDocument(
			{
				url: "https://blob.example.com/bug-reports/1/voice.webm",
				filename: "voice.webm",
				mimeType: "audio/webm",
			},
			{
				config: {
					apiKey: "groq-secret",
					endpoint: "https://groq.example.com/audio/transcriptions",
					model: "whisper-test",
					provider: "groq",
				},
				fetcher: fetcher as typeof fetch,
			},
		);

		expect(result).toEqual({
			text: "The submit button is hidden.",
			provider: "groq",
			model: "whisper-test",
		});
		expect(calls[0]?.url).toBe(
			"https://blob.example.com/bug-reports/1/voice.webm",
		);
		expect(calls[1]?.url).toBe("https://groq.example.com/audio/transcriptions");
		expect(calls[1]?.init?.method).toBe("POST");
		expect(calls[1]?.init?.headers).toEqual({
			Authorization: "Bearer groq-secret",
		});

		const body = calls[1]?.init?.body;
		expect(body).toBeInstanceOf(FormData);
		expect((body as FormData).get("model")).toBe("whisper-test");
		expect((body as FormData).get("response_format")).toBe("json");
		expect((body as FormData).get("temperature")).toBe("0");
		expect((body as FormData).get("file")).toBeInstanceOf(Blob);
	});

	test("surfaces transcription provider errors", async () => {
		const fetcher = async (
			_url: string | URL | Request,
			init?: RequestInit,
		) => {
			if (!init) return new Response("voice bytes");

			return Response.json(
				{
					error: {
						message: "invalid api key",
					},
				},
				{ status: 401 },
			);
		};

		await expect(
			transcribeBugReportAudioDocument(
				{
					url: "https://blob.example.com/voice.webm",
				},
				{
					config: {
						apiKey: "bad-secret",
						endpoint: "https://groq.example.com/audio/transcriptions",
						model: "whisper-test",
						provider: "groq",
					},
					fetcher: fetcher as typeof fetch,
				},
			),
		).rejects.toThrow("invalid api key");
	});

	test("merges transcription metadata into existing document metadata", () => {
		expect(
			mergeBugReportTranscriptionMeta(
				{
					durationMs: 1200,
				},
				{
					transcriptionStatus: "COMPLETED",
				},
			),
		).toEqual({
			durationMs: 1200,
			transcriptionStatus: "COMPLETED",
		});

		expect(
			mergeBugReportTranscriptionMeta(null, {
				transcriptionStatus: "FAILED",
			}),
		).toEqual({
			transcriptionStatus: "FAILED",
		});
	});

	test("builds evidence captions with typed context and voice transcript", () => {
		expect(
			buildBugReportEvidenceCaption(
				"The submit button is hidden.",
				"It disappears after opening the invoice drawer.",
			),
		).toBe(
			"The submit button is hidden.\n\nVoice transcript:\nIt disappears after opening the invoice drawer.",
		);

		expect(
			buildBugReportEvidenceCaption(
				null,
				"It disappears after opening the invoice drawer.",
			),
		).toBe("It disappears after opening the invoice drawer.");

		expect(
			buildBugReportEvidenceCaption(
				"Voice transcript:\nIt disappears after opening the invoice drawer.",
				"It disappears after opening the invoice drawer.",
			),
		).toBe(
			"Voice transcript:\nIt disappears after opening the invoice drawer.",
		);
	});
});
