import { describe, expect, test } from "bun:test";
import { resolveUploadContentType } from "./upload-content-type";

describe("resolveUploadContentType", () => {
	test("keeps a supported browser MIME type", () => {
		expect(
			resolveUploadContentType({
				name: "document.bin",
				type: "application/pdf",
			}),
		).toBe("application/pdf");
	});

	test("infers HEIC when the browser omits the MIME type", () => {
		expect(resolveUploadContentType({ name: "photo.HEIC", type: "" })).toBe(
			"image/heic",
		);
	});

	test("rejects unsupported file extensions", () => {
		expect(() =>
			resolveUploadContentType({ name: "vector.svg", type: "image/svg+xml" }),
		).toThrow("Unsupported file type");
	});
});
