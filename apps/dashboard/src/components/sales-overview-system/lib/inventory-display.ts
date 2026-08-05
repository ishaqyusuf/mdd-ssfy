export function formatInventoryCategoryStepLabel(
	value: string | null | undefined,
) {
	return (value || "")
		.replaceAll("_", " ")
		.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function formatInventoryItemSubtitle({
	stepName,
	variantName,
	fallback = "Inventory item",
}: {
	stepName: string | null | undefined;
	variantName: string | null | undefined;
	fallback?: string;
}) {
	return (
		[formatInventoryCategoryStepLabel(stepName), variantName?.toUpperCase()]
			.filter(Boolean)
			.join(" • ") || fallback
	);
}

export function formatInventoryExpectedDateLabel(value: string) {
	if (!value) return "Expected date";
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return "Expected date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

export function formatInventoryDateInputValue(value: Date) {
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, "0");
	const day = String(value.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
