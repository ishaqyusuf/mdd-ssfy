import type { SaveDraftNewSalesFormPayload } from "../types";

export type MobileInvoiceSaveAction = "save-draft" | "save-final";

export type MobileInvoiceSavePayloadSummary = {
	type: SaveDraftNewSalesFormPayload["type"];
	salesId: number | null;
	slug: string | null;
	autosave: boolean;
	lineItemCount: number;
	extraCostCount: number;
	workflowLineCount: number;
	shelfLineCount: number;
	hptLineCount: number;
	mouldingRowCount: number;
	serviceRowCount: number;
	payloadBytes: number;
};

export type MobileInvoiceSaveDiagnostic = {
	clientRequestId: string;
	action: MobileInvoiceSaveAction;
	startedAt: number;
	payload: MobileInvoiceSavePayloadSummary;
};

function randomPart() {
	return Math.random().toString(36).slice(2, 10);
}

export function createMobileInvoiceSaveRequestId(now = Date.now()) {
	return `mobile-save-${now.toString(36)}-${randomPart()}-${randomPart()}`;
}

function jsonByteLength(value: unknown) {
	try {
		// Hermes does not guarantee a global TextEncoder in every Expo runtime;
		// the UTF-16 string length is sufficient for a bounded diagnostic size.
		return JSON.stringify(value).length;
	} catch {
		return 0;
	}
}

export function summarizeMobileInvoiceSavePayload(
	payload: SaveDraftNewSalesFormPayload,
): MobileInvoiceSavePayloadSummary {
	const lineItems = payload.lineItems || [];
	return {
		type: payload.type,
		salesId: payload.salesId ?? null,
		slug: payload.slug ?? null,
		autosave: payload.autosave,
		lineItemCount: lineItems.length,
		extraCostCount: payload.extraCosts?.length || 0,
		workflowLineCount: lineItems.filter(
			(line) => (line.formSteps?.length || 0) > 0,
		).length,
		shelfLineCount: lineItems.filter(
			(line) => (line.shelfItems?.length || 0) > 0,
		).length,
		hptLineCount: lineItems.filter((line) => Boolean(line.housePackageTool))
			.length,
		mouldingRowCount: lineItems.reduce(
			(total, line) =>
				total +
				(Array.isArray(line.meta?.mouldingRows)
					? line.meta.mouldingRows.length
					: 0),
			0,
		),
		serviceRowCount: lineItems.reduce(
			(total, line) =>
				total +
				(Array.isArray(line.meta?.serviceRows)
					? line.meta.serviceRows.length
					: 0),
			0,
		),
		payloadBytes: jsonByteLength(payload),
	};
}

export function attachMobileInvoiceSaveRequestId(
	payload: SaveDraftNewSalesFormPayload,
	clientRequestId = createMobileInvoiceSaveRequestId(),
) {
	return {
		...payload,
		clientRequestId,
	};
}

export function classifyMobileInvoiceSaveError(error: unknown) {
	const message =
		error instanceof Error
			? error.message
			: error && typeof error === "object"
				? String((error as { message?: unknown }).message || "")
				: typeof error === "string"
					? error
					: "";
	if (/out of date/i.test(message)) return "conflict" as const;
	if (
		error instanceof Error &&
		(error.name === "MobileInvoiceSaveTimeoutError" ||
			error.name === "AbortError")
	) {
		return "timeout" as const;
	}
	if (error && typeof error === "object") {
		const typedError = error as {
			code?: unknown;
			data?: { code?: unknown };
			shape?: { data?: { code?: unknown } };
		};
		const code = String(
			typedError.data?.code ||
				typedError.shape?.data?.code ||
				typedError.code ||
				"",
		);
		if (code === "CONFLICT") return "conflict" as const;
		if (code === "UNAUTHORIZED" || code === "FORBIDDEN") return "auth" as const;
		if (code === "BAD_REQUEST" || code === "PARSE_ERROR")
			return "validation" as const;
	}
	if (
		error instanceof TypeError &&
		/network|fetch|connection/i.test(error.message)
	) {
		return "network" as const;
	}
	return "server" as const;
}

export function getMobileInvoiceSaveErrorMessage(
	error: unknown,
	documentLabel: "invoice" | "quote",
) {
	const documentName = documentLabel;
	switch (classifyMobileInvoiceSaveError(error)) {
		case "timeout":
			return `Could not finish saving this ${documentName}. Check your connection and try again.`;
		case "conflict":
			return `This ${documentName} changed elsewhere. Reload it before saving again.`;
		case "auth":
			return `Your session expired. Sign in again to continue saving this ${documentName}.`;
		case "validation":
			return `Check the ${documentName} details and try saving again.`;
		case "network":
			return `Could not reach the server while saving this ${documentName}. Check your connection and try again.`;
		default:
			return `Could not save this ${documentName} right now. Try again in a moment.`;
	}
}

function logDiagnostic(
	event: string,
	diagnostic: MobileInvoiceSaveDiagnostic,
	extra = {},
) {
	if (process.env.NODE_ENV !== "development") return;
	console.info("[mobile-invoice-save]", {
		event,
		clientRequestId: diagnostic.clientRequestId,
		action: diagnostic.action,
		elapsedMs: Math.round(performance.now() - diagnostic.startedAt),
		payload: diagnostic.payload,
		...extra,
	});
}

export function startMobileInvoiceSaveDiagnostic(
	action: MobileInvoiceSaveAction,
	payload: SaveDraftNewSalesFormPayload,
): MobileInvoiceSaveDiagnostic {
	const diagnostic = {
		clientRequestId:
			typeof payload.clientRequestId === "string"
				? payload.clientRequestId
				: createMobileInvoiceSaveRequestId(),
		action,
		startedAt: performance.now(),
		payload: summarizeMobileInvoiceSavePayload(payload),
	};
	logDiagnostic("started", diagnostic);
	return diagnostic;
}

export function finishMobileInvoiceSaveDiagnostic(
	diagnostic: MobileInvoiceSaveDiagnostic,
	result: { salesId?: number | null; slug?: string | null } | null,
) {
	logDiagnostic("completed", diagnostic, {
		salesId: result?.salesId ?? null,
		slug: result?.slug ?? null,
	});
}

export function failMobileInvoiceSaveDiagnostic(
	diagnostic: MobileInvoiceSaveDiagnostic,
	error: unknown,
) {
	logDiagnostic("failed", diagnostic, {
		kind: classifyMobileInvoiceSaveError(error),
		message: error instanceof Error ? error.message : String(error),
	});
}
