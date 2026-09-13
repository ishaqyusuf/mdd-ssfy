import { describe, expect, test } from "bun:test";
import { decodeValidatedDocumentBase64 } from "./upload-validation";

describe("decodeValidatedDocumentBase64", () => {
	async function errorMessage(promise: Promise<unknown>) {
		try {
			await promise;
			return "";
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
	}

	function pdfWithPages(pages: number) {
		const objects = [
			"<< /Type /Catalog /Pages 2 0 R >>",
			`<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, index) => `${index + 3} 0 R`).join(" ")}] /Count ${pages} >>`,
			...Array.from(
				{ length: pages },
				() => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
			),
		];
		let pdf = "%PDF-1.4\n";
		const offsets = [0];
		for (const [index, object] of objects.entries()) {
			offsets.push(Buffer.byteLength(pdf));
			pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
		}
		const xref = Buffer.byteLength(pdf);
		pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
		pdf += offsets
			.slice(1)
			.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
			.join("");
		pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
		return Buffer.from(pdf).toString("base64");
	}

	test("accepts canonical base64 with matching file signatures", async () => {
		const png = Buffer.from([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
		]).toString("base64");

		expect(
			await decodeValidatedDocumentBase64({
				content: png,
				contentType: "image/png",
			}),
		).toEqual(Buffer.from(png, "base64"));
	});

	test("rejects mismatched and non-canonical content", async () => {
		const pdf = Buffer.from("%PDF-1.7").toString("base64");

		expect(
			await errorMessage(
				decodeValidatedDocumentBase64({
					content: pdf,
					contentType: "image/png",
				}),
			),
		).toContain("declared file type");
		expect(
			await errorMessage(
				decodeValidatedDocumentBase64({
					content: `${pdf}\n`,
					contentType: "application/pdf",
				}),
			),
		).toContain("declared file type");
	});

	test("enforces an assistant-specific PDF page ceiling with a parser", async () => {
		expect(
			await errorMessage(
				decodeValidatedDocumentBase64({
					content: pdfWithPages(3),
					contentType: "application/pdf",
					maxPdfPages: 2,
				}),
			),
		).toContain("cannot exceed 2 pages");
	});
});
