type QuantityLike = {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
};

export type DriverManifestItemPresentationInput = {
	handingLabel?: string | null;
	itemType?: string | null;
	productTitle?: string | null;
	sectionTitle?: string | null;
	size?: string | null;
	swing?: string | null;
	subtitle?: string | null;
	title?: string | null;
	totalQty?: QuantityLike | null;
};

const LEGACY_SALES_ITEM_TITLE = /^sales item(?:\s+#?)?\d+$/i;
const FINANCIAL_OR_LABOR =
	/[$€£]|\b(?:labor|labour|cost|price|rate|subtotal|unit\s+cost)\b|\/\s*qty\b/i;
const QUANTITY_ONLY =
	/^(?:(?:qty|quantity)\s*[:#-]?\s*)?\d+(?:\.\d+)?\s*(?:x|×)?\s*(?:ea|each|pcs?|lh|rh)?$/i;

function cleanText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function semanticKey(value: string) {
	return value
		.toLowerCase()
		.replaceAll("×", "x")
		.replace(/[\s\p{P}\p{S}]+/gu, "")
		.trim();
}

function safeSubtitleSegments(value: string | null) {
	return (value || "")
		.split(/[|·•]+/)
		.map((part) => part.trim())
		.filter(Boolean)
		.filter((part) => !FINANCIAL_OR_LABOR.test(part))
		.filter((part) => !QUANTITY_ONLY.test(part));
}

function handing(input: DriverManifestItemPresentationInput) {
	const swing = cleanText(input.swing);
	if (swing && /\b(?:lh|left)\b/i.test(swing)) return "LH";
	if (swing && /\b(?:rh|right)\b/i.test(swing)) return "RH";
	const label = cleanText(input.handingLabel) || "";
	const left = /\b(?:lh|left)\b/i.test(label);
	const right = /\b(?:rh|right)\b/i.test(label);
	if (left && right) return "LH / RH";
	if (left) return "LH";
	if (right) return "RH";
	return null;
}

export function getDriverManifestItemPresentation(
	input: DriverManifestItemPresentationInput,
) {
	const rawTitle = cleanText(input.title);
	const productTitle = cleanText(input.productTitle);
	const subtitleSegments = safeSubtitleSegments(cleanText(input.subtitle));
	const usableProductTitle =
		productTitle && !LEGACY_SALES_ITEM_TITLE.test(productTitle)
			? productTitle
			: null;
	const usableTitle =
		rawTitle &&
		!LEGACY_SALES_ITEM_TITLE.test(rawTitle) &&
		!FINANCIAL_OR_LABOR.test(rawTitle)
			? rawTitle
			: null;
	const title = (
		usableProductTitle ||
		usableTitle ||
		subtitleSegments[0] ||
		cleanText(input.itemType) ||
		"Untitled item"
	).toUpperCase();
	const titleKey = semanticKey(title);
	const candidates = [
		cleanText(input.itemType),
		cleanText(input.sectionTitle),
		cleanText(input.size),
		handing(input),
		...subtitleSegments,
	];
	const seen = new Set<string>();
	const description = candidates
		.filter((value): value is string => Boolean(value))
		.filter((value) => {
			const key = semanticKey(value);
			if (!key || seen.has(key) || titleKey.includes(key)) return false;
			seen.add(key);
			return true;
		})
		.join(" · ");

	return {
		title,
		description: description || "Packing item",
	};
}
