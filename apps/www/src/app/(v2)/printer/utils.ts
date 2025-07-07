import { openLink } from "@/lib/open-link";
import { SalesPrintProps } from "./sales/page";

export function openSalesPrint(props: SalesPrintProps["searchParams"]) {
    return openLink("/printer/sales", props, true);
}
