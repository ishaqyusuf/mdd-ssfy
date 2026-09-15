import { expect, test } from "bun:test";
import { withAssistantAttachmentCorrection } from "./attachment-errors";

for (const [decoder, name, message, outcome] of [
	["pdf", "InvalidPDFException", "private document contents", "attachment-unreadable"],
	["pdf", "PasswordException", "private password", "attachment-unreadable"],
	["image", "Error", "Input image exceeds pixel limit", "attachment-too-large"],
	["image", "Error", "Input buffer contains unsupported image format", "attachment-unreadable"],
	["image", "Error", "Input buffer has corrupt header: private bytes", "attachment-unreadable"],
] as const) {
	test(`${decoder}: ${name} ${outcome} preserves original cause privately`, async () => {
		const original = Object.assign(new Error(message), { name });
		await expect(withAssistantAttachmentCorrection(decoder, async () => { throw original; }))
			.rejects.toMatchObject({ outcomeKind: outcome, cause: original });
	});
}

test("unexpected decoder errors retain their identity", async () => {
	const original = new Error("private service failure");
	await expect(withAssistantAttachmentCorrection("pdf", async () => { throw original; }))
		.rejects.toBe(original);
});
