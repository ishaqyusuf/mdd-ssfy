import { SalesPrintProps } from "@/utils/sales-print-utils";
import { generateCustomerPrintReport } from "./customer-report/_action";

type GeneratCustomerPrintReport = Awaited<
    ReturnType<typeof generateCustomerPrintReport>
>;
export type SalesPrinterProps = SalesPrintProps["searchParams"];
