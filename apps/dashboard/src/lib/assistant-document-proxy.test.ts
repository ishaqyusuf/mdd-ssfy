import { describe, expect, test } from "bun:test";
import { loadAssistantDocumentProxy } from "./assistant-document-proxy";

const privateDocument = {
	access: "private" as const,
	pathname: "assistant/private.pdf",
	url: null,
};
const publicDocument = {
	access: "public" as const,
	pathname: "sales/public.pdf",
	url: "https://store.public.blob.vercel-storage.com/sales/public.pdf",
};

describe("Assistant document proxy failures", () => {
	test("keeps missing private storage distinct from a missing document", async () => {
		const dependencies = {
			getPrivate: async () => null,
			fetchPublic: async () => new Response(null, { status: 404 }),
		};
		expect(
			await loadAssistantDocumentProxy(privateDocument, undefined, dependencies),
		).toEqual({ status: "storage-unavailable" });
		expect(
			await loadAssistantDocumentProxy(privateDocument, "token", dependencies),
		).toEqual({ status: "not-found" });
	});

	test("collapses private and public provider failures to not found", async () => {
		const unavailable = {
			getPrivate: async () => {
				throw new Error("private provider details");
			},
			fetchPublic: async () => {
				throw new Error("public provider details");
			},
		};
		expect(
			await loadAssistantDocumentProxy(privateDocument, "token", unavailable),
		).toEqual({ status: "not-found" });
		expect(
			await loadAssistantDocumentProxy(publicDocument, undefined, unavailable),
		).toEqual({ status: "not-found" });
	});

	test("returns only successful trusted streams", async () => {
		const result = await loadAssistantDocumentProxy(
			publicDocument,
			undefined,
			{
				getPrivate: async () => null,
				fetchPublic: async () =>
					new Response(new Blob(["pdf"]), {
						status: 200,
						headers: { "content-type": "application/pdf" },
					}),
			},
		);
		expect(result.status).toBe("ready");
		if (result.status === "ready") {
			expect(result.contentType).toBe("application/pdf");
		}
	});
});
