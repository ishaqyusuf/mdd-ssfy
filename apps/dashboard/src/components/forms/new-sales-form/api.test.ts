import { describe, expect, test } from "bun:test";
import { createSalesRequestGeneratePreviewInput } from "./api";

describe("New Sales Form request-generation API boundary", () => {
	test("builds a text-only preview payload with no image data", () => {
		expect(
			createSalesRequestGeneratePreviewInput({
				text: "Customer needs three interior doors.",
			}),
		).toEqual({
			text: "Customer needs three interior doors.",
			images: [],
		});
	});
});
