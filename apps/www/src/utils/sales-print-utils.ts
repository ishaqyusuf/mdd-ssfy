import { openLink } from "@/lib/open-link";
import { IOrderPrintMode } from "@/types/sales";

interface Props extends SalesPrintProps {}
export type SalesPrintProps = {
    slugs?: string;
    mode: IOrderPrintMode;
    mockup?: "yes" | "no";
    preview?: boolean;
    pdf?: boolean;
    deletedAt?;
    dispatchId?;
};
export function printSalesData(props: Props) {
    openLink(`/printer/sales`, props, true);
}
