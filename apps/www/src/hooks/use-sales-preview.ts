import { generateToken } from "@/actions/token-action";
import type { SalesType } from "@/app-deps/(clean-code)/(sales)/types";
import type { IOrderPrintMode } from "@/types/sales";
import type { SalesPdfToken } from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import {
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
	useQueryStates,
} from "nuqs";

const PREVIEW_MODE_TO_TOKEN_MODE: Record<IOrderPrintMode, string> = {
	order: "order",
	"order-packing": "order-packing",
	"packing list": "packing list",
	production: "production",
	quote: "quote",
};

export function useSalesPreview() {
	const [params, setParams] = useQueryStates({
		salesPreviewId: parseAsInteger,
		salesPreviewToken: parseAsString,
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
	const opened = !!params.salesPreviewToken;
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
			const token = await generateToken({
				salesIds: [salesId],
				expiry: addDays(new Date(), 7).toISOString(),
				mode: PREVIEW_MODE_TO_TOKEN_MODE[previewMode] ?? previewMode,
				dispatchId: options?.dispatchId ?? null,
			} satisfies SalesPdfToken);

			setParams({
				salesPreviewId: salesId,
				salesPreviewToken: token,
				salesPreviewType,
				previewMode,
				dispatchId: options?.dispatchId ?? null,
			});
		},
	};
}
