"use client";

import React, { useEffect } from "react";
import { getSalesPrintData } from "./get-sales-print-data";
import { usePrintContext } from "../base-printer";
import { cn } from "@/lib/utils";
import SalesPrintHeader from "./components/sales-print-header";
import { BasePrintProps, useSalesPrintCtx } from "./order-base-printer";
import SalesPrintLineItems from "./components/sales-print-line-items";
import SalesPrintShelfItems from "./components/sales-print-shelf-items";
import SalesPrintDoorItems from "./components/sales-print-door-items";
import SalesPrintFooter from "./components/sales-print-footer";

export type SalesPrintData = NonNullable<
    Awaited<ReturnType<typeof getSalesPrintData>>
>;
interface Props {
    action: Promise<SalesPrintData>;
    slug;
    className?: string;
}

interface SalesBlockCtxProps extends BasePrintProps {
    sale: SalesPrintData;
}
export const SalesBlockCtx = React.createContext<SalesBlockCtxProps>(
    null as any
);
export const useSalesBlockCtx = () =>
    React.useContext<SalesBlockCtxProps>(SalesBlockCtx);

export default function SalesPrintBlock({ action, slug, className }: Props) {
    const data = React.use(action);
    const ctx = usePrintContext();
    const basePrint = useSalesPrintCtx();
    // console.log(data?.orderedPrinting);

    useEffect(() => {
        if (data) ctx.pageReady(slug, data);
    }, [data]);
    return (
        <SalesBlockCtx.Provider
            value={{
                sale: data,
                ...basePrint,
            }}
        >
            <div className="" id={`salesPrinter`}>
                <section id={`s${slug}`} className={cn(className)}>
                    <table className="main mr-10s w-full text-xs table-fixed">
                        <SalesPrintHeader />
                        {data?.order?.id && (
                            <tbody>
                                {data?.orderedPrinting?.map((p, i) =>
                                    p.nonShelf ? (
                                        <SalesPrintDoorItems
                                            index={i}
                                            key={"door" + i}
                                        />
                                    ) : (
                                        <SalesPrintShelfItems
                                            index={i}
                                            key={"shelf" + i}
                                        />
                                    )
                                )}
                                <SalesPrintLineItems />
                                <SalesPrintFooter />
                            </tbody>
                        )}
                    </table>
                    {data.isPacking && (
                        <div className="flex px-4 justify-between">
                            {[
                                "Employee Sig. & Date",
                                "Customer Sig. & Date",
                            ].map((s) => (
                                <div
                                    key={s}
                                    className="w-1/4 italic text-sm font-semibold"
                                >
                                    <div className="border-b h-10 border-dashed border-muted-foreground"></div>
                                    <div className="m-1">{s}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </SalesBlockCtx.Provider>
    );
}
