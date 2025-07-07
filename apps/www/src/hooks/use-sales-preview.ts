import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { IOrderPrintMode } from "@/types/sales";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

export function useSalesPreview() {
    const [params, setParams] = useQueryStates({
        salesPreviewSlug: parseAsString,
        salesPreviewType: parseAsStringEnum(["order", "quote"] as SalesType[]),
        previewMode: parseAsStringEnum([
            "order",
            "order-packing",
            "packing list",
            "production",
            "quote",
        ] as IOrderPrintMode[]),
    });
    const opened = !!params.salesPreviewSlug && !!params.salesPreviewType;
    return {
        params,
        opened,
        setParams,
    };
}

