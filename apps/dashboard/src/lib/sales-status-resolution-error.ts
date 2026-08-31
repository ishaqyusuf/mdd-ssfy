import { getErrorPresentation } from "@gnd/errors";

export function getSalesStatusResolutionErrorPresentation(error: unknown) {
	const presentation = getErrorPresentation(error, {
		operation: "sales.status.resolve_dependencies",
	});

	return {
		title: presentation.title,
		description: `${presentation.description} ${presentation.reference}`,
	};
}
