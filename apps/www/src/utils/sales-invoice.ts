import { generateToken } from "@/actions/token-action";
import { openLink } from "@/lib/open-link";
import { SalesPdfToken } from "@gnd/utils/tokenizer";
import { SalesPrintModes } from "@sales/constants";
import { addDays } from "date-fns";

interface PrintQuoteProps {
    salesIds: number[];
    preview?: boolean;
}
export async function printQuote(props: PrintQuoteProps) {
    const tok = await generateToken({
        salesIds: props.salesIds,
        expiry: addDays(new Date(), 7).toISOString(),
        mode: "quote" as SalesPrintModes,

        // mode: props.type
    } satisfies SalesPdfToken);
    openLink(
        `api/download/sales`,
        {
            token: tok,
            preview: props.preview,
        },
        true
    );
}

