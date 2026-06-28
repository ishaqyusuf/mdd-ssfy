import { DEFAULT_SALES_PRINT_TEMPLATE_ID } from "./sales-print-request";

export type SalesInventoryPrintRawParams = Record<
	string,
	string | string[] | undefined
>;

function readSalesInventoryPrintIds(
	rawParams: SalesInventoryPrintRawParams,
) {
	const rawIds = readStringParam(rawParams.ids || rawParams.salesIds);
	return rawIds
		.split(",")
		.map((value) => Number.parseInt(value.trim(), 10))
		.filter((value) => Number.isFinite(value) && value > 0);
}

export function readSalesInventoryPrintParams(
	rawParams: SalesInventoryPrintRawParams,
) {
	return {
		ids: readSalesInventoryPrintIds(rawParams),
		mode: readStringParam(rawParams.mode) || "production",
		templateId:
			readStringParam(rawParams.templateId) || DEFAULT_SALES_PRINT_TEMPLATE_ID,
		preview: readBooleanParam(rawParams.preview),
	};
}

export function buildSalesInventoryPrintViewerUrl(input: {
	salesIds: Array<number | null | undefined>;
	mode: string;
	templateId?: string | null;
	preview?: boolean;
	origin?: string;
}) {
	const ids = Array.from(
		new Set(
			input.salesIds
				.map((id) => Number(id || 0))
				.filter((id) => Number.isFinite(id) && id > 0),
		),
	);
	const url = input.origin
		? new URL("p/sales-inventory-v2", input.origin)
		: new URL("p/sales-inventory-v2", "http://same-origin.local");

	url.searchParams.set("ids", ids.join(","));
	url.searchParams.set("mode", input.mode);
	url.searchParams.set("preview", String(input.preview ?? false));

	const templateId = input.templateId ?? DEFAULT_SALES_PRINT_TEMPLATE_ID;
	if (templateId && templateId !== DEFAULT_SALES_PRINT_TEMPLATE_ID) {
		url.searchParams.set("templateId", templateId);
	}

	if (input.origin) {
		return url.toString();
	}

	return `${url.pathname}${url.search}`;
}

function readStringParam(value: SalesInventoryPrintRawParams[string]) {
	if (Array.isArray(value)) {
		return value[0] ?? "";
	}
	return typeof value === "string" ? value : "";
}

function readBooleanParam(value: SalesInventoryPrintRawParams[string]) {
	if (Array.isArray(value)) {
		return value[0] === "true";
	}
	return value === "true";
}
