import { describe, expect, test } from "bun:test";
import {
	ASSISTANT_ATTACHMENT_MAX_BYTES,
	assistantAttachmentParts,
	validateAssistantAttachment,
	validateAssistantAttachmentTotal,
} from "./assistant-attachments";

describe("assistant attachments", () => {
	test("maps only stored document handles into chat file parts", () => {
		expect(
			assistantAttachmentParts([
				{
					id: "stored-1",
					name: "request.png",
					mimeType: "image/png",
					size: 42,
					pathname: "private/request.png",
					previewUrl: "https://example.com/request.png",
				},
			]),
		).toEqual([
			{
				type: "file",
				mediaType: "image/png",
				filename: "request.png",
				url: "stored-1",
			},
		]);
	});

	test("rejects unsupported and oversized files before upload", async () => {
		const message = async (promise: Promise<unknown>) => {
			try {
				await promise;
				return "";
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			}
		};
		expect(
			await message(
				validateAssistantAttachment(
					new File(["hello"], "notes.txt", { type: "text/plain" }),
				),
			),
		).toContain("not a supported image or PDF");
		expect(
			await message(
				validateAssistantAttachment(
					new File(
						[new Uint8Array(ASSISTANT_ATTACHMENT_MAX_BYTES + 1)],
						"big.png",
						{
							type: "image/png",
						},
					),
				),
			),
		).toContain("smaller than 8 MB");
	});

	test("rejects an attachment selection over the message aggregate", () => {
		let message = "";
		try {
			validateAssistantAttachmentTotal(
				[{ size: 8_000_000 }],
				[{ size: 8_000_001 }],
			);
		} catch (error) {
			message = error instanceof Error ? error.message : "";
		}
		expect(message).toContain("16 MB");
	});
});
