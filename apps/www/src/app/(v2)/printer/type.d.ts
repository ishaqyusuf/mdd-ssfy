import { generateCustomerPrintReport } from "./customer-report/_action";
import { SalesPrintProps } from "./sales/page";

export type GeneratCustomerPrintReport = Awaited<
    ReturnType<typeof generateCustomerPrintReport>
>;
type SalesPrinterProps = SalesPrintProps["searchParams"];
