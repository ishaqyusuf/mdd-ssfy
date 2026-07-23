import { describe, expect, test } from "bun:test";
import { decodeValidatedDocumentBase64 } from "./upload-validation";

describe("decodeValidatedDocumentBase64", () => {
	test("accepts canonical base64 with matching file signatures", () => {
		const png = Buffer.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
		]).toString("base64");

		expect(
			decodeValidatedDocumentBase64({
				content: png,
				contentType: "image/png",
			}),
		).toEqual(Buffer.from(png, "base64"));
	});

	test("rejects mismatched and non-canonical content", () => {
		const pdf = Buffer.from("%PDF-1.7").toString("base64");

		expect(() =>
			decodeValidatedDocumentBase64({
				content: pdf,
				contentType: "image/png",
			}),
		).toThrow("declared file type");
		expect(() =>
			decodeValidatedDocumentBase64({
				content: `${pdf}\n`,
				contentType: "application/pdf",
			}),
		).toThrow("declared file type");
	});
});
