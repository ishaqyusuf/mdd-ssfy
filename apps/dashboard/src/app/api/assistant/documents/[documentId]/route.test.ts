import { describe, expect, test } from "bun:test";
import { trustedAssistantPublicBlobUrl } from "@api/assistant/documents";

describe("Assistant public document proxy", () => {
	test("allows only HTTPS Vercel public Blob URLs", () => {
		expect(
			trustedAssistantPublicBlobUrl(
				"https://store.public.blob.vercel-storage.com/sales/invoice.pdf",
			),
		).toBe("https://store.public.blob.vercel-storage.com/sales/invoice.pdf");
		expect(
			trustedAssistantPublicBlobUrl("http://127.0.0.1/private"),
		).toBeNull();
		expect(
			trustedAssistantPublicBlobUrl(
				"https://store.public.blob.vercel-storage.com.evil.test/file.pdf",
			),
		).toBeNull();
	});
});
