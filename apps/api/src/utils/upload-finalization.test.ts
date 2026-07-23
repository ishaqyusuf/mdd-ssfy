import { describe, expect, test } from "bun:test";
import { finalizeUploadedDocument } from "./upload-finalization";

describe("finalizeUploadedDocument", () => {
	test("deletes the uploaded blob when canonical registration fails", async () => {
		const deleted: string[] = [];
		let markedFailed = false;

		await expect(
			finalizeUploadedDocument({
				pathname: "user/7/attachment/file.pdf",
				register: async () => {
					throw new Error("registration unavailable");
				},
				finalize: async () => ({ ok: true }),
				deleteUpload: async (pathname) => {
					deleted.push(pathname);
				},
				markFailed: async () => {
					markedFailed = true;
				},
			}),
		).rejects.toThrow("registration unavailable");

		expect(deleted).toEqual(["user/7/attachment/file.pdf"]);
		expect(markedFailed).toBe(false);
	});

	test("tombstones a registered document when feature finalization fails", async () => {
		const failedIds: string[] = [];

		await expect(
			finalizeUploadedDocument({
				pathname: "user/7/attachment/file.pdf",
				register: async () => ({ id: "stored-1" }),
				finalize: async () => {
					throw new Error("feature save failed");
				},
				deleteUpload: async () => {},
				markFailed: async (document) => {
					failedIds.push(document.id);
				},
			}),
		).rejects.toThrow("feature save failed");

		expect(failedIds).toEqual(["stored-1"]);
	});
});
