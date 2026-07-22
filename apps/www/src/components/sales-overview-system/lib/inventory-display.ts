export function formatInventoryCategoryStepLabel(
	value: string | null | undefined,
) {
	return (value || "")
		.replaceAll("_", " ")
		.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}
