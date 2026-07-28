import { describe, expect, test } from "bun:test";
import { resolveUploadImageMimeType } from "./upload-image-mime";

describe("resolveUploadImageMimeType", () => {
	test("uses an allowed picker MIME when present", () => {
		expect(resolveUploadImageMimeType("image/png", "photo.jpg")).toBe(
			"image/png",
		);
	});

	test("falls back to the filename extension for missing HEIC MIME", () => {
		expect(resolveUploadImageMimeType(null, "photo.HEIC")).toBe("image/heic");
	});

	test("rejects unsupported picker types", () => {
		expect(resolveUploadImageMimeType("image/svg+xml", "photo.svg")).toBeNull();
	});
});
