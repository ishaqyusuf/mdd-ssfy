import { resolveSalesDocumentAccessAction } from "@/actions/resolve-sales-document-access";
import type { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import type { IOrderPrintMode } from "@/types/sales";
import {
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
	useQueryStates,
} from "nuqs";

export function useSalesPreview() {
	const [params, setParams] = useQueryStates({
		salesPreviewId: parseAsInteger,
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
	const opened = !!params.salesPreviewUrl;
	return {
		params,
		opened,
		setParams,
		close() {
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

			const previewMode =
				options?.mode ?? (salesPreviewType as IOrderPrintMode);
			const access = await resolveSalesDocumentAccessAction({
				salesIds: [salesId],
				mode: toPrintMode(previewMode),
				dispatchId: options?.dispatchId ?? null,
			});

			setParams({
				salesPreviewId: salesId,
				salesPreviewType,
				salesPreviewUrl: access.previewUrl,
				previewMode,
				dispatchId: options?.dispatchId ?? null,
			});
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
