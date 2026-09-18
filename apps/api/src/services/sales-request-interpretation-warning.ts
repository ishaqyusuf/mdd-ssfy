import { createHash } from "node:crypto";
import type { NewSalesFormSeed } from "@gnd/sales/sales-form";

type SalesRequestInterpretation = NonNullable<
	NewSalesFormSeed["interpretations"]
>[number];

export const SALES_REQUEST_INTERPRETATION_WARNING_CATEGORIES = [
	"product",
	"material",
	"finish",
	"route",
	"other",
] as const;
export type InterpretationWarningCategory =
	(typeof SALES_REQUEST_INTERPRETATION_WARNING_CATEGORIES)[number];

export function interpretationWarningCategory(
	field: string,
): InterpretationWarningCategory {
	const value = field.trim().toLowerCase();
	if (/finish|color|paint|stain|primer/.test(value)) return "finish";
	if (/material|species|core|wood|glass/.test(value)) return "material";
	if (/route|item.?type|category|service/.test(value)) return "route";
	if (/product|profile|model|door|mould|component/.test(value))
		return "product";
	return "other";
}

function normalWarningPart(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function interpretationWarningKey(
	warning: Pick<
		SalesRequestInterpretation,
		"stepId" | "field" | "sourceText" | "selectedProdUid"
	>,
) {
	return createHash("sha256")
		.update(
			JSON.stringify([
				warning.stepId,
				normalWarningPart(warning.field),
				normalWarningPart(warning.sourceText),
				normalWarningPart(warning.selectedProdUid),
			]),
		)
		.digest("hex")
		.slice(0, 32);
}

export function reusableInterpretationField(field: string) {
	return (
		/product|profile|material|finish|model|species|door|mould|component|route|item.?type|category|service/i.test(
			field,
		) &&
		!/quantity|qty|dimension|height|width|length|count|room|handing|price|cost/i.test(
			field,
		)
	);
}
