import { z } from "zod";
import { assistantSalesPdfModeSchema } from "./pdf-contract";

const documentActionBase = {
	toolVersion: z.literal(1),
	label: z.string().trim().min(1).max(100),
};

export const assistantDocumentProposalActionSchema = z.discriminatedUnion(
	"toolId",
	[
		z
			.object({
				...documentActionBase,
				toolId: z.literal("documents_generate_pdf"),
				input: z
					.object({
						orderNo: z.string().trim().min(1).max(100),
						mode: assistantSalesPdfModeSchema,
						expectedRevision: z.string().trim().min(1).max(191),
						forceRegenerate: z.boolean(),
					})
					.strict(),
			})
			.strict(),
		z
			.object({
				...documentActionBase,
				toolId: z.literal("documents_cancel_pdf"),
				input: z
					.object({
						orderNo: z.string().trim().min(1).max(100),
						mode: assistantSalesPdfModeSchema,
						snapshotId: z.string().trim().min(1).max(191),
						expectedRevision: z.string().trim().min(1).max(191),
					})
					.strict(),
			})
			.strict(),
	],
);

export const assistantDocumentProposalActionPartSchema = z
	.object({
		type: z.literal("data-assistant-document-action"),
		id: z.string().trim().min(1).max(191),
		data: assistantDocumentProposalActionSchema,
	})
	.strict();

export type AssistantDocumentProposalAction = z.infer<
	typeof assistantDocumentProposalActionSchema
>;
