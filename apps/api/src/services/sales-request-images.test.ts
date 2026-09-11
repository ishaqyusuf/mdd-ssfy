import { expect, test } from "bun:test";
import sharp from "sharp";
import { prepareSalesRequestImages } from "./sales-request-images";

test("decodes allowed images and emits metadata-free provider bytes", async () => {
	const bytes = await sharp({
		create: { width: 12, height: 12, channels: 3, background: "white" },
	})
		.png()
		.withMetadata()
		.toBuffer();
	const images = await prepareSalesRequestImages([
		{ bytes, mediaType: "image/png" },
	]);
	expect(images).toHaveLength(1);
	const image = images[0];
	if (!image) throw new Error("Normalized image is missing");
	const metadata = await sharp(image.bytes).metadata();
	expect(metadata.format).toBe("png");
	expect(metadata.exif).toBeUndefined();
});

test("rejects mismatched MIME, invalid bytes, and too many images", async () => {
	const bytes = await sharp({
		create: { width: 2, height: 2, channels: 3, background: "white" },
	})
		.png()
		.toBuffer();
	await expect(
		prepareSalesRequestImages([{ bytes, mediaType: "image/jpeg" }]),
	).rejects.toThrow("format");
	await expect(
		prepareSalesRequestImages([
			{ bytes: Buffer.from("not an image"), mediaType: "image/png" },
		]),
	).rejects.toThrow();
	await expect(
		prepareSalesRequestImages(
			Array.from({ length: 4 }, () => ({
				bytes,
				mediaType: "image/png" as const,
			})),
		),
	).rejects.toThrow("three");
});

test("rejects oversized bytes and pixel dimensions before provider use", async () => {
	await expect(
		prepareSalesRequestImages([
			{ bytes: new Uint8Array(5 * 1024 * 1024 + 1), mediaType: "image/png" },
		]),
	).rejects.toThrow("5 MiB");
	const bytes = await sharp({
		create: { width: 5000, height: 5000, channels: 3, background: "white" },
	})
		.png()
		.toBuffer();
	await expect(
		prepareSalesRequestImages([{ bytes, mediaType: "image/png" }]),
	).rejects.toThrow();
});
