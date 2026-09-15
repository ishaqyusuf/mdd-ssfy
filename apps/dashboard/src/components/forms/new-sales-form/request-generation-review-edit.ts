import { newSalesFormSeedSchema } from "@gnd/sales/sales-form";
import type { SalesRequestGeneratePreviewOutput } from "./request-generation-controller";

/** Explicit reviewer choice; native preparation still checks visibility, sizes and prices. */
export function resolveSalesRequestDoorProduct(
	preview: SalesRequestGeneratePreviewOutput,
	input: {
		lineUid: string;
		stepId: number;
		componentUid: string;
		field?: "door" | "doorType";
		replaceExisting?: boolean;
	},
): SalesRequestGeneratePreviewOutput {
	const field = (input.field || "door").toLowerCase();
	const seed = structuredClone(preview.seed);
	const line = seed.lineItems.find((line) => line.uid === input.lineUid);
	if (
		!line ||
		!input.componentUid.trim() ||
		!(
			seed.unresolved.some(
				(entry) =>
					entry.lineUid === input.lineUid &&
					entry.stepId === input.stepId &&
					entry.field.trim().toLowerCase() === field,
			) ||
			(input.replaceExisting &&
				line.formSteps.some((step) => step.stepId === input.stepId))
		)
	)
		throw new Error("This request no longer has that unresolved Door product.");
	line.formSteps = line.formSteps.filter(
		(step) => step.stepId !== input.stepId,
	);
	line.formSteps.push(
		field === "doortype"
			? { stepId: input.stepId, prodUid: input.componentUid }
			: {
					stepId: input.stepId,
					meta: { selectedProdUids: [input.componentUid] },
				},
	);
	seed.unresolved = seed.unresolved.filter(
		(entry) =>
			!(
				entry.lineUid === input.lineUid &&
				entry.stepId === input.stepId &&
				entry.field.trim().toLowerCase() === field
			),
	);
	return {
		...preview,
		seed: newSalesFormSeedSchema.parse(seed),
		userReviewed: true,
	};
}
