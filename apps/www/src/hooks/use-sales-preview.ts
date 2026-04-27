import { resolveSalesDocumentAccessAction } from "@/actions/resolve-sales-document-access";
import type { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import { getBaseUrl } from "@/lib/base-url";
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
	return {
		params,
		opened,
		setParams,
		close() {
			requestRef.current += 1;
			setParams(null);
		},
		async preview(
			salesId: number | null | undefined,
			salesPreviewType: typeof params.salesPreviewType,
			options?: {
				mode?: IOrderPrintMode;
				dispatchId?: number | null;
			},
		) {
			if (!salesId || !salesPreviewType) return;

			requestRef.current += 1;
			const requestId = `${Date.now()}-${requestRef.current}`;
			const previewMode =
				options?.mode ?? (salesPreviewType as IOrderPrintMode);

			setParams({
				salesPreviewId: salesId,
				salesPreviewType,
				salesPreviewRequest: requestId,
				salesPreviewUrl: null,
				salesPreviewError: null,
				previewMode,
				dispatchId: options?.dispatchId ?? null,
			});

			try {
				const access = await resolveSalesDocumentAccessAction({
					salesIds: [salesId],
					mode: toPrintMode(previewMode),
					dispatchId: options?.dispatchId ?? null,
					baseUrl: getBaseUrl(),
				});

				if (!isCurrentPreviewRequest(requestId)) return;

				setParams({
					salesPreviewUrl: access.previewUrl,
					salesPreviewError: null,
				});
			} catch {
				if (!isCurrentPreviewRequest(requestId)) return;

				setParams({
					salesPreviewError: "Unable to prepare this preview.",
				});
			}
		},
	};
}

function toPrintMode(mode: IOrderPrintMode) {
	switch (mode) {
		case "order":
			return "invoice" as const;
		case "order-packing":
			return "order-packing" as const;
		case "packing list":
			return "packing-slip" as const;
		case "production":
			return "production" as const;
		case "quote":
			return "quote" as const;
		default:
			return "invoice" as const;
	}
}

function isCurrentPreviewRequest(requestId: string) {
	if (typeof window === "undefined") return true;

	return (
		new URLSearchParams(window.location.search).get("salesPreviewRequest") ===
		requestId
	);
}
