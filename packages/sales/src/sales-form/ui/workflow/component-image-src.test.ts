import { describe, expect, test } from "bun:test";

import { resolveWorkflowComponentImageSrc } from "./component-image-src";

describe("workflow component image src", () => {
	test("keeps absolute and data urls unchanged", () => {
		expect(
			resolveWorkflowComponentImageSrc("https://example.com/image.png"),
		).toBe("https://example.com/image.png");
		expect(resolveWorkflowComponentImageSrc("data:image/png;base64,abc")).toBe(
			"data:image/png;base64,abc",
		);
	});

	test("resolves component image ids through the dyke Cloudinary folder", () => {
		expect(resolveWorkflowComponentImageSrc("gghdjlxprue2fhl1hqut.png")).toBe(
			"https://res.cloudinary.com/dsuwvkg3d/image/upload/v1705575174/dyke/gghdjlxprue2fhl1hqut.png",
		);
		expect(resolveWorkflowComponentImageSrc("/gghdjlxprue2fhl1hqut.png")).toBe(
			"https://res.cloudinary.com/dsuwvkg3d/image/upload/v1705575174/dyke/gghdjlxprue2fhl1hqut.png",
		);
	});

	test("does not duplicate the dyke folder", () => {
		expect(resolveWorkflowComponentImageSrc("dyke/example.jpg")).toBe(
			"https://res.cloudinary.com/dsuwvkg3d/image/upload/v1705575174/dyke/example.jpg",
		);
	});
});
