import type { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import {
	isSalesDocumentPreflightRequiredError,
	prepareSalesHtmlPreview,
} from "@/modules/sales-print/application/sales-print-service";
import { openSalesDocumentReadiness } from "@/store/sales-document-readiness";
import type { IOrderPrintMode } from "@/types/sales";
import {
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
	useQueryStates,
} from "nuqs";
import { useRef } from "react";

export function useSalesPreview() {
	const requestRef = useRef(0);
	const [params, setParams] = useQueryStates({
		salesPreviewId: parseAsInteger,
		salesPreviewCustomerEmail: parseAsString,
		salesPreviewCustomerName: parseAsString,
		salesPreviewError: parseAsString,
		salesPreviewRequest: parseAsString,
		salesPreviewToken: parseAsString,
		salesPreviewUrl: parseAsString,
		salesPreviewType: parseAsStringEnum(["order", "quote"] as SalesType[]),
		previewMode: parseAsStringEnum([
			"order",
			"order-packing",
			"packing list",
			"production",
			"quote",
		] as IOrderPrintMode[]),
		dispatchId: parseAsInteger,
	});
	const opened = !!params.salesPreviewId && !!params.salesPreviewType;

	async function preview(
		salesId: number | null | undefined,
		salesPreviewType: typeof params.salesPreviewType,
		options?: {
			mode?: IOrderPrintMode;
			dispatchId?: number | null;
			customerEmail?: string | null;
			customerName?: string | null;
		},
	) {
		if (!salesId || !salesPreviewType) return;

		requestRef.current += 1;
		const requestId = `${Date.now()}-${requestRef.current}`;
		const previewMode = options?.mode ?? (salesPreviewType as IOrderPrintMode);

		setParams({
			salesPreviewId: salesId,
			salesPreviewCustomerEmail: options?.customerEmail ?? null,
			salesPreviewCustomerName: options?.customerName ?? null,
			salesPreviewType,
			salesPreviewRequest: requestId,
			salesPreviewUrl: null,
			salesPreviewError: null,
			previewMode,
			...(options?.dispatchId !== undefined
				? { dispatchId: options.dispatchId }
				: {}),
		});

		try {
			const previewUrl = await prepareSalesHtmlPreview({
				salesIds: [salesId],
				mode: previewMode,
				dispatchId: options?.dispatchId ?? null,
			});

			if (!isCurrentPreviewRequest(requestId)) return;

			setParams({
				salesPreviewUrl: previewUrl,
				salesPreviewError: null,
			});
		} catch (error) {
			if (!isCurrentPreviewRequest(requestId)) return;
			if (isSalesDocumentPreflightRequiredError(error)) {
				openSalesDocumentReadiness(error.readiness, () =>
					preview(salesId, salesPreviewType, options),
				);
				return;
			}

			setParams({
				salesPreviewError:
					error instanceof Error
						? error.message
						: "Unable to prepare this preview.",
			});
		}
	}

	return {
		params,
		opened,
		setParams,
		close() {
			requestRef.current += 1;
			setParams({
				salesPreviewId: null,
				salesPreviewCustomerEmail: null,
				salesPreviewCustomerName: null,
				salesPreviewError: null,
				salesPreviewRequest: null,
				salesPreviewToken: null,
				salesPreviewUrl: null,
				salesPreviewType: null,
				previewMode: null,
			});
		},
		preview,
	};
}

function isCurrentPreviewRequest(requestId: string) {
	if (typeof window === "undefined") return true;

	return (
		new URLSearchParams(window.location.search).get("salesPreviewRequest") ===
		requestId
	);
}
