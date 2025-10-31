import { composeSalesItems, ViewSaleType } from "../../(loggedIn)/sales-v2/_utils/compose-sales-items";
import { SalesPrintProps } from "./page";
type PrintData = {
    order: ViewSaleType;
    isEstimate?: boolean;
    isProd?: boolean;
    isPacking?: boolean;
    isOrder?: boolean;
    query?: SalesPrintProps["searchParams"];
} & ReturnType<typeof composeSalesItems>;
export declare function composePrint(data: PrintData, query: SalesPrintProps["searchParams"]): any;
export {};
