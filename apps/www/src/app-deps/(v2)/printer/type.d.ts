import { generateCustomerPrintReport } from "./customer-report/_action";
import { SalesPrintProps } from "./sales/page";

export type GeneratCustomerPrintReport = Awaited<
    ReturnType<typeof generateCustomerPrintReport>
>;
export type SalesPrinterProps = SalesPrintProps["searchParams"];
