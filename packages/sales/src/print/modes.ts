import type { PrintMode } from "./types";

const MODE_ALIASES: Record<string, PrintMode> = {
	invoice: "invoice",
	order: "invoice",
	quote: "quote",
	production: "production",
	"packing list": "packing-slip",
	"packing-slip": "packing-slip",
	"order-packing": "order-packing",
};

export function normalizePrintMode(
	mode?: string | null,
	salesType: "order" | "quote" = "order",
): PrintMode {
	const key = String(mode || "")
		.trim()
		.toLowerCase();

	if (key.includes(",")) {
		return getPrintModeRequestKey(key, salesType);
	}

	return MODE_ALIASES[key] ?? (salesType === "quote" ? "quote" : "invoice");
}

export function parsePrintModes(
	mode?: string | null,
	salesType: "order" | "quote" = "order",
): PrintMode[] {
	const rawModes = String(mode || "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
	const modes: PrintMode[] = rawModes.length
		? rawModes.map((value) => normalizePrintMode(value, salesType))
		: [salesType === "quote" ? "quote" : "invoice"];

	return dedupePrintModes(modes.flatMap(expandPrintMode));
}

export function getPrintModeRequestKey(
	mode?: string | null,
	salesType: "order" | "quote" = "order",
): PrintMode {
	const modes = parsePrintModes(mode, salesType);

	if (
		modes.length === 2 &&
		modes.includes("invoice") &&
		modes.includes("packing-slip")
	) {
		return "order-packing";
	}

	return modes[0] ?? (salesType === "quote" ? "quote" : "invoice");
}

function expandPrintMode(mode: PrintMode): PrintMode[] {
	if (mode === "order-packing") {
		return ["invoice", "packing-slip"];
	}
	return [mode];
}

function dedupePrintModes(modes: PrintMode[]) {
	const seen = new Set<PrintMode>();
	const result: PrintMode[] = [];
	for (const mode of modes) {
		if (seen.has(mode)) continue;
		seen.add(mode);
		result.push(mode);
	}
	return result;
}
