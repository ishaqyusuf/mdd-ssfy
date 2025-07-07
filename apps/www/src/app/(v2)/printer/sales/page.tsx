import { cn } from "@/lib/utils";
import { IOrderPrintMode } from "@/types/sales";
import { SalesPrintProps as BaseSalesPrintProps } from "@/utils/sales-print-utils";

import BasePrinter from "../base-printer";
import { getSalesPrintData } from "./get-sales-print-data";
import { OrderBasePrinter } from "./order-base-printer";
import SalesPrintBlock from "./sales-print-block";

export interface SalesPrintProps {
    searchParams: BaseSalesPrintProps;
}
export default async function PrintOrderPage({
    searchParams,
}: SalesPrintProps) {
    const slugs = searchParams.slugs?.split(",");
    let mode = searchParams.mode;
    if (mode == "order-packing") searchParams.mode = "order";
    const actions = slugs?.map((slug) => ({
        slug,
        action: getSalesPrintData(slug, searchParams),
    }));
    if (mode == "order-packing")
        slugs.map((slug) =>
            actions.push({
                slug,
                action: getSalesPrintData(slug, {
                    ...searchParams,
                    mode: "packing list",
                    dispatchId: searchParams.dispatchId,
                }),
            }),
        );
    const value = {
        // ...searchParams,
        preview: (searchParams.preview as any) == "true",
        pdf: (searchParams.pdf as any) == "true",
        slugs: slugs,
    };
    // console.log({ value, searchParams });

    return (
        <BasePrinter {...value}>
            <OrderBasePrinter {...searchParams}>
                {actions?.map((props, index) => (
                    <SalesPrintBlock
                        className={cn(index > 0 && "break-before-page")}
                        key={index}
                        {...props}
                    />
                ))}
            </OrderBasePrinter>
        </BasePrinter>
    );
}
