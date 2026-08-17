import { describe, expect, it } from "bun:test";

import {
	decryptSpecialOrderSignature,
	encryptSpecialOrderSignature,
	getSpecialOrderSignatureBlobAccess,
} from "./signature-storage";

describe("Special Order signature storage", () => {
	it("uses the configured public Blob store for encrypted signatures in production", () => {
		const originalNodeEnv = process.env.NODE_ENV;
		const originalAccess = process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS;
		const originalBlobUrl = process.env.NEXT_PUBLIC_VERCEL_BLOB_URL;
		process.env.NODE_ENV = "production";
		delete process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS;
		process.env.NEXT_PUBLIC_VERCEL_BLOB_URL =
			"https://example.public.blob.vercel-storage.com";

		try {
			expect(getSpecialOrderSignatureBlobAccess()).toBe("public");
		} finally {
			if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
			else process.env.NODE_ENV = originalNodeEnv;
			if (originalAccess === undefined) {
				delete process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS;
			} else {
				process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS = originalAccess;
			}
			if (originalBlobUrl === undefined) {
				delete process.env.NEXT_PUBLIC_VERCEL_BLOB_URL;
			} else {
				process.env.NEXT_PUBLIC_VERCEL_BLOB_URL = originalBlobUrl;
			}
		}
	});

	it("allows an explicit private signature store to override the shared store", () => {
		const originalAccess = process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS;
		const originalBlobUrl = process.env.NEXT_PUBLIC_VERCEL_BLOB_URL;
		process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS = "private";
		process.env.NEXT_PUBLIC_VERCEL_BLOB_URL =
			"https://example.public.blob.vercel-storage.com";

		try {
			expect(getSpecialOrderSignatureBlobAccess()).toBe("private");
		} finally {
			if (originalAccess === undefined) {
				delete process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS;
			} else {
				process.env.SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS = originalAccess;
			}
			if (originalBlobUrl === undefined) {
				delete process.env.NEXT_PUBLIC_VERCEL_BLOB_URL;
			} else {
				process.env.NEXT_PUBLIC_VERCEL_BLOB_URL = originalBlobUrl;
			}
		}
	});

	it("round-trips a PNG without exposing its bytes in the stored envelope", () => {
		const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
		const envelope = encryptSpecialOrderSignature(png, "test-secret");

		expect(Buffer.from(envelope).equals(png)).toBe(false);
		expect(Buffer.from(envelope).includes(png)).toBe(false);
		expect(
			Buffer.from(decryptSpecialOrderSignature(envelope, "test-secret")),
		).toEqual(png);
	});

	it("rejects tampering and the wrong server secret", () => {
		const envelope = encryptSpecialOrderSignature(
			Buffer.from("private signature"),
			"correct-secret",
		);
		const tampered = Buffer.from(envelope);
		tampered[tampered.length - 1] ^= 1;

		expect(() =>
			decryptSpecialOrderSignature(tampered, "correct-secret"),
		).toThrow();
		expect(() =>
			decryptSpecialOrderSignature(envelope, "wrong-secret"),
		).toThrow();
	});
});
