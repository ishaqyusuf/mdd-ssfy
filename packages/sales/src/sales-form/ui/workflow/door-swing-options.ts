import type { SalesFormLineItemRecord } from "../../application";

export const IN_OUT_SWING_OPTIONS = [
	{ value: "inswing", label: "In-Swing" },
	{ value: "outswing", label: "Out-Swing" },
] as const;

export function normalizeDoorSwingValue(value?: string | null) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, "");
	if (normalized === "inswing") return "inswing";
	if (normalized === "outswing") return "outswing";
	return String(value || "").trim();
}

export function getDoorSwingOptions(line: SalesFormLineItemRecord) {
	const familyText = [
		line.title,
		line.description,
		...(line.formSteps || []).flatMap((step) => [
			step?.title,
			step?.value,
			step?.step?.title,
		]),
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
	return familyText.includes("garage door") ||
		familyText.includes("exterior door")
		? IN_OUT_SWING_OPTIONS
		: null;
}
