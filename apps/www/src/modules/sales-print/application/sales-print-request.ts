import type { PrintMode } from "@gnd/sales/print/types";

export const DEFAULT_SALES_PRINT_TEMPLATE_ID = "template-2";

export type SalesPrintLocatorType =
	| "public-token"
	| "legacy-token"
	| "access-token"
	| "snapshot-id"
	| "none";

export type SalesPrintRenderMode = "stored-pdf" | "rendered-pdf";

export type SalesPrintInvalidReason = "missing-locator" | "multiple-locators";

export type SalesPrintRawParams = Record<
	string,
	boolean | string | string[] | null | undefined
>;

export interface SalesPrintRequestParams {
	pt: string;
	token: string;
	accessToken: string;
	snapshotId: string;
	preview: boolean;
	templateId: string;
	mode: PrintMode;
	pricingMode: "customer" | "internal" | null;
}

export interface SalesPrintRequestInfo {
	params: SalesPrintRequestParams;
	locatorType: SalesPrintLocatorType;
	renderMode: SalesPrintRenderMode;
	isValid: boolean;
	invalidReason?: SalesPrintInvalidReason;
}

export function normalizeSalesPrintMode(
	mode?: string | null,
	salesType: "order" | "quote" = "order",
): PrintMode {
	switch (mode) {
		case "invoice":
			return "invoice";
		case "quote":
			return "quote";
		case "production":
			return "production";
		case "packing list":
		case "packing-slip":
			return "packing-slip";
		case "order-packing":
			return "order-packing";
		case "order":
			return "invoice";
		default:
			return salesType === "quote" ? "quote" : "invoice";
	}
}

export function parseSalesPrintRequest(
	rawParams: SalesPrintRawParams,
): SalesPrintRequestInfo {
	const params: SalesPrintRequestParams = {
		pt: readStringParam(rawParams.pt),
		token: readStringParam(rawParams.token),
		accessToken: readStringParam(rawParams.accessToken),
		snapshotId: readStringParam(rawParams.snapshotId),
		preview: readBooleanParam(rawParams.preview),
		templateId:
			readStringParam(rawParams.templateId) || DEFAULT_SALES_PRINT_TEMPLATE_ID,
		mode: normalizeSalesPrintMode(readStringParam(rawParams.mode)),
		pricingMode: normalizePricingMode(readStringParam(rawParams.pricingMode)),
	};
	const locatorTypes = getPresentLocatorTypes(params);
	const locatorType = locatorTypes[0] ?? "none";
	const invalidReason =
		locatorTypes.length === 0
			? "missing-locator"
			: locatorTypes.length > 1
				? "multiple-locators"
				: undefined;
	const isValid = !invalidReason;
	const renderMode: SalesPrintRenderMode =
		isValid &&
		locatorType === "access-token" &&
		!params.preview &&
		!params.pricingMode
			? "stored-pdf"
			: "rendered-pdf";

	return {
		params,
		locatorType: isValid ? locatorType : "none",
		renderMode,
		isValid,
		invalidReason,
	};
}

function getPresentLocatorTypes(
	params: Pick<
		SalesPrintRequestParams,
		"accessToken" | "pt" | "snapshotId" | "token"
	>,
) {
	const locatorTypes: SalesPrintLocatorType[] = [];
	if (params.pt) locatorTypes.push("public-token");
	if (params.token) locatorTypes.push("legacy-token");
	if (params.accessToken) locatorTypes.push("access-token");
	if (params.snapshotId) locatorTypes.push("snapshot-id");
	return locatorTypes;
}

function readStringParam(value: SalesPrintRawParams[string]) {
	if (Array.isArray(value)) {
		return value[0] ?? "";
	}
	if (typeof value === "string") {
		return value;
	}
	return "";
}

function readBooleanParam(value: SalesPrintRawParams[string]) {
	if (typeof value === "boolean") {
		return value;
	}
	if (Array.isArray(value)) {
		return value[0] === "true";
	}
	return value === "true";
}

function normalizePricingMode(value?: string | null) {
	return value === "customer" || value === "internal" ? value : null;
}
