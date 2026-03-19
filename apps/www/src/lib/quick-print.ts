import { generateToken } from "@/actions/token-action";
import { openLink } from "./open-link";
import type { SalesPdfToken } from "@gnd/utils/tokenizer";
import type { PrintMode } from "@gnd/sales/print/types";
import { addDays } from "date-fns";

const V2_TO_LEGACY_MODE: Record<PrintMode, string> = {
    invoice: "order",
    quote: "quote",
    production: "production",
    "packing-slip": "packing list",
    "order-packing": "order-packing",
};

export interface QuickPrintOptions {
    salesIds: number[];
    mode: PrintMode;
    dispatchId?: number | null;
    /** Open the v2 PDF viewer (default: true) */
    v2?: boolean;
}

/**
 * Generates a signed token and opens the sales print page in a new tab.
 * Pass v2=false to open the legacy invoice page instead.
 */
export async function quickPrint({
    salesIds,
    mode,
    dispatchId,
    v2 = true,
}: QuickPrintOptions): Promise<void> {
    const token = await generateToken({
        salesIds,
        expiry: addDays(new Date(), 7).toISOString(),
        mode: V2_TO_LEGACY_MODE[mode] ?? mode,
        dispatchId: dispatchId ?? null,
    } satisfies SalesPdfToken);

    const path = v2 ? "p/sales-invoice-v2" : "p/sales-invoice";
    openLink(path, { token, preview: true }, true);
}
