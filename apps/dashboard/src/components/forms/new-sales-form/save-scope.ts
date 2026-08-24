export type NewSalesFormSaveScope = "full" | "legacy-po-only";

export function isLegacyPoOnlySaveResponse(
	response?: {
		saveScope?: NewSalesFormSaveScope | null;
	} | null,
) {
	return response?.saveScope === "legacy-po-only";
}
