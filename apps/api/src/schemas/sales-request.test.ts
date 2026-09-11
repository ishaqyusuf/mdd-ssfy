import { expect, test } from "bun:test";
import {
	generateSalesRequestPreviewSchema,
	setSalesRequestDefaultSchema,
} from "./sales-request";

test("preview accepts text or request-scoped bytes, not client configuration or URLs", () => {
	expect(
		generateSalesRequestPreviewSchema.parse({ text: "one door" }).images,
	).toEqual([]);
	expect(
		generateSalesRequestPreviewSchema.safeParse({ text: " " }).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			text: "one door",
			settingId: 3,
		}).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			text: "one door",
			customerProfileId: 17,
		}).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			images: [{ url: "https://example.com/image.png" }],
		}).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			images: [{ mediaType: "image/png", base64: "YWJjZA==" }],
		}).success,
	).toBe(true);
});

test("rejects unsupported formats and malformed base64 before decoding", () => {
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			images: [{ mediaType: "image/svg+xml", base64: "YWJjZA==" }],
		}).success,
	).toBe(false);
	expect(
		generateSalesRequestPreviewSchema.safeParse({
			images: [
				{ mediaType: "image/png", base64: "data:image/png;base64,YWJjZA==" },
			],
		}).success,
	).toBe(false);
});

test("default writes accept a nullable component UID but never a client setting ID", () => {
	expect(
		setSalesRequestDefaultSchema.parse({
			rootUid: "root",
			stepUid: "step",
			componentUid: null,
		}),
	).toEqual({ rootUid: "root", stepUid: "step", componentUid: null });
	expect(
		setSalesRequestDefaultSchema.safeParse({
			rootUid: "root",
			stepUid: "step",
			componentUid: "component",
			settingId: 7,
		}).success,
	).toBe(false);
});
