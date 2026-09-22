import { describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import {
	resolveEmployeeDocumentMimeType,
	validateEmployeeDocumentFile,
} from "./employee-document-upload";

function file(input: { name: string; type?: string; size?: number }) {
	return {
		name: input.name,
		type: input.type ?? "",
		size: input.size ?? 10,
	} as File;
}

describe("employee document browser validation", () => {
	test("accepts declared MIME types and safe extension fallback", () => {
		assert.equal(
			resolveEmployeeDocumentMimeType(
				file({ name: "proof.bin", type: "application/pdf" }),
			),
			"application/pdf",
		);
		assert.equal(
			resolveEmployeeDocumentMimeType(file({ name: "photo.HEIC" })),
			"image/heic",
		);
		assert.equal(
			validateEmployeeDocumentFile(file({ name: "proof.pdf" })),
			null,
		);
	});

	test("rejects unsupported, empty and oversized selections before encoding", () => {
		assert.match(
			validateEmployeeDocumentFile(file({ name: "payload.exe" })) ?? "",
			/PDF/,
		);
		assert.match(
			validateEmployeeDocumentFile(file({ name: "proof.pdf", size: 0 })) ?? "",
			/8 MB/,
		);
		assert.match(
			validateEmployeeDocumentFile(
				file({ name: "proof.pdf", size: 8_000_001 }),
			) ?? "",
			/8 MB/,
		);
	});
});
