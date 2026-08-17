export function formatInventoryCategoryStepLabel(
	value: string | null | undefined,
) {
	return (value || "")
		.replaceAll("_", " ")
		.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function normalizeInventoryVariantName(
	value: string | null | undefined,
) {
	const raw = value?.trim();
	if (!raw) return null;

	const match = raw.match(/^w(\d+)_(\d+)-h(\d+)_(\d+)$/i);
	if (match) {
		return `${match[1]}-${match[2]} x ${match[3]}-${match[4]}`;
	}

	const singleMatch = raw.match(/^[wh](\d+)_(\d+)$/i);
	if (singleMatch) {
		return `${singleMatch[1]}-${singleMatch[2]}`;
	}

	const dimMatch = raw.match(/^(\d+-\d+)\s*[xX]\s*(\d+-\d+)$/);
	if (dimMatch) {
		return `${dimMatch[1]} x ${dimMatch[2]}`;
	}

	return raw;
}

export function isDoorDimensionVariant(value: string | null | undefined) {
	const raw = value?.trim();
	if (!raw) return false;
	return Boolean(
		raw.match(/^w\d+_\d+-h\d+_\d+$/i) ||
			raw.match(/^\d+-\d+\s*[xX]\s*\d+-\d+$/i),
	);
}

export function formatInventoryItemSubtitle({
	stepName,
	variantName,
	fallback = "Inventory item",
}: {
	stepName?: string | null;
	variantName?: string | null;
	fallback?: string;
}) {
	const normalizedVariant = normalizeInventoryVariantName(variantName);
	const formattedStep = formatInventoryCategoryStepLabel(stepName);
	const categoryLabel =
		formattedStep || (isDoorDimensionVariant(variantName) ? "Door" : null);

	return (
		[categoryLabel, normalizedVariant]
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

export function getDefaultInventoryExpectedDateValue(now = new Date()) {
	return formatInventoryDateInputValue(now);
}
