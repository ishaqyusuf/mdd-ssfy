import { describe, expect, test } from "bun:test";
import { assistantDocumentProposalActionSchema } from "./document-action-contract";

describe("Assistant PDF proposal action contract", () => {
	for (const mode of ["packing-slip", "order-packing"] as const) {
		test(`accepts generate and cancel actions for ${mode}`, () => {
			expect(
				assistantDocumentProposalActionSchema.parse({
					toolId: "documents_generate_pdf",
					toolVersion: 1,
					label: `Generate ${mode} PDF`,
					input: {
						orderNo: "09502PC",
						type: "order",
						mode,
						expectedRevision: "revision-1",
						forceRegenerate: false,
					},
				}),
			).toMatchObject({ input: { type: "order", mode } });
			expect(
				assistantDocumentProposalActionSchema.parse({
					toolId: "documents_cancel_pdf",
					toolVersion: 1,
					label: `Cancel ${mode} PDF generation`,
					input: {
						orderNo: "09502PC",
						type: "order",
						mode,
						snapshotId: "snapshot-1",
						expectedRevision: "revision-1",
					},
				}),
			).toMatchObject({ input: { type: "order", mode } });
		});
	}

	test("preserves quote identity when an order shares the same number", () => {
		expect(
			assistantDocumentProposalActionSchema.parse({
				toolId: "documents_generate_pdf",
				toolVersion: 1,
				label: "Generate quote PDF",
				input: {
					orderNo: "03648PC",
					type: "quote",
					mode: "quote",
					expectedRevision: "revision-1",
					forceRegenerate: false,
				},
			}),
		).toMatchObject({ input: { orderNo: "03648PC", type: "quote" } });
	});

	test("rejects the retired packing alias", () => {
		expect(
			assistantDocumentProposalActionSchema.safeParse({
				toolId: "documents_generate_pdf",
				toolVersion: 1,
				label: "Generate packing PDF",
				input: {
					orderNo: "09502PC",
					mode: "packing",
					expectedRevision: "revision-1",
					forceRegenerate: false,
				},
			}).success,
		).toBe(false);
	});
});
